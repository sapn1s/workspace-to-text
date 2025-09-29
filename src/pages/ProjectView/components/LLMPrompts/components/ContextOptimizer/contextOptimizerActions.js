// src/pages/ProjectView/components/LLMPrompts/components/ContextOptimizer/contextOptimizerActions.js
import React from 'react';

export const renderContextActions = (
  editingData,
  modalSaveStatus,
  setModalSaveStatus,
  onClose,
  saveStatus,
  canCopyExclusions,
  handleCopyExclusions,
  handleApplyExclusionsDirectly
) => {
  const parsedResponse = (() => {
    if (!editingData.llmResponse?.trim()) return null;
    try {
      return JSON.parse(editingData.llmResponse);
    } catch {
      return null;
    }
  })();

  const hasValidResponse = parsedResponse && Array.isArray(parsedResponse.exclusions);

  return (
    <>
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
          onClick={handleApplyExclusionsDirectly}
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
    </>
  );
};