import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  PlayIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import ContextOptimizerModal from './ContextOptimizerModal';

const ContextOptimizer = ({ projectId, onApplyContextExclusions, currentAnalysisResult }) => {
  const [contextData, setContextData] = useState({
    userInput: '',
    llmResponse: '',
    appliedExclusions: [],
    missingFiles: [] // New field for missing important files
  });
  const [showModal, setShowModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState({
    copyPrompt: null,
    copyExclusions: null,
    applyingExclusions: null
  });

  // Updated prompt for ContextOptimizer.js
  const contextPrompt = {
    title: 'Context Optimizer',
    prompt: `CONTEXT OPTIMIZATION - NOT CODE EXCLUSION

You are helping optimize code context for an LLM conversation. The user wants to send only the most relevant files to an LLM for working on a specific feature. This is NOT about excluding files from the codebase - ALL FILES REMAIN IN THE CODEBASE AND THE APPLICATION WILL CONTINUE TO WORK NORMALLY.

GOAL: Remove files from LLM context that are not directly relevant to implementing the specific feature described by the user.

IMPORTANT CLARIFICATIONS:
- Files are only excluded from the text context sent to the LLM
- The actual codebase and running application are completely unchanged
- UI components will NOT break - they continue working normally in the application
- Dependencies and imports continue to work in the actual running code
- This is purely about reducing cognitive load and token usage for the LLM

Given the following list of files and their content, return a JSON list of files which are not directly relevant for implementing the specific feature that the user is working on.

The exclude patterns function same as in .gitignore, so use same syntax.
Try to be concise - sometimes we might exclude a whole feature directory, so we would not need to exclude each individual file.
Don't exclude common config files like package.json, tailwind.config.js as they provide meaningful context for feature development (e.g. what dependencies are installed, whether styles configuration is different etc).
Only exclude files really not relevant to the specific feature being implemented.
It is better to keep file rather than exclude when in doubt.

CRITICAL - MISSING FILES ANALYSIS:
Before flagging ANY missing file, you must understand: you are looking at a SUBSET of the codebase for context optimization. Missing files does NOT mean the application is broken - it means they're not included in this specific context view.

Only flag a file as missing if BOTH conditions are met:

TEST 1 - DIRECT CODE DEPENDENCY:
Can you point to specific imports, function calls, or references in the provided code that directly import or call something from this missing file?

TEST 2 - FEATURE IMPLEMENTATION NECESSITY:
Is this missing file absolutely required to implement the specific feature being developed? (Not just for the app to work overall, but for THIS SPECIFIC FEATURE)

COMMON FALSE POSITIVES TO AVOID:
- Application shell components (routing, navigation, layout) unless the feature modifies them
- Tab/window management unless the feature specifically manages tabs
- Project management pages unless the feature modifies project workflows  
- File system utilities unless the feature processes files differently
- General UI components unless the feature extends/modifies them
- State management for unrelated features
- Backend/database code unless the feature modifies backend logic

EXAMPLES OF VALID MISSING FILES:
✅ A login form imports useAuth() from AuthContext.js that's not in the context
✅ A component calls validateEmail() from utils/validation.js that's not provided
✅ A component extends BaseComponent class from a missing file

EXAMPLES OF INVALID MISSING FILES:
❌ "TabBar.js is missing" when working on a prompt component (TabBar continues to work in the app)
❌ "Routing files missing" when adding a form (routing continues to work normally)  
❌ "Project management hooks missing" when building a UI component (they continue to work)

Remember: The application continues running normally with all its features. You're only optimizing what context the LLM sees for implementing ONE specific feature.

Return response in this JSON format:
{
  "exclusions": [
    {
      "pattern": "src/components/UserProfile/**",
      "reason": "User profile functionality not directly needed for implementing authentication feature"
    },
    {
      "pattern": "docs/**", 
      "reason": "Documentation files not needed for feature implementation context"
    }
  ],
  "missingFiles": [
    {
      "file": "src/auth/AuthContext.js",
      "usageEvidence": "LoginForm.js line 15: 'import { useAuth } from '../auth/AuthContext' - component directly imports and uses useAuth()",
      "featureRelevance": "This authentication context is directly imported and used by the login feature being implemented",
      "confidence": "high"
    }
  ]
}

BE EXTREMELY CONSERVATIVE with missing files. The goal is reducing context noise, not finding architectural problems. Focus only on files that are DIRECTLY imported and used by the specific feature code.`
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
        // Ensure missingFiles exists for backward compatibility
        setContextData({
          ...data,
          missingFiles: data.missingFiles || []
        });
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

Please analyze the above project files and return the JSON with both exclusions and any important missing files for this specific feature.`;

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

    setSaveStatus(prev => ({ ...prev, applyingExclusions: 'applying' }));

    try {
      const response = JSON.parse(contextData.llmResponse);
      if (!response.exclusions || !Array.isArray(response.exclusions)) {
        alert('Invalid JSON format. Expected { "exclusions": [...], "missingFiles": [...] }');
        setSaveStatus(prev => ({ ...prev, applyingExclusions: null }));
        return;
      }

      const patterns = response.exclusions.map(ex => ex.pattern);
      const newContextData = {
        ...contextData,
        appliedExclusions: response.exclusions,
        missingFiles: response.missingFiles || []
      };

      await saveContextData(newContextData);

      if (onApplyContextExclusions) {
        await onApplyContextExclusions(patterns, newContextData.userInput);
      }

      setSaveStatus(prev => ({ ...prev, applyingExclusions: 'applied' }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, applyingExclusions: null }));
      }, 2000);

    } catch (error) {
      setSaveStatus(prev => ({ ...prev, applyingExclusions: null }));
      alert('Invalid JSON format in LLM response');
    }
  };

  const isReady = contextData.userInput.trim() && contextData.llmResponse.trim();
  const canCopyPrompt = contextData.userInput.trim() && currentAnalysisResult;
  const canCopyExclusions = contextData.appliedExclusions && contextData.appliedExclusions.length > 0;
  const hasMissingFiles = contextData.missingFiles && contextData.missingFiles.length > 0;

  return (
    <div>
      <div className="bg-gray-700 rounded-md p-3 cursor-pointer hover:bg-gray-600 transition-colors"
        onClick={() => setShowModal(true)}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center">
            <span className="text-sm text-gray-200 font-medium">{contextPrompt.title}</span>
            {hasMissingFiles && (
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 ml-2" title="Missing important files detected" />
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyContextPrompt();
              }}
              className={`p-1.5 rounded-md text-xs relative ${canCopyPrompt
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
              className={`p-1.5 rounded-md text-xs relative ${canCopyExclusions
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
              className={`p-1.5 rounded-md text-xs relative ${isReady
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
          {hasMissingFiles && <span className="text-yellow-400 ml-1">(Missing files detected)</span>}
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