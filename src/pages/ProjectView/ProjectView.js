// src/pages/ProjectView/ProjectView.js - Restructured layout with constrained heights

import { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeftIcon,
    ClipboardIcon,
    ShareIcon,
    FolderIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import ProjectMenu from './components/ProjectMenu/ProjectMenu';
import ProjectVersionSelector from './components/ProjectVersionSelector/ProjectVersionSelector';
import ProjectSettings from './components/ProjectSettings/ProjectSettings';
import PatternInputs from './components/PatternInputs/PatternInputs';
import AnalysisResultContainer from './components/AnalysisResultContainer/AnalysisResultContainer';
import FileSizeAnalyzer from './components/FileSizeAnalyzer/FileSizeAnalyzer';
import { ModulesPanel } from './components/ModulesPanel/components/ModulesPanel';
import { useModules } from '../../hooks/useModules';
import { usePatterns } from '../../hooks/usePatterns';
import FileExplorer from './components/FileExplorer/FileExplorer';
import LLMPrompts from './components/LLMPrompts/LLMPrompts';

export default function ProjectView({
    project,
    versions,
    projectPath,
    isAnalyzing,
    isCheckingSize,
    result,
    fileSizeData,
    onBack,
    onFolderSelect,
    onAnalyze,
    onVersionSelect,
    onVersionCreated,
    onVersionDeleted
}) {
    const [activeTab, setActiveTab] = useState('output');
    const [isModulesPanelCollapsed, setIsModulesPanelCollapsed] = useState(false);
    const [isDependencyAnalyzing, setIsDependencyAnalyzing] = useState(false);

    // Context analysis state
    const [contextAnalysisResult, setContextAnalysisResult] = useState('');
    const [contextFileSizeData, setContextFileSizeData] = useState([]);
    const [contextAnalysisType, setContextAnalysisType] = useState(null);
    const [contextAnalysisTitle, setContextAnalysisTitle] = useState('');

    const {
        modules,
        mainProjectId,
        createModule,
        updateModule,
        deleteModule,
        refreshModules
    } = useModules(project.id);

    const {
        excludePatterns,
        resolvedPatterns,
        loading: patternsLoading,
        loadProjectPatterns,
        handleExcludePatternAdd
    } = usePatterns();

    // Load patterns when project changes
    useEffect(() => {
        if (project?.id) {
            console.log('ProjectView: Loading patterns for project', project.id);
            loadProjectPatterns(project.id);
        }
    }, [project?.id, loadProjectPatterns]);

    const handleContextAnalysisResult = useCallback((analysisResult, title, type) => {
        console.log('Context analysis result received:', title, type);

        setContextAnalysisResult(analysisResult.text || '');
        setContextFileSizeData(analysisResult.fileSizeData || []);
        setContextAnalysisType(type);
        setContextAnalysisTitle(title);

        // Switch to context tab to show the result
        setActiveTab('context');
    }, []);

    const handleApplyContextExclusions = useCallback(async (exclusionPatterns, featureDescription) => {
        try {
            console.log('Applying context exclusions:', exclusionPatterns);

            const existingPatterns = excludePatterns ? excludePatterns.split(',').filter(p => p.trim()) : [];
            const allPatterns = [...existingPatterns, ...exclusionPatterns];
            const combinedPatterns = allPatterns.join(',');

            const analysisResult = await window.electron.analyzeProjectWithTempExclusions(
                project.id,
                projectPath,
                combinedPatterns
            );

            const title = `Context Analysis: ${featureDescription || 'Feature-focused'}`;
            handleContextAnalysisResult(analysisResult, title, 'context-exclusions');

        } catch (error) {
            console.error('Error applying context exclusions:', error);
            alert('Failed to apply context exclusions: ' + error.message);
        }
    }, [project.id, projectPath, excludePatterns, handleContextAnalysisResult]);

    const handleAnalyzeClick = () => {
        if (!projectPath) {
            alert('Please select a project folder first');
            return;
        }
        onAnalyze(project.id, projectPath);
    };

    const handlePatternChange = async (newPatterns) => {
        await handleExcludePatternAdd(newPatterns, project.id);
    };

    const handleModuleChange = async () => {
        console.log('Module change detected, refreshing patterns and modules...');
        await loadProjectPatterns(project.id);
        await refreshModules();
    };

    const handleModuleCreate = async (moduleData) => {
        await createModule(moduleData);
        await handleModuleChange();
    };

    const handleModuleUpdate = async (moduleData) => {
        await updateModule(moduleData);
        await handleModuleChange();
    };

    const handleModuleDelete = async (moduleId) => {
        await deleteModule(moduleId);
        await handleModuleChange();
    };

    const handleOpenDependencyGraph = async () => {
        if (!projectPath) {
            alert('Please select a project folder first');
            return;
        }

        setIsDependencyAnalyzing(true);

        try {
            // Check folder size first
            const sizeStats = await window.electron.checkDependencyAnalysisSize(project.id, projectPath);

            if (sizeStats.exceedsLimits) {
                const proceed = window.confirm(
                    `This project is large (${sizeStats.totalFiles} files, ${sizeStats.totalSizeMB.toFixed(1)} MB). ` +
                    'Dependency analysis may take a while. Continue?'
                );

                if (!proceed) {
                    setIsDependencyAnalyzing(false);
                    return;
                }
            }

            // Pre-analyze dependencies in the main window
            const dependencyData = await window.electron.analyzeDependencies(
                project.id,
                projectPath,
                excludePatterns || ''
            );

            // Compress the data for URL transmission
            const compressedData = {
                stats: dependencyData.stats,
                graph: {
                    nodes: dependencyData.graph.nodes.map(node => ({
                        id: node.id,
                        label: node.label,
                        type: node.type,
                        path: node.path,
                        imports: node.imports,
                        importedBy: node.importedBy
                    })),
                    edges: dependencyData.graph.edges.map(edge => ({
                        id: edge.id,
                        from: edge.from,
                        to: edge.to,
                        type: edge.type
                    }))
                },
                internal: (dependencyData.internal || []).slice(0, 50),
                external: (dependencyData.external || []).slice(0, 50),
                unresolved: (dependencyData.unresolved || []).slice(0, 50)
            };

            // Create URL with all necessary data
            const params = new URLSearchParams({
                projectId: project.id.toString(),
                projectName: project.name,
                projectPath,
                excludePatterns: excludePatterns || '',
                versionName: project.version_name || 'Main'
            });

            // Add dependency data as base64 encoded JSON
            const dataString = JSON.stringify(compressedData);
            const encodedData = btoa(encodeURIComponent(dataString));
            params.set('dependencyData', encodedData);

            // Handle both development and production URLs
            let baseUrl;
            if (window.location.protocol === 'file:') {
                // Production build - use the current file URL structure
                const currentPath = window.location.pathname;
                const baseDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
                baseUrl = `${window.location.protocol}//${window.location.host}${baseDir}`;
            } else {
                // Development - use the origin
                baseUrl = window.location.origin;
            }

            const fullUrl = `${baseUrl}/index.html#dependency-graph?${params.toString()}`;

            console.log('Opening dependency graph window with URL:', fullUrl);

            const popup = window.open(
                fullUrl,
                `dependency-graph-${project.id}`,
                'width=1500,height=900,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
            );

            if (popup) {
                popup.focus();
            } else {
                alert('Popup blocked! Please allow popups for this site.');
            }
        } catch (error) {
            console.error('Error analyzing dependencies:', error);
            alert('Failed to analyze dependencies: ' + error.message);
        } finally {
            setIsDependencyAnalyzing(false);
        }
    };

    // Helper function to get current display data based on active tab
    const getCurrentDisplayData = () => {
        if (activeTab === 'context') {
            return {
                result: contextAnalysisResult,
                fileSizeData: contextFileSizeData,
                title: contextAnalysisTitle,
                type: contextAnalysisType
            };
        }
        return {
            result: result,
            fileSizeData: fileSizeData,
            title: null,
            type: 'regular'
        };
    };

    const currentData = getCurrentDisplayData();

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
                    <div>
                        <h2 className="text-xl font-semibold text-gray-100">{project.name}</h2>
                        {project.version_name && (
                            <span className="text-sm text-gray-400">Version: {project.version_name}</span>
                        )}
                    </div>
                    {patternsLoading && (
                        <span className="ml-2 text-sm text-blue-400">Loading patterns...</span>
                    )}
                </div>
                <ProjectMenu
                    project={project}
                    versions={versions}
                    onVersionCreated={onVersionCreated}
                    onVersionDeleted={onVersionDeleted}
                    onBack={onBack}
                />
            </div>

            {/* Version Selector */}
            <ProjectVersionSelector
                project={project}
                versions={versions}
                onVersionSelect={onVersionSelect}
            />

            {/* Main Content Area - Two Row Layout */}
            <div className="flex flex-col gap-4 min-h-[calc(100vh-12rem)] mt-4">

                {/* Row 1: File Explorer + Project Configuration + Modules Panel */}
                <div className="flex gap-4">
                    {/* File Explorer */}
                    <div className="w-1/5 flex-none">
                        <FileExplorer
                            path={projectPath}
                            project={project}
                            onPatternChange={handlePatternChange}
                            modules={modules}
                            onModuleChange={handleModuleChange}
                            onContextAnalysisResult={handleContextAnalysisResult}
                        />
                    </div>

                    {/* Project Configuration */}
                    <div className="w-1/2 flex-none">
                        <div className="bg-gray-800 rounded-lg p-4 space-y-1 h-full">
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

                            <ProjectSettings projectId={project.id} />

                            <PatternInputs
                                excludePatterns={excludePatterns}
                                onExcludeChange={handlePatternChange}
                                resolvedPatterns={resolvedPatterns}
                            />

                            <button
                                onClick={handleAnalyzeClick}
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
                    </div>

                    {/* Modules Panel - Uses only needed height, with max constraint */}
                    <div className={`flex-none ${isModulesPanelCollapsed ? 'w-1/12' : 'w-1/5'}`}>
                        <div className="bg-gray-800 rounded-lg max-h-full overflow-hidden">
                            <div className="overflow-y-auto">
                                <ModulesPanel
                                    project={project}
                                    modules={modules}
                                    mainProjectId={mainProjectId}
                                    isCollapsed={isModulesPanelCollapsed}
                                    onToggleCollapse={() => setIsModulesPanelCollapsed(!isModulesPanelCollapsed)}
                                    onModuleCreate={handleModuleCreate}
                                    onModuleUpdate={handleModuleUpdate}
                                    onModuleDelete={handleModuleDelete}
                                    onModuleChange={handleModuleChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 2: Empty space + Output + Prompt Builder - Fixed heights like original */}
                <div className="flex gap-4">
                    {/* Empty space to align with file explorer column */}
                    <div className="w-1/5 flex-none">
                        {/* Empty - maintains column alignment */}
                    </div>

                    {/* Output Section - Fixed height like original */}
                    <div className="w-1/2 flex-none">
                        <div className="bg-gray-800 rounded-lg flex flex-col">
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
                                        onClick={handleOpenDependencyGraph}
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
                                        onClick={() => window.electron.copyToClipboard(currentData.result)}
                                        className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={!currentData.result}
                                        title="Copy to clipboard"
                                    >
                                        <ClipboardIcon className="h-5 w-5 text-blue-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Tab Content - Fixed height like original */}
                            <div className="overflow-hidden p-4">
                                {/* Show context analysis title if we're on context tab */}
                                {activeTab === 'context' && contextAnalysisTitle && (
                                    <div className="mb-2 text-sm text-green-400 font-medium">
                                        {contextAnalysisTitle}
                                    </div>
                                )}

                                <div className="h-[500px] w-full overflow-y-auto">
                                    {activeTab === 'analysis' ? (
                                        <FileSizeAnalyzer fileSizeData={currentData.fileSizeData} />
                                    ) : (
                                        <AnalysisResultContainer result={currentData.result} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Prompt Builder - Fixed height to match output */}
                    <div className={`flex-none ${isModulesPanelCollapsed ? 'w-1/12' : 'w-1/5'}`}>
                        <div className="bg-gray-800 rounded-lg overflow-hidden">
                            <div className="p-4">
                                <div className="h-[500px] overflow-y-auto">
                                    <LLMPrompts
                                        projectId={project.id}
                                        onApplyContextExclusions={handleApplyContextExclusions}
                                        currentAnalysisResult={currentData.result}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}