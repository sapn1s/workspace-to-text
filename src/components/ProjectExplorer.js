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

  const loadFileStructure = useCallback(async () => {
    if (!path) return;
    try {
      setIsRefreshing(true);
      const fileStructure = await window.electron.getFileStructure(
        path, 
        includePatterns,
        excludePatterns
      );
      setStructure(fileStructure);
    } catch (error) {
      console.error('Error loading file structure:', error);
      setStructure([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [path, includePatterns, excludePatterns]);

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

  const handleExclude = useCallback((pattern) => {
    if (!onExcludePatternAdd) return;
    
    const currentPatterns = excludePatterns 
      ? excludePatterns.split(',').filter(p => p.trim())
      : [];
    
    const patternExists = currentPatterns.includes(pattern);
    
    if (patternExists) {
      // Pass string directly instead of event object
      onExcludePatternAdd(
        currentPatterns.filter(p => p !== pattern).join(',')
      );
    } else {
      // Pass string directly instead of event object
      onExcludePatternAdd(
        [...currentPatterns, pattern].join(',')
      );
    }
  }, [excludePatterns, onExcludePatternAdd]);
  
  useEffect(() => {
    loadFileStructure();
  }, [loadFileStructure]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col min-h-0">
      <ExplorerHeader 
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      
      <div className="flex-grow overflow-auto min-h-0">
        {path ? (
          structure ? (
            <FileTree 
              structure={structure}
              onExclude={handleExclude}
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