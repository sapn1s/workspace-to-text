import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  PlayIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import ContextOptimizerModal from './ContextOptimizerModal';

const ContextOptimizer = ({ projectId, onApplyContextExclusions, currentAnalysisResult }) => {
  const [contextData, setContextData] = useState({
    userInput: '',
    llmResponse: '',
    appliedExclusions: []
  });
  const [showModal, setShowModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState({
    copyPrompt: null,
    copyExclusions: null,
    applyingExclusions: null // Changed from false to null
  });

  const contextPrompt = {
    title: 'Context Optimizer',
    prompt: `Given the following list of files and their content, return a JSON list of files which are not relevant for the feature that the user is working on (provided after).

The exclude patterns function same as in .gitignore, so use same syntax.
Try to be concise - sometimes we might exclude a whole feature directory, so we would not need to exclude each individual file.
Don't exclude common config files like package.json, tailwind.config.js as they provide meaningful context for feature development (e.g. what dependencies are installed, whether styles configuration is different etc).
Only exclude files really not relevant to the specific feature being developed.
It is better to keep file rather than exclude when in doubt.

Return response in this JSON format:
{
  "exclusions": [
    {
      "pattern": "src/components/UserProfile/**",
      "reason": "User profile functionality not relevant to authentication feature"
    },
    {
      "pattern": "docs/**",
      "reason": "Documentation files not needed for development context"
    }
  ]
}`
  };

  useEffect(() => {
    loadContextData();
  }, [projectId]);

  const loadContextData = async () => {
    if (!projectId) return;
    try {
      const stored = await window.electron.getAppSetting(`context_optimizer_${projectId}`);
      if (stored) {
        const data = JSON.parse(stored);
        setContextData(data);
      }
    } catch (error) {
      console.error('Error loading context data:', error);
    }
  };

  const saveContextData = async (data) => {
    if (!projectId) return;
    try {
      await window.electron.setAppSetting(`context_optimizer_${projectId}`, JSON.stringify(data));
      setContextData(data);
    } catch (error) {
      console.error('Error saving context data:', error);
    }
  };

  const handleCopyContextPrompt = () => {
    if (!contextData.userInput.trim() || !currentAnalysisResult) {
      alert('Please provide feature description and ensure you have analysis results first');
      return;
    }

    const fullPrompt = `${contextPrompt.prompt}

PROJECT ANALYSIS:
${currentAnalysisResult}

FEATURE BEING DEVELOPED:
${contextData.userInput}

Please analyze the above project files and return the JSON exclusion list for files not relevant to this specific feature.`;

    window.electron.copyToClipboard(fullPrompt);
    
    setSaveStatus(prev => ({ ...prev, copyPrompt: 'copied' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, copyPrompt: null }));
    }, 2000);
  };

  const handleCopyExclusions = () => {
    if (!contextData.appliedExclusions || contextData.appliedExclusions.length === 0) {
      alert('No applied exclusions to copy');
      return;
    }

    // Extract just the patterns and join with commas for direct pasting into PatternInputs
    const patterns = contextData.appliedExclusions.map(ex => ex.pattern).join(',');
    window.electron.copyToClipboard(patterns);
    
    setSaveStatus(prev => ({ ...prev, copyExclusions: 'copied' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, copyExclusions: null }));
    }, 2000);
  };

  const handleOptimizerClick = () => {
    if (isReady) {
      handleApplyExclusionsDirectly();
    } else {
      setShowModal(true);
    }
  };

  const handleApplyExclusionsDirectly = async () => {
    if (!contextData.llmResponse.trim()) {
      alert('Please provide LLM response first');
      return;
    }

    setSaveStatus(prev => ({ ...prev, applyingExclusions: 'applying' })); // Changed to 'applying'

    try {
      const response = JSON.parse(contextData.llmResponse);
      if (!response.exclusions || !Array.isArray(response.exclusions)) {
        alert('Invalid JSON format. Expected { "exclusions": [...] }');
        setSaveStatus(prev => ({ ...prev, applyingExclusions: null })); // Reset on error
        return;
      }

      const patterns = response.exclusions.map(ex => ex.pattern);
      const newContextData = {
        ...contextData,
        appliedExclusions: response.exclusions
      };
      
      await saveContextData(newContextData);
      
      if (onApplyContextExclusions) {
        await onApplyContextExclusions(patterns, newContextData.userInput);
      }

      setSaveStatus(prev => ({ ...prev, applyingExclusions: 'applied' })); // Changed to 'applied'
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, applyingExclusions: null }));
      }, 2000);

    } catch (error) {
      setSaveStatus(prev => ({ ...prev, applyingExclusions: null })); // Reset on error
      alert('Invalid JSON format in LLM response');
    }
  };

  const isReady = contextData.userInput.trim() && contextData.llmResponse.trim();
  const canCopyPrompt = contextData.userInput.trim() && currentAnalysisResult;
  const canCopyExclusions = contextData.appliedExclusions && contextData.appliedExclusions.length > 0;

  return (
    <div>
      <div className="bg-gray-700 rounded-md p-3 cursor-pointer hover:bg-gray-600 transition-colors"
           onClick={() => setShowModal(true)}>
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm text-gray-200 font-medium">{contextPrompt.title}</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyContextPrompt();
              }}
              className={`p-1.5 rounded-md text-xs relative ${
                canCopyPrompt 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              }`}
              title={canCopyPrompt ? 'Copy complete prompt with analysis' : 'Need feature description and analysis results'}
              disabled={!canCopyPrompt}
            >
              <DocumentTextIcon className="h-4 w-4" />
              {saveStatus.copyPrompt === 'copied' && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Copied!
                </div>
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyExclusions();
              }}
              className={`p-1.5 rounded-md text-xs relative ${
                canCopyExclusions 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              }`}
              title={canCopyExclusions ? 'Copy exclusion patterns for permanent use' : 'No exclusions applied yet'}
              disabled={!canCopyExclusions}
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
              {saveStatus.copyExclusions === 'copied' && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Copied!
                </div>
              )}
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOptimizerClick();
              }}
              className={`p-1.5 rounded-md text-xs relative ${
                isReady 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              }`}
              title={isReady ? 'Apply context exclusions' : 'Setup required'}
              disabled={saveStatus.applyingExclusions === 'applying'}
            >
              {saveStatus.applyingExclusions === 'applying' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
              {saveStatus.applyingExclusions === 'applied' && (
                <div className="absolute -top-8 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Applied!
                </div>
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 line-clamp-2">
          Analyzes your project and excludes irrelevant files for focused development
        </p>
      </div>

      {showModal && (
        <ContextOptimizerModal
          contextData={contextData}
          onClose={() => setShowModal(false)}
          onSave={saveContextData}
          onApplyExclusions={handleApplyExclusionsDirectly}
          onCopyPrompt={handleCopyContextPrompt}
          onCopyExclusions={handleCopyExclusions}
          canCopyPrompt={canCopyPrompt}
          canCopyExclusions={canCopyExclusions}
        />
      )}
    </div>
  );
};

export default ContextOptimizer;