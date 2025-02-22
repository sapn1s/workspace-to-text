import React, { useState } from 'react';
import { ArrowLeftIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import ProjectMenu from './ProjectMenu';
import ProjectVersionSelector from './ProjectVersionSelector';
import ProjectExplorer from './ProjectExplorer';
import { ProjectControls } from './ProjectControls';
import AnalysisResultContainer from './AnalysisResultContainer';
import FileSizeAnalyzer from './FileSizeAnalyzer';

function ProjectView({
    project,
    versions,
    projectPath,
    includePatterns,
    excludePatterns,
    isAnalyzing,
    isCheckingSize,
    result,
    fileSizeData, // New prop for file size data
    onBack,
    onFolderSelect,
    onAnalyze,
    onIncludeChange,
    onExcludeChange,
    onVersionSelect,
    onVersionCreated
}) {
    const [activeTab, setActiveTab] = useState('output');

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-gray-900 py-2 z-10">
                <div className="flex items-center">
                    <button
                        onClick={onBack}
                        className="mr-4 p-2 bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <ArrowLeftIcon className="h-5 w-5 text-blue-500" />
                    </button>
                    <h2 className="text-xl font-semibold">{project.name}</h2>
                </div>
                <ProjectMenu
                    project={project}
                    onVersionCreated={onVersionCreated}
                />
            </div>

            {/* Version Selector */}
            <ProjectVersionSelector
                project={project}
                versions={versions}
                onVersionSelect={onVersionSelect}
            />

            {/* Main Content */}
            <div className="flex gap-6 flex-col lg:flex-row">
                {/* Left Sidebar */}
                <div className="w-full lg:w-80 flex-shrink-0 h-[calc(100vh-12rem)]">
                    <ProjectExplorer
                        path={projectPath}
                        includePatterns={includePatterns}
                        excludePatterns={excludePatterns}
                        onRefresh={onAnalyze}
                        onExcludePatternAdd={onExcludeChange}
                    />
                </div>

                {/* Right Content */}
                <div className="flex-grow space-y-4">
                    {/* Controls */}
                    <ProjectControls
                        projectPath={projectPath}
                        projectId={project.id}
                        isAnalyzing={isAnalyzing}
                        isCheckingSize={isCheckingSize}
                        includePatterns={includePatterns}
                        excludePatterns={excludePatterns}
                        onFolderSelect={onFolderSelect}
                        onAnalyze={onAnalyze}
                        onIncludeChange={onIncludeChange}
                        onExcludeChange={onExcludeChange}
                    />

                    {/* Results Section */}
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-700">
                            <button
                                className={`px-4 py-2 text-sm font-medium ${
                                    activeTab === 'output' 
                                    ? 'text-blue-400 border-b-2 border-blue-400' 
                                    : 'text-gray-400 hover:text-gray-200'
                                }`}
                                onClick={() => setActiveTab('output')}
                            >
                                Output
                            </button>
                            <button
                                className={`px-4 py-2 text-sm font-medium ${
                                    activeTab === 'analysis' 
                                    ? 'text-blue-400 border-b-2 border-blue-400' 
                                    : 'text-gray-400 hover:text-gray-200'
                                }`}
                                onClick={() => setActiveTab('analysis')}
                                disabled={!result || fileSizeData?.length === 0}
                            >
                                Size Analysis
                            </button>
                            
                            {/* Copy button - always visible */}
                            <div className="ml-auto p-2">
                                <button
                                    onClick={() => window.electron.copyToClipboard(result)}
                                    className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={!result}
                                    title="Copy to clipboard"
                                >
                                    <ClipboardIcon className="h-5 w-5 text-blue-500" />
                                </button>
                            </div>
                        </div>
                        
                        {/* Tab Content */}
                        <div className="p-4">
                            {activeTab === 'output' ? (
                                <div className="h-[500px]">
                                    <AnalysisResultContainer result={result} />
                                </div>
                            ) : (
                                <FileSizeAnalyzer fileSizeData={fileSizeData} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProjectView;