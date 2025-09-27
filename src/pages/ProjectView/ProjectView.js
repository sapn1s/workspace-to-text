import { useState, useEffect, useCallback } from 'react';
import ProjectVersionSelector from './components/ProjectVersionSelector/ProjectVersionSelector';
import { ModulesPanel } from './components/ModulesPanel/ModulesPanel';
import { useModules } from '../../hooks/useModules';
import { usePatterns } from '../../hooks/usePatterns';
import FileExplorer from './components/FileExplorer/FileExplorer';
import { ProjectHeader } from './components/ProjectHeader/ProjectHeader';
import { ProjectConfiguration } from './components/ProjectConfiguration/ProjectConfiguration';
import { OutputSection } from './components/OutputSection/OutputSection';
import { PromptBuilder } from './components/PromptBuilder/PromptBuilder';

export default function ProjectView({
    project,
    versions,
    projectPath,
    mainProjectId,
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
        createModule,
        updateModule,
        deleteModule,
        refreshModules
    } = useModules(project.id, mainProjectId);

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

    const handleVersionUpdated = async () => {
        try {
            // Reload projects and versions after a version is updated
            await loadProjects();

            // Determine the main project ID to reload versions
            const mainProjectId = project.parent_id || project.id;
            await loadVersions(mainProjectId);

            // Refresh the current project data
            const allProjects = await window.electron.getProjects();
            const updatedProject = allProjects.find(p => p.id === project.id);

            if (updatedProject) {
                setSelectedProject(updatedProject);
            }

            console.log('Version updated successfully');
        } catch (error) {
            console.error('Error handling version update:', error);
        }
    };

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

    const handleCopyToClipboard = () => {
        const currentData = getCurrentDisplayData();
        window.electron.copyToClipboard(currentData.result);
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
            <ProjectHeader
                project={project}
                versions={versions}
                patternsLoading={patternsLoading}
                onBack={onBack}
                onVersionCreated={onVersionCreated}
                onVersionDeleted={onVersionDeleted}
                onVersionUpdated={handleVersionUpdated}
            />

            {/* Version Selector */}
            <ProjectVersionSelector
                project={project}
                versions={versions}
                onVersionSelect={onVersionSelect}
            />

            {/* Main Content Area - Keep original layout structure but fix height issue */}
            <div className="flex flex-col gap-4 mt-4">

                {/* Row 1: File Explorer + Project Configuration + Modules Panel */}
                <div className="flex gap-4">
                    {/* File Explorer - Positioned absolutely so it doesn't affect flex layout */}
                    <div className="w-1/5 flex-none relative">
                        <div className="absolute top-0 left-0 w-full z-10">
                            <FileExplorer
                                path={projectPath}
                                project={project}
                                onPatternChange={handlePatternChange}
                                modules={modules}
                                onModuleChange={handleModuleChange}
                                onContextAnalysisResult={handleContextAnalysisResult}
                            />
                        </div>
                    </div>

                    {/* Project Configuration - Fixed size */}
                    <div className="w-1/2 flex-none">
                        <ProjectConfiguration
                            project={project}
                            projectPath={projectPath}
                            isAnalyzing={isAnalyzing}
                            isCheckingSize={isCheckingSize}
                            excludePatterns={excludePatterns}
                            resolvedPatterns={resolvedPatterns}
                            onFolderSelect={onFolderSelect}
                            onAnalyzeClick={handleAnalyzeClick}
                            onPatternChange={handlePatternChange}
                        />
                    </div>

                    {/* Modules Panel - Positioned absolutely so it doesn't affect flex layout */}
                    <div className={`flex-none relative ${isModulesPanelCollapsed ? 'w-1/12' : 'w-1/5'}`}>
                        <div className="absolute top-0 right-0 w-full z-5">
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

                {/* Row 2: Empty space + Output + Prompt Builder - Fixed heights */}
                <div className="flex gap-4">
                    {/* Empty space to align with file explorer column */}
                    <div className="w-1/5 flex-none">
                        {/* Empty - maintains column alignment */}
                    </div>

                    {/* Output Section - Fixed height */}
                    <div className="w-1/2 flex-none">
                        <OutputSection
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            currentData={currentData}
                            contextAnalysisResult={contextAnalysisResult}
                            contextAnalysisTitle={contextAnalysisTitle}
                            projectPath={projectPath}
                            isDependencyAnalyzing={isDependencyAnalyzing}
                            onOpenDependencyGraph={handleOpenDependencyGraph}
                            onCopyToClipboard={handleCopyToClipboard}
                        />
                    </div>

                    {/* Prompt Builder - Fixed height */}
                    <PromptBuilder
                        project={project}
                        isModulesPanelCollapsed={isModulesPanelCollapsed}
                        currentData={currentData}
                        onApplyContextExclusions={handleApplyContextExclusions}
                    />
                </div>
            </div>
        </div>
    );
}