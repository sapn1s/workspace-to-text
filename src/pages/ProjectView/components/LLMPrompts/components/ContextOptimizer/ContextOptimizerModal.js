import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, TrashIcon, ExclamationTriangleIcon, CheckCircleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

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
  const [editingData, setEditingData] = useState(contextData);
  const [saveStatus, setSaveStatus] = useState({
    copyPrompt: null,
    copyExclusions: null,
    applyingExclusions: null,
    autoSave: null
  });
  
  // Auto-save timeout ref
  const autoSaveTimeout = useRef(null);

  useEffect(() => {
    setEditingData(contextData);
  }, [contextData]);

  // Auto-save function with debouncing
  const autoSave = (data) => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
    
    autoSaveTimeout.current = setTimeout(async () => {
      try {
        await onSave(data);
        setSaveStatus(prev => ({ ...prev, autoSave: 'saved' }));
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, autoSave: null }));
        }, 1500);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus(prev => ({ ...prev, autoSave: 'error' }));
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, autoSave: null }));
        }, 3000);
      }
    }, 1000); // 1 second debounce
  };

  // Handle input changes with auto-save
  const handleInputChange = (field, value) => {
    const newData = { ...editingData, [field]: value };
    setEditingData(newData);
    
    // Trigger auto-save for any changes
    autoSave(newData);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, []);

  const handleApplyExclusions = async () => {
    setSaveStatus(prev => ({ ...prev, applyingExclusions: 'applying' }));
    
    try {
      await onApplyExclusions();
      setSaveStatus(prev => ({ ...prev, applyingExclusions: 'applied' }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, applyingExclusions: null }));
      }, 2000);
    } catch (error) {
      setSaveStatus(prev => ({ ...prev, applyingExclusions: null }));
      alert('Failed to apply exclusions: ' + error.message);
    }
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

  // Parse LLM response to show exclusions and missing files
  const parsedResponse = React.useMemo(() => {
    if (!editingData.llmResponse?.trim()) return null;
    
    try {
      return JSON.parse(editingData.llmResponse);
    } catch {
      return null;
    }
  }, [editingData.llmResponse]);

  const hasValidResponse = parsedResponse && Array.isArray(parsedResponse.exclusions);
  const hasMissingFiles = parsedResponse && Array.isArray(parsedResponse.missingFiles) && parsedResponse.missingFiles.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-100 flex items-center">
              Context Optimizer Setup
              {hasMissingFiles && (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 ml-2" title="Missing important files detected" />
              )}
            </h3>
            
            {/* Auto-save status indicator */}
            {saveStatus.autoSave && (
              <div className={`ml-3 text-xs px-2 py-1 rounded ${
                saveStatus.autoSave === 'saved' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-red-600 text-white'
              }`}>
                {saveStatus.autoSave === 'saved' ? 'Auto-saved' : 'Save failed'}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-6">
          {/* Top Row - Input */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  What are you building? (Feature Description)
                </label>
                <button
                  onClick={handleCopyPrompt}
                  className={`flex items-center px-3 py-1 rounded-md text-xs relative ${canCopyPrompt 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                  }`}
                  title={canCopyPrompt ? 'Copy complete prompt with analysis' : 'Need feature description and analysis results'}
                  disabled={!canCopyPrompt}
                >
                  <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                  Copy Prompt
                  {saveStatus.copyPrompt === 'copied' && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      Copied!
                    </div>
                  )}
                </button>
              </div>
              <textarea
                value={editingData.userInput}
                onChange={(e) => handleInputChange('userInput', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-200 h-32 resize-none"
                placeholder="Describe the specific feature you're working on..."
              />
              <div className="text-xs text-gray-400 mt-1">
                Fill this out first, then copy the prompt to your LLM
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">LLM Response (JSON)</label>
              <textarea
                value={editingData.llmResponse}
                onChange={(e) => handleInputChange('llmResponse', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-200 h-32 resize-none font-mono text-sm"
                placeholder='Paste the JSON response from your LLM here...'
              />
              
              {/* Auto-save hint */}
              <div className="text-xs text-gray-400 mt-1">
                Changes are automatically saved as you type
              </div>
            </div>
          </div>

          {/* Bottom Row - Results Preview */}
          {hasValidResponse && (
            <div className="space-y-4">
              {/* Exclusions Preview - Compact */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-400 mr-1" />
                  Exclusions ({parsedResponse.exclusions.length})
                </h4>
                <div className="bg-gray-900 rounded-md p-3 max-h-32 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {parsedResponse.exclusions.map((exclusion, index) => (
                      <div key={index} className="text-xs">
                        <div className="text-blue-400 font-mono">{exclusion.pattern}</div>
                        <div className="text-gray-400 truncate">{exclusion.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Missing Files Preview - Expanded */}
              {hasMissingFiles && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 mr-1" />
                    Missing Important Files ({parsedResponse.missingFiles.length})
                  </h4>
                  <div className="bg-gray-900 rounded-md p-3 max-h-80 overflow-y-auto">
                    <div className="space-y-3">
                      {parsedResponse.missingFiles.map((missing, index) => (
                        <div key={index} className="bg-yellow-900/10 border border-yellow-600/30 rounded-md p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-yellow-400 font-mono font-medium text-sm break-all">{missing.file}</div>
                            <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ml-2 ${
                              missing.confidence === 'high' 
                                ? 'bg-red-600 text-white' 
                                : missing.confidence === 'medium'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-600 text-white'
                            }`}>
                              {missing.confidence}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                            {/* Usage Evidence */}
                            <div>
                              <div className="text-gray-300 font-medium mb-1">Usage Evidence:</div>
                              <div className="text-gray-400 font-mono bg-gray-800 p-2 rounded text-xs leading-relaxed">
                                {missing.usageEvidence}
                              </div>
                            </div>

                            {/* Feature Relevance */}
                            <div>
                              <div className="text-gray-300 font-medium mb-1">Feature Relevance:</div>
                              <div className="text-gray-400 leading-relaxed">
                                {missing.featureRelevance}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {editingData.llmResponse && !hasValidResponse && (
            <div className="bg-red-900/20 border border-red-600 rounded-md p-3">
              <div className="text-red-400 text-sm font-medium">Invalid JSON Response</div>
              <div className="text-red-300 text-xs mt-1">
                Please ensure the response is valid JSON with "exclusions" and "missingFiles" arrays.
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center p-4 border-t border-gray-700">
          <button
            onClick={handleCopyExclusions}
            className={`px-4 py-2 rounded-md text-sm relative ${canCopyExclusions
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-600 cursor-not-allowed text-gray-400'
            }`}
            title={canCopyExclusions ? 'Copy exclusion patterns for permanent use' : 'No exclusions applied yet'}
            disabled={!canCopyExclusions}
          >
            Copy Exclusions for Permanent Use
            {saveStatus.copyExclusions === 'copied' && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Copied!
              </div>
            )}
          </button>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white text-sm"
            >
              Close
            </button>
            <button
              onClick={handleApplyExclusions}
              className={`px-4 py-2 rounded-md text-white text-sm relative ${
                hasValidResponse
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
              disabled={!hasValidResponse || saveStatus.applyingExclusions === 'applying'}
            >
              {saveStatus.applyingExclusions === 'applying' ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Applying...
                </div>
              ) : (
                'Apply Context Exclusions'
              )}
              {saveStatus.applyingExclusions === 'applied' && (
                <div className="absolute -top-8 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Applied!
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextOptimizerModal;