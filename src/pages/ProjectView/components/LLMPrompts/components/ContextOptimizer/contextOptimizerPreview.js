// src/pages/ProjectView/components/LLMPrompts/components/ContextOptimizer/contextOptimizerPreview.js
import React from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export const renderContextPreview = (editingData) => {
  const parsedResponse = (() => {
    if (!editingData.llmResponse?.trim()) return null;
    try {
      return JSON.parse(editingData.llmResponse);
    } catch {
      return null;
    }
  })();

  const hasValidResponse = parsedResponse && Array.isArray(parsedResponse.exclusions);
  const hasMissingFiles = parsedResponse && Array.isArray(parsedResponse.missingFiles) && parsedResponse.missingFiles.length > 0;

  return (
    <>
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
                        <div>
                          <div className="text-gray-300 font-medium mb-1">Usage Evidence:</div>
                          <div className="text-gray-400 font-mono bg-gray-800 p-2 rounded text-xs leading-relaxed">
                            {missing.usageEvidence}
                          </div>
                        </div>
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
    </>
  );
};