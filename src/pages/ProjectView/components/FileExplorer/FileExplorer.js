import { useState, useCallback, useEffect, useRef } from 'react';
import { FileTree } from './components/FileTree/FileTree';
import { ExplorerHeader } from './components/ExplorerHeader';

const FileExplorer = ({
    path: projectPath,
    project,
    onPatternChange,
    modules = [],
    onModuleChange,
    onContextAnalysisResult

}) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [structure, setStructure] = useState(null);
    const [forceExpand, setForceExpand] = useState(false);
    const [resolvedPatterns, setResolvedPatterns] = useState(null);
    const structureKey = useRef(0);

    // Store expansion state to preserve it across pattern changes
    const [expansionState, setExpansionState] = useState({});

    // Use refs to track previous values for comparison
    const prevPath = useRef(null);
    const prevProjectId = useRef(null);

    const loadFileStructure = useCallback(async (preserveExpansion = false) => {
        if (!projectPath || !project?.id) return;
        try {
            setIsRefreshing(true);

            // Get resolved patterns first
            const patterns = await window.electron.patterns.resolve(project.id);
            setResolvedPatterns(patterns);

            // FileSystem handler will automatically use the resolved patterns
            const fileStructure = await window.electron.getFileStructure(
                projectPath,
                projectPath
            );

            setStructure(fileStructure);

            // Only force expand and increment key for major changes (path/project changes)
            if (!preserveExpansion) {
                setForceExpand(true);
                structureKey.current += 1;
                setExpansionState({});
            }

        } catch (error) {
            console.error('Error loading file structure:', error);
            setStructure({
                type: 'folder',
                name: projectPath,
                path: projectPath,
                excluded: false,
                children: [],
                hasChildren: false,
                error: error.message
            });

            if (!preserveExpansion) {
                structureKey.current += 1;
                setExpansionState({});
            }
        } finally {
            setIsRefreshing(false);
        }
    }, [projectPath, project?.id]);

    // Effect to handle path or project changes (major changes - reset everything)
    useEffect(() => {
        const pathChanged = projectPath !== prevPath.current;
        const projectChanged = project?.id !== prevProjectId.current;
        const isInitialLoad = !prevPath.current && projectPath;

        if (pathChanged || projectChanged || isInitialLoad) {
            setStructure(null);
            setResolvedPatterns(null);
            loadFileStructure(false);
            prevPath.current = projectPath;
            prevProjectId.current = project?.id;
        }
    }, [projectPath, project?.id, loadFileStructure]);

    // Reset force expand after it's been used
    useEffect(() => {
        if (forceExpand) {
            setForceExpand(false);
        }
    }, [forceExpand]);

    // Helper function to check if a path is absolute (browser-compatible)
    const isAbsolutePath = (path) => {
        if (!path) return false;
        // Windows: starts with drive letter like C:\ or C:/
        // Unix: starts with /
        return /^([A-Za-z]:[\\\/]|[\\\/])/.test(path);
    };

    // Helper function to get relative path (browser-compatible)
    const getRelativePath = (absolutePath, basePath) => {
        if (!absolutePath || !basePath) return absolutePath;

        // Normalize both paths first
        const normAbsolute = normalizePath(absolutePath);
        const normBase = normalizePath(basePath);

        // If the absolute path starts with the base path, remove it
        if (normAbsolute.startsWith(normBase)) {
            let relative = normAbsolute.slice(normBase.length);
            // Remove leading slash
            relative = relative.replace(/^\/+/, '');
            return relative || '.';
        }

        return absolutePath;
    };
    const handleAnalyzeContext = useCallback(async (targetPath, itemName) => {
        try {
            console.log(`Analyzing context: ${itemName} (${targetPath})`);

            let absolutePath;
            let relativePath;

            // Normalize the target path first
            const normalizedTargetPath = normalizePath(targetPath);

            if (isAbsolutePath(normalizedTargetPath)) {
                // It's already absolute
                absolutePath = normalizedTargetPath;
                relativePath = getRelativePath(absolutePath, projectPath);
            } else {
                // It's relative, make it absolute
                absolutePath = safePathJoin(projectPath, normalizedTargetPath);
                relativePath = normalizedTargetPath;
            }

            console.log('Context analysis paths:', {
                originalTargetPath: targetPath,
                normalizedTargetPath,
                absolutePath,
                relativePath,
                projectPath,
                itemName
            });

            const result = await window.electron.contextAnalysis.analyze(
                project.id,
                absolutePath,
                relativePath
            );

            // Notify parent component with the analysis result
            if (onContextAnalysisResult) {
                onContextAnalysisResult(result, `Context: ${itemName}`, 'context');
            }

            console.log('Context analysis completed successfully');
        } catch (error) {
            console.error('Context analysis failed:', error);
            throw error;
        }
    }, [projectPath, project?.id, onContextAnalysisResult]);

    const normalizePath = (inputPath) => {
        if (!inputPath) return '';

        // Convert all separators to forward slashes
        let normalized = inputPath.replace(/\\/g, '/');

        // Remove redundant ./ at the beginning
        normalized = normalized.replace(/^\.\/+/, '');

        // Remove redundant /./  in the middle
        normalized = normalized.replace(/\/\.\/+/g, '/');

        // Remove trailing slashes except for root
        normalized = normalized.replace(/\/+$/, '');

        return normalized;
    };

    // Helper function to safely join paths
    const safePathJoin = (basePath, relativePath) => {
        if (!basePath || !relativePath) return basePath || relativePath || '';

        // Normalize the relative path first
        const cleanRelativePath = normalizePath(relativePath);

        // If it's already absolute after normalization, just return it
        if (isAbsolutePath(cleanRelativePath)) {
            return cleanRelativePath;
        }

        // Normalize base path
        const cleanBasePath = normalizePath(basePath);

        // Join them with a single separator
        return `${cleanBasePath}/${cleanRelativePath}`.replace(/\/+/g, '/');
    };

    // Simplified FileExplorer.js - Back to simple calls

    const handleAddToCurrentAnalysis = useCallback(async (targetPath, itemName) => {
        try {
            console.log(`Adding to current analysis: ${itemName} (${targetPath})`);

            let absolutePath;
            let relativePath;

            // Normalize the target path first
            const normalizedTargetPath = normalizePath(targetPath);

            if (isAbsolutePath(normalizedTargetPath)) {
                absolutePath = normalizedTargetPath;
                relativePath = getRelativePath(absolutePath, projectPath);
            } else {
                absolutePath = safePathJoin(projectPath, normalizedTargetPath);
                relativePath = normalizedTargetPath;
            }

            console.log('Add to analysis paths:', {
                originalTargetPath: targetPath,
                normalizedTargetPath,
                absolutePath,
                relativePath,
                projectPath,
                itemName
            });

            // SIMPLIFIED: Just call the same IPC as context analysis
            const result = await window.electron.contextAnalysis.addToCurrent(
                project.id,
                absolutePath,
                relativePath
            );

            // Notify parent component with the combined analysis result
            if (onContextAnalysisResult) {
                onContextAnalysisResult(result, `Combined + ${itemName}`, 'combined');
            }

            console.log('Added to current analysis successfully');
        } catch (error) {
            console.error('Add to current analysis failed:', error);
            throw error;
        }
    }, [projectPath, project?.id, onContextAnalysisResult]);

    const handleExclude = useCallback(async (pattern) => {
        if (!onPatternChange || !resolvedPatterns) return;

        // Get current user-defined exclude patterns only
        const rawPatterns = await window.electron.getProjectPatterns(project.id);
        const currentPatterns = rawPatterns.exclude_patterns ?
            rawPatterns.exclude_patterns.split(',').filter(p => p.trim()) : [];

        const patternExists = currentPatterns.includes(pattern);
        const newPatterns = patternExists
            ? currentPatterns.filter(p => p !== pattern)
            : [...currentPatterns, pattern];

        // Update patterns through parent component
        await onPatternChange(newPatterns.join(','));

        // Reload file structure to reflect changes
        await loadFileStructure(true);

    }, [resolvedPatterns, onPatternChange, loadFileStructure, project?.id]);

    const handleAddToModule = useCallback(async (moduleId, pattern) => {
        try {
            console.log(`Adding pattern "${pattern}" to module ${moduleId}`);

            // Get the current module data first
            const currentModule = await window.electron.modules.get(moduleId);

            if (!currentModule) {
                throw new Error(`Module with ID ${moduleId} not found`);
            }

            // Split pattern into individual patterns if it contains commas
            const patterns = pattern.split(',').filter(p => p.trim());

            // Add new patterns to the existing ones
            const existingPatterns = currentModule.patterns || [];
            const allPatterns = [...existingPatterns];

            for (const singlePattern of patterns) {
                const trimmedPattern = singlePattern.trim();
                if (!allPatterns.includes(trimmedPattern)) {
                    allPatterns.push(trimmedPattern);
                }
            }

            // Update the module with the new patterns
            const updatedModuleData = {
                id: moduleId,
                name: currentModule.name,
                description: currentModule.description || '',
                patterns: allPatterns,
                dependencies: currentModule.dependencies || []
            };

            await window.electron.modules.update(updatedModuleData);

            // Notify parent about module changes
            if (onModuleChange) {
                await onModuleChange();
            }

            // Reload file structure to reflect changes
            await loadFileStructure(true);

            console.log(`Successfully added pattern(s) to module`);
        } catch (error) {
            console.error('Error adding pattern to module:', error);
            alert(`Failed to add pattern to module: ${error.message}`);
        }
    }, [loadFileStructure, onModuleChange]);

    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            setStructure(null);
            setResolvedPatterns(null);
            await loadFileStructure(false);
        } catch (error) {
            console.error('Error refreshing:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, loadFileStructure]);

    // Callback to receive expansion state updates from FileTree
    const handleExpansionStateChange = useCallback((newExpansionState) => {
        setExpansionState(newExpansionState);
    }, []);

    return (
        <div className="flex flex-col h-fit w-full bg-gray-800 rounded-lg p-4">
            <ExplorerHeader
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
            />

            <div className="flex-1 overflow-auto min-h-0">
                {projectPath ? (
                    structure ? (
                        <FileTree
                            key={`file-tree-${structureKey.current}`}
                            structure={structure}
                            onExclude={handleExclude}
                            basePath={projectPath}
                            excludePatterns={resolvedPatterns?.excludePatterns || ''}
                            initiallyExpanded={forceExpand}
                            preservedExpansionState={expansionState}
                            onExpansionStateChange={handleExpansionStateChange}
                            // Pass module props
                            modules={modules}
                            onAddToModule={handleAddToModule}
                            onAnalyzeContext={handleAnalyzeContext}
                            onAddToCurrentAnalysis={handleAddToCurrentAnalysis}
                        />
                    ) : (
                        <div className="text-center text-gray-400 mt-4">
                            Loading file structure...
                        </div>
                    )
                ) : (
                    <div className="text-center text-gray-400 mt-4">
                        Select a project folder to view its structure
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileExplorer;