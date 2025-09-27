// src/pages/ProjectView/components/OutputSection/OutputSection.js
import React from 'react';
import { 
    ClipboardIcon,
    ShareIcon
} from '@heroicons/react/24/outline';
import AnalysisResultContainer from '../AnalysisResultContainer/AnalysisResultContainer';
import FileSizeAnalyzer from '../FileSizeAnalyzer/FileSizeAnalyzer';

export function OutputSection({
    activeTab,
    setActiveTab,
    currentData,
    contextAnalysisResult,
    contextAnalysisTitle,
    projectPath,
    isDependencyAnalyzing,
    onOpenDependencyGraph,
    onCopyToClipboard
}) {
    return (
        <div className="bg-gray-800 rounded-lg flex flex-col h-[600px]">
            {/* Tabs Navigation */}
            <div className="flex items-center border-b border-gray-700 flex-shrink-0">
                <button
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'output'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-gray-200'
                        }`}
                    onClick={() => setActiveTab('output')}
                >
                    Output
                </button>
                <button
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'analysis'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-gray-200'
                        }`}
                    onClick={() => setActiveTab('analysis')}
                    disabled={!currentData.result || currentData.fileSizeData?.length === 0}
                >
                    Size Analysis
                </button>

                {/* Context tab - only show if we have context analysis results */}
                {contextAnalysisResult && (
                    <button
                        className={`px-4 py-2 text-sm font-medium ${activeTab === 'context'
                            ? 'text-green-400 border-b-2 border-green-400'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                        onClick={() => setActiveTab('context')}
                        title={contextAnalysisTitle}
                    >
                        Context
                        {contextAnalysisTitle && (
                            <span className="ml-1 text-xs text-gray-500">
                                ({contextAnalysisTitle.split(':')[0]})
                            </span>
                        )}
                    </button>
                )}

                {/* Copy and Dependencies Buttons */}
                <div className="ml-auto p-2 flex items-center space-x-2">
                    <button
                        onClick={onOpenDependencyGraph}
                        className="flex items-center px-3 py-2 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={!projectPath || isDependencyAnalyzing}
                        title="Open dependency graph in new window"
                    >
                        {isDependencyAnalyzing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mr-2"></div>
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <ShareIcon className="h-4 w-4 mr-2 text-purple-500" />
                                Dependencies
                            </>
                        )}
                    </button>

                    <button
                        onClick={onCopyToClipboard}
                        className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!currentData.result}
                        title="Copy to clipboard"
                    >
                        <ClipboardIcon className="h-5 w-5 text-blue-500" />
                    </button>
                </div>
            </div>

            {/* Tab Content - Fixed height with scroll */}
            <div className="flex-1 overflow-hidden p-4">
                {/* Show context analysis title if we're on context tab */}
                {activeTab === 'context' && contextAnalysisTitle && (
                    <div className="mb-2 text-sm text-green-400 font-medium">
                        {contextAnalysisTitle}
                    </div>
                )}

                <div className="h-full w-full overflow-y-auto">
                    {activeTab === 'analysis' ? (
                        <FileSizeAnalyzer fileSizeData={currentData.fileSizeData} />
                    ) : (
                        <AnalysisResultContainer result={currentData.result} />
                    )}
                </div>
            </div>
        </div>
    );
}