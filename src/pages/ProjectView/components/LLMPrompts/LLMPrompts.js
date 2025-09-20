import React, { useState, useRef } from 'react';
import { InformationCircleIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import ContextOptimizer from './components/ContextOptimizer/ContextOptimizer';
import CustomPrompts from './components/CustomPrompts/CustomPrompts';

const LLMPrompts = ({ projectId, onApplyContextExclusions, currentAnalysisResult }) => {
  const [showBuiltInInfo, setShowBuiltInInfo] = useState(false);
  const [showCustomInfo, setShowCustomInfo] = useState(false);
  const customPromptsRef = useRef();

  const handleAddNewPrompt = () => {
    if (customPromptsRef.current) {
      customPromptsRef.current.handleAddNewPrompt();
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Built-in Prompts Section */}
        <div>
          <div className="flex items-center mb-2">
            <h4 className="text-sm font-medium text-gray-300">Built-in Prompts</h4>
            <button
              onClick={() => setShowBuiltInInfo(true)}
              className="ml-2 p-1 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Learn more about Built-in Prompts"
            >
              <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-200" />
            </button>
          </div>
          <ContextOptimizer
            projectId={projectId}
            onApplyContextExclusions={onApplyContextExclusions}
            currentAnalysisResult={currentAnalysisResult}
          />
        </div>

        {/* Custom Prompts Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <h4 className="text-sm font-medium text-gray-300">Custom Prompts</h4>
              <button
                onClick={() => setShowCustomInfo(true)}
                className="ml-2 p-1 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Learn more about Custom Prompts"
              >
                <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-200" />
              </button>
            </div>
            <button
              onClick={handleAddNewPrompt}
              className="p-1 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
              title="Add new prompt"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <CustomPrompts 
            ref={customPromptsRef} 
            projectId={projectId} 
            currentAnalysisResult={currentAnalysisResult}
          />
        </div>
      </div>

      {/* Built-in Prompts Info Modal - Updated with copy exclusions info */}
      {showBuiltInInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-60 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-lg shadow-xl border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-gray-100 flex items-center">
                <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2" />
                About Built-in Prompts
              </h3>
              <button
                onClick={() => setShowBuiltInInfo(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="text-gray-200">
                <h4 className="font-medium text-blue-400 mb-2">Context Optimizer</h4>
                <p className="text-sm leading-relaxed mb-4">
                  Generate exclude patterns using LLM for irrelevant files from your project context, depending on what feature you're working on.
                </p>
                
                <h4 className="font-medium text-blue-400 mb-2">How to use</h4>
                <ol className="text-sm space-y-2 text-gray-300">
                  <li className="flex">
                    <span className="text-blue-400 mr-2">1.</span>
                    Tell it what you're building
                  </li>
                  <li className="flex">
                    <span className="text-blue-400 mr-2">2.</span>
                    Copy the prompt to your LLM
                  </li>
                  <li className="flex">
                    <span className="text-blue-400 mr-2">3.</span>
                    Paste back the JSON response
                  </li>
                  <li className="flex">
                    <span className="text-blue-400 mr-2">4.</span>
                    Click apply to get cleaner output
                  </li>
                </ol>
                
                <h4 className="font-medium text-purple-400 mb-2 mt-4">Making exclusions permanent</h4>
                <div className="text-sm space-y-2 text-gray-300">
                  <p>To save exclusions permanently:</p>
                  <ol className="ml-4 space-y-1">
                    <li className="flex">
                      <span className="text-purple-400 mr-2">1.</span>
                      Click the "Copy Exclusions" button
                    </li>
                    <li className="flex">
                      <span className="text-purple-400 mr-2">2.</span>
                      Paste into Exclude Patterns input
                    </li>
                  </ol>
                </div>
                
                <div className="mt-4 p-3 bg-gray-700 rounded-md">
                  <p className="text-xs text-gray-400">
                    <strong>Note:</strong> Context optimizer creates temporary views - your original patterns stay unchanged unless you manually copy them to permanent patterns.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowBuiltInInfo(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Prompts Info Modal */}
      {showCustomInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-60 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md shadow-xl border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-gray-100 flex items-center">
                <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2" />
                About Custom Prompts
              </h3>
              <button
                onClick={() => setShowCustomInfo(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="text-gray-200">
                <h4 className="font-medium text-blue-400 mb-2">Purpose</h4>
                <p className="text-sm leading-relaxed mb-4">
                  Create and manage your own reusable prompts for working with code and documentation across all projects.
                </p>
                
                <h4 className="font-medium text-blue-400 mb-2">How to use</h4>
                <ol className="text-sm space-y-2 text-gray-300">
                  <li className="flex">
                    <span className="text-blue-400 mr-2">1.</span>
                    Click + to create a new prompt
                  </li>
                  <li className="flex">
                    <span className="text-blue-400 mr-2">2.</span>
                    Give it a descriptive title
                  </li>
                  <li className="flex">
                    <span className="text-blue-400 mr-2">3.</span>
                    Write your prompt content
                  </li>
                  <li className="flex">
                    <span className="text-blue-400 mr-2">4.</span>
                    Click copy to get prompt + current analysis
                  </li>
                </ol>
                
                <div className="mt-4 p-3 bg-gray-700 rounded-md">
                  <p className="text-xs text-gray-400">
                    Copy button includes both your prompt and the current analysis output for complete context.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowCustomInfo(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LLMPrompts;