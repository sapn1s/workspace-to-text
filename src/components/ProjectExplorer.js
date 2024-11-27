import React, { useState, useCallback, useEffect } from 'react';
import { FileTree } from './project-explorer/FileTree';
import { ExplorerHeader } from './project-explorer/ExplorerHeader';
import { PatternInfo } from './project-explorer/PatternInfo';

const ProjectExplorer = ({
  path,
  includePatterns,
  excludePatterns,
  onRefresh,
  onExcludePatternAdd
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [structure, setStructure] = useState(null);
  const [forceExpand, setForceExpand] = useState(false);

  const loadFileStructure = useCallback(async () => {
    if (!path) return;
    try {
      setIsRefreshing(true);
      const fileStructure = await window.electron.getFileStructure(
        path,
        includePatterns,
        excludePatterns,
        path // Pass the root path to help identify the project
      );
      setStructure(fileStructure);
      setForceExpand(true);
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
    } finally {
      setIsRefreshing(false);
    }
  }, [path, includePatterns, excludePatterns]);
  // Initial load
  useEffect(() => {
    loadFileStructure();
  }, [loadFileStructure]);

  // Reset force expand after it's been used
  useEffect(() => {
    if (forceExpand) {
      setForceExpand(false);
    }
  }, [forceExpand]);

  const handleExclude = useCallback(async (pattern) => {
    if (!onExcludePatternAdd) return;
    const currentPatterns = excludePatterns ? excludePatterns.split(',').map(p => p.trim()) : [];
    const patternExists = currentPatterns.includes(pattern);
    const newPatterns = patternExists
      ? currentPatterns.filter(p => p !== pattern)
      : [...currentPatterns, pattern];
    onExcludePatternAdd(newPatterns.join(','));
    await loadFileStructure();
  }, [excludePatterns, onExcludePatternAdd, loadFileStructure]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await loadFileStructure();
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadFileStructure, onRefresh]);

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg p-4">
      <ExplorerHeader
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="flex-1 overflow-auto my-4 min-h-0">
        {path ? (
          structure ? (
            <FileTree
              structure={structure}
              onExclude={handleExclude}
              basePath={path}
              excludePatterns={excludePatterns}
              initiallyExpanded={forceExpand} // Pass new prop to FileTree
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

      <PatternInfo
        includePatterns={includePatterns}
        excludePatterns={excludePatterns}
      />
    </div>
  );
};

export default ProjectExplorer;