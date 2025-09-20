import React, { useState, useEffect } from 'react';
import { XMarkIcon, ClipboardIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

const ContextOptimizerModal = ({ 
  contextData, 
  onClose, 
  onSave, 
  onApplyExclusions, 
  onCopyPrompt, 
  onCopyExclusions,
  canCopyPrompt,
  canCopyExclusions 
}) => {
  const [localData, setLocalData] = useState(contextData);
  const [originalData, setOriginalData] = useState(contextData);
  const [saveStatus, setSaveStatus] = useState({
    userInput: null,
    llmResponse: null,
    copyPrompt: null,
    copyExclusions: null
  });

  useEffect(() => {
    setLocalData(contextData);
    setOriginalData(contextData);
  }, [contextData]);

  const hasUserInputChanged = () => {
    return localData.userInput !== originalData.userInput;
  };

  const hasLlmResponseChanged = () => {
    return localData.llmResponse !== originalData.llmResponse;
  };

  const handleSaveUserInput = async () => {
    const newData = { ...localData };
    await onSave(newData);
    setOriginalData(newData);
    
    setSaveStatus(prev => ({ ...prev, userInput: 'saved' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, userInput: null }));
    }, 2000);
  };

  const handleSaveLlmResponse = async () => {
    const newData = { ...localData };
    await onSave(newData);
    setOriginalData(newData);
    
    setSaveStatus(prev => ({ ...prev, llmResponse: 'saved' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, llmResponse: null }));
    }, 2000);
  };

  const handleCopyPrompt = () => {
    onCopyPrompt();
    setSaveStatus(prev => ({ ...prev, copyPrompt: 'copied' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, copyPrompt: null }));
    }, 2000);
  };

  const handleCopyExclusions = () => {
    onCopyExclusions();
    setSaveStatus(prev => ({ ...prev, copyExclusions: 'copied' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, copyExclusions: null }));
    }, 2000);
  };

  const handleApplyExclusions = async () => {
    await onSave(localData);
    onClose();
    onApplyExclusions();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-gray-100">Context Optimizer</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Feature Description Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Feature/Task Description
            </label>
            <textarea
              value={localData.userInput}
              onChange={(e) => setLocalData({...localData, userInput: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-200 h-24 resize-none"
              placeholder="Describe what feature you're working on..."
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSaveUserInput}
                disabled={!hasUserInputChanged()}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  hasUserInputChanged()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saveStatus.userInput === 'saved' ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
          
          {/* LLM Response Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              LLM Response (JSON)
            </label>
            <div className="flex justify-end mb-2">
              <button
                onClick={handleCopyPrompt}
                className={`flex items-center space-x-1 px-3 py-1 text-xs rounded-md ${
                  canCopyPrompt
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                } relative`}
                disabled={!canCopyPrompt}
                title="Copy complete prompt with current analysis"
              >
                <ClipboardIcon className="h-3 w-3" />
                <span>Copy Full Prompt</span>
                {saveStatus.copyPrompt === 'copied' && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Copied!
                  </div>
                )}
              </button>
            </div>
            <textarea
              value={localData.llmResponse}
              onChange={(e) => setLocalData({...localData, llmResponse: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-200 h-32 resize-none font-mono text-sm"
              placeholder='{"exclusions": [{"pattern": "src/unused/**", "reason": "Not relevant to current feature"}]}'
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSaveLlmResponse}
                disabled={!hasLlmResponseChanged()}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  hasLlmResponseChanged()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saveStatus.llmResponse === 'saved' ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>

          {/* Applied Exclusions Display */}
          {localData.appliedExclusions && localData.appliedExclusions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Current Applied Exclusions
                </label>
                <button
                  onClick={handleCopyExclusions}
                  className={`flex items-center space-x-1 px-3 py-1 text-xs rounded-md ${
                    canCopyExclusions
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  } relative`}
                  disabled={!canCopyExclusions}
                  title="Copy exclusion patterns to add permanently to your project"
                >
                  <ClipboardDocumentIcon className="h-3 w-3" />
                  <span>Copy Exclusions</span>
                  {saveStatus.copyExclusions === 'copied' && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      Copied!
                    </div>
                  )}
                </button>
              </div>
              <div className="bg-gray-700 rounded-md p-3 max-h-40 overflow-y-auto">
                {localData.appliedExclusions.map((exclusion, index) => (
                  <div key={index} className="text-sm text-gray-300 mb-2">
                    <div className="font-mono text-blue-400">{exclusion.pattern}</div>
                    <div className="text-gray-400 text-xs">{exclusion.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white text-sm"
            >
              Close
            </button>
            <button
              onClick={handleApplyExclusions}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white text-sm"
              disabled={!localData.llmResponse.trim()}
            >
              Apply Exclusions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextOptimizerModal;