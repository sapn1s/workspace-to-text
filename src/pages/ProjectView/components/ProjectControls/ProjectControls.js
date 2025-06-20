// src/pages/ProjectView/components/ProjectControls/ProjectControls.js - Updated to pass resolved patterns

import React from 'react';
import {
  FolderIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import PatternInputs from '../PatternInputs/PatternInputs';
import ProjectSettings from '../ProjectSettings/ProjectSettings';

export function ProjectControls({
  projectPath,
  isAnalyzing,
  isCheckingSize,
  onFolderSelect,
  onAnalyze,
  projectId,
  excludePatterns,
  onExcludeChange,
  resolvedPatterns // New prop to pass to PatternInputs
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-1">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={projectPath}
          readOnly
          className="flex-grow px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder="Select project folder"
        />
        <button
          onClick={onFolderSelect}
          className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isAnalyzing || isCheckingSize}
        >
          <FolderIcon className="h-5 w-5 text-blue-500" />
        </button>
      </div>

      <ProjectSettings projectId={projectId} />

      <PatternInputs
        excludePatterns={excludePatterns}
        onExcludeChange={onExcludeChange}
        resolvedPatterns={resolvedPatterns} // Pass resolved patterns for summary display
      />

      <button
        onClick={onAnalyze}
        className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isAnalyzing || isCheckingSize || !projectPath}
      >
        {isCheckingSize ? (
          <>
            <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
            Checking folder size...
          </>
        ) : isAnalyzing ? (
          <>
            <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
            Analyze
          </>
        )}
      </button>
    </div>
  );
}