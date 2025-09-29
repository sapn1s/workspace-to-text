// src/pages/ProjectView/components/LLMPrompts/components/SharedPromptModal.js
import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

/**
 * Shared modal component for prompt-based tools
 * Handles common functionality: auto-save, prompt copying, status indicators
 */
const SharedPromptModal = ({ 
  title,
  data, 
  onClose, 
  onSave,
  onCopyPrompt,
  canCopyPrompt,
  inputLabel,
  inputPlaceholder,
  outputLabel,
  outputPlaceholder,
  renderPreview, // Function to render tool-specific preview
  renderActions, // Function to render tool-specific action buttons
  children // Alternative to renderPreview for more complex layouts
}) => {
  const [editingData, setEditingData] = useState(data);
  const [saveStatus, setSaveStatus] = useState({
    copyPrompt: null,
    autoSave: null
  });
  
  const autoSaveTimeout = useRef(null);

  useEffect(() => {
    setEditingData(data);
  }, [data]);

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
    }, 1000);
  };

  const handleInputChange = (field, value) => {
    const newData = { ...editingData, [field]: value };
    setEditingData(newData);
    autoSave(newData);
  };

  const handleCopyPrompt = () => {
    onCopyPrompt();
    setSaveStatus(prev => ({ ...prev, copyPrompt: 'copied' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, copyPrompt: null }));
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-100">{title}</h3>
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
          {/* Input Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  {inputLabel}
                </label>
                <button
                  onClick={handleCopyPrompt}
                  className={`flex items-center px-3 py-1 rounded-md text-xs relative ${canCopyPrompt 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                  }`}
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
                placeholder={inputPlaceholder}
              />
              <div className="text-xs text-gray-400 mt-1">
                Fill this out first, then copy the prompt to your LLM
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{outputLabel}</label>
              <textarea
                value={editingData.llmResponse}
                onChange={(e) => handleInputChange('llmResponse', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-200 h-32 resize-none font-mono text-sm"
                placeholder={outputPlaceholder}
              />
              <div className="text-xs text-gray-400 mt-1">
                Changes are automatically saved as you type
              </div>
            </div>
          </div>

          {/* Preview/Content Section - Tool-specific */}
          {children ? children({ editingData, handleInputChange }) : null}
          {renderPreview && renderPreview(editingData, handleInputChange)}
        </div>
        
        {/* Actions - Tool-specific */}
        {renderActions && (
          <div className="flex justify-between items-center p-4 border-t border-gray-700">
            {renderActions(editingData, saveStatus, setSaveStatus, onClose)}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedPromptModal;