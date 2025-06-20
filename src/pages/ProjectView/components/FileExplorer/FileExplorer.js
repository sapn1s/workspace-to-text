import { useState, useCallback, useEffect, useRef } from 'react';
import { FileTree } from './components/FileTree/FileTree';
import { ExplorerHeader } from './components/ExplorerHeader';

const FileExplorer = ({
    path,
    project,
    onPatternChange,
    // New props for module functionality
    modules = [],
    onModuleChange
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
        if (!path || !project?.id) return;
        try {
            setIsRefreshing(true);

            // Get resolved patterns first
            const patterns = await window.electron.patterns.resolve(project.id);
            setResolvedPatterns(patterns);

            // FileSystem handler will automatically use the resolved patterns
            const fileStructure = await window.electron.getFileStructure(
                path,
                path
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
                name: path,
                path: path,
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
    }, [path, project?.id]);

    // Effect to handle path or project changes (major changes - reset everything)
    useEffect(() => {
        const pathChanged = path !== prevPath.current;
        const projectChanged = project?.id !== prevProjectId.current;
        const isInitialLoad = !prevPath.current && path;

        if (pathChanged || projectChanged || isInitialLoad) {
            setStructure(null);
            setResolvedPatterns(null);
            loadFileStructure(false);
            prevPath.current = path;
            prevProjectId.current = project?.id;
        }
    }, [path, project?.id, loadFileStructure]);

    // Reset force expand after it's been used
    useEffect(() => {
        if (forceExpand) {
            setForceExpand(false);
        }
    }, [forceExpand]);

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

    // New handler for adding patterns to modules
    const handleAddToModule = useCallback(async (moduleId, pattern) => {
        try {
            console.log(`Adding pattern "${pattern}" to module ${moduleId}`);
            
            // Split pattern into individual patterns if it contains commas
            const patterns = pattern.split(',').filter(p => p.trim());
            
            for (const singlePattern of patterns) {
                await window.electron.modules.addPattern({
                    moduleId,
                    pattern: singlePattern.trim()
                });
            }
            
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
                {path ? (
                    structure ? (
                        <FileTree
                            key={`file-tree-${structureKey.current}`}
                            structure={structure}
                            onExclude={handleExclude}
                            basePath={path}
                            excludePatterns={resolvedPatterns?.excludePatterns || ''}
                            initiallyExpanded={forceExpand}
                            preservedExpansionState={expansionState}
                            onExpansionStateChange={handleExpansionStateChange}
                            // Pass module props
                            modules={modules}
                            onAddToModule={handleAddToModule}
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