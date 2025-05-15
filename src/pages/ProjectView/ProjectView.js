import React, { useState } from 'react';
import { ArrowLeftIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import ProjectMenu from './components/ProjectMenu/ProjectMenu';
import ProjectVersionSelector from './components/ProjectVersionSelector/ProjectVersionSelector';
import { ProjectControls } from './components/ProjectControls/ProjectControls';
import AnalysisResultContainer from './components/AnalysisResultContainer/AnalysisResultContainer';
import FileSizeAnalyzer from './components/FileSizeAnalyzer/FileSizeAnalyzer';
import { ModulesPanel } from './components/ModulesPanel/components/ModulesPanel';
import { useModules } from '../../hooks/useModules';
import FileExplorer from './components/FileExplorer/FileExplorer';

export default function ProjectView({
    project,
    versions,
    projectPath,
    includePatterns,
    excludePatterns,
    isAnalyzing,
    isCheckingSize,
    result,
    fileSizeData,
    onBack,
    onFolderSelect,
    onAnalyze,
    onIncludeChange,
    onExcludeChange,
    onVersionSelect,
    onVersionCreated
}) {
    const [activeTab, setActiveTab] = useState('output');
    const [isModulesPanelCollapsed, setIsModulesPanelCollapsed] = useState(false);

    const {
        modules,
        loading: modulesLoading,
        createModule,
        updateModule,
        deleteModule
    } = useModules(project.id);

    return (
        <div className="flex flex-col w-full mx-auto">
            {/* Header Section */}
            <div className="flex items-center justify-between sticky top-0 bg-gray-900 py-2 z-10">
                <div className="flex items-center">
                    <button
                        onClick={onBack}
                        className="mr-4 p-2 bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Back to projects"
                    >
                        <ArrowLeftIcon className="h-5 w-5 text-blue-500" />
                    </button>
                    <h2 className="text-xl font-semibold text-gray-100">{project.name}</h2>
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

            {/* Main Content Area */}
            <div className="flex gap-4 min-h-[calc(100vh-12rem)] mt-4">
                {/* Left Sidebar - Project Explorer - 30% width */}
                <div className="w-1/5 flex-none">
                    <FileExplorer
                        path={projectPath}
                        includePatterns={includePatterns}
                        excludePatterns={excludePatterns}
                        onRefresh={onAnalyze}
                        onExcludePatternAdd={onExcludeChange}
                    />
                </div>

                {/* Center Content Area - 50% width */}
                <div className="w-1/2 flex-none flex flex-col">
                    {/* Controls Section */}
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
                    <div className="mt-4 flex-1 bg-gray-800 rounded-lg flex flex-col">
                        {/* Tabs Navigation */}
                        <div className="flex items-center border-b border-gray-700">
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
                                disabled={!result || fileSizeData?.length === 0}
                            >
                                Size Analysis
                            </button>

                            {/* Copy Button */}
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
                        <div className="flex-1 overflow-hidden p-4">
                            <div className="h-[500px] w-full">
                                {activeTab === 'output' ? (
                                    <AnalysisResultContainer result={result} />
                                ) : (
                                    <FileSizeAnalyzer fileSizeData={fileSizeData} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Modules Panel - 20% width */}
                {/*
                   <div className={`flex-none ${isModulesPanelCollapsed ? 'w-1/12' : 'w-1/5'}`}>
                    <ModulesPanel
                        project={project}
                        modules={modules}
                        isCollapsed={isModulesPanelCollapsed}
                        onToggleCollapse={() => setIsModulesPanelCollapsed(!isModulesPanelCollapsed)}
                        onModuleCreate={createModule}
                        onModuleUpdate={updateModule}
                        onModuleDelete={deleteModule}
                    />
                </div>
                */}

            </div>
        </div>
    );
}