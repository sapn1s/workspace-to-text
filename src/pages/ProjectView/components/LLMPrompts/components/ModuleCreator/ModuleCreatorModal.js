// src/pages/ProjectView/components/LLMPrompts/components/ModuleCreator/ModuleCreatorModal.js
import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, CubeIcon, CheckCircleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

const ModuleCreatorModal = ({ 
  moduleData, 
  onClose, 
  onSave,
  onCopyPrompt,
  onCreateSingleModule,
  canCopyPrompt
}) => {
  const [editingData, setEditingData] = useState(moduleData);
  const [saveStatus, setSaveStatus] = useState({
    copyPrompt: null,
    autoSave: null,
    copyPatterns: {}
  });
  
  const autoSaveTimeout = useRef(null);

  useEffect(() => {
    setEditingData(moduleData);
  }, [moduleData]);

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

  useEffect(() => {
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, []);

  const handleCopyPrompt = () => {
    onCopyPrompt();
    setSaveStatus(prev => ({ ...prev, copyPrompt: 'copied' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, copyPrompt: null }));
    }, 2000);
  };

  const handleCopyPatterns = (moduleIndex, patterns) => {
    window.electron.copyToClipboard(patterns.join(','));
    setSaveStatus(prev => ({ 
      ...prev, 
      copyPatterns: { ...prev.copyPatterns, [moduleIndex]: 'copied' }
    }));
    setTimeout(() => {
      setSaveStatus(prev => ({ 
        ...prev, 
        copyPatterns: { ...prev.copyPatterns, [moduleIndex]: null }
      }));
    }, 1500);
  };

  const handleCreateModule = (module) => {
    if (onCreateSingleModule) {
      onCreateSingleModule(module);
    }
  };

  const parsedResponse = React.useMemo(() => {
    if (!editingData.llmResponse?.trim()) return null;
    
    try {
      return JSON.parse(editingData.llmResponse);
    } catch {
      return null;
    }
  }, [editingData.llmResponse]);

  const hasValidResponse = parsedResponse && Array.isArray(parsedResponse.modules);
  const moduleCount = hasValidResponse ? parsedResponse.modules.length : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-100 flex items-center">
              <CubeIcon className="h-5 w-5 text-blue-400 mr-2" />
              Module Creator
            </h3>
            
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
          {/* Input Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Project Context (Optional)
                </label>
                <button
                  onClick={handleCopyPrompt}
                  className={`flex items-center px-3 py-1 rounded-md text-xs relative ${canCopyPrompt 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                  }`}
                  title={canCopyPrompt ? 'Copy prompt with analysis' : 'Need analysis results'}
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
                placeholder="Add any additional context about your project..."
              />
              <div className="text-xs text-gray-400 mt-1">
                Optional: Add context, then copy the prompt to your LLM
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
              <div className="text-xs text-gray-400 mt-1">
                Changes are automatically saved as you type
              </div>
            </div>
          </div>

          {/* Module Suggestions Preview */}
          {hasValidResponse && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-300 flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-400 mr-1" />
                  Suggested Modules ({moduleCount})
                </h4>
                {parsedResponse.projectInsights && (
                  <div className="text-xs text-gray-400">
                    Coverage: {parsedResponse.projectInsights.coverage || 'N/A'}
                  </div>
                )}
              </div>
              
              <div className="bg-gray-900 rounded-md p-3 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {parsedResponse.modules.map((module, index) => (
                    <div key={index} className="bg-gray-800 border border-gray-700 rounded-md p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-blue-400 font-medium text-sm">{module.name}</div>
                          <div className="text-gray-400 text-xs mt-1">{module.description}</div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                          {module.estimatedFileCount && (
                            <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                              ~{module.estimatedFileCount} files
                            </span>
                          )}
                          {/* Copy Patterns Button */}
                          <button
                            onClick={() => handleCopyPatterns(index, module.patterns)}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-200 relative"
                            title="Copy patterns to clipboard"
                          >
                            {saveStatus.copyPatterns[index] === 'copied' ? 'Copied!' : 'Copy'}
                          </button>
                          {/* Create Module Button */}
                          <button
                            onClick={() => handleCreateModule(module)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white"
                            title="Create this module"
                          >
                            Create
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-gray-300 font-medium text-xs mb-2">Patterns:</div>
                        <div className="bg-gray-900 p-2 rounded text-xs space-y-1">
                          {module.patterns.map((pattern, pIdx) => (
                            <div key={pIdx} className="text-blue-300 font-mono">
                              {pattern}
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 p-2 bg-blue-900/20 rounded">
                          <div className="text-xs text-gray-400">
                            <span className="font-medium text-blue-300">Rationale:</span> {module.rationale}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-600/30 rounded-md p-3">
                <div className="text-xs text-blue-200">
                  <strong>Tip:</strong> Click "Copy" to copy patterns to clipboard, or click "Create" to open the module creation dialog with pre-filled data.
                </div>
              </div>
            </div>
          )}

          {editingData.llmResponse && !hasValidResponse && (
            <div className="bg-red-900/20 border border-red-600 rounded-md p-3">
              <div className="text-red-400 text-sm font-medium">Invalid JSON Response</div>
              <div className="text-red-300 text-xs mt-1">
                Please ensure the response is valid JSON with a "modules" array.
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end items-center p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleCreatorModal;