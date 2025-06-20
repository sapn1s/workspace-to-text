import React, { useState, useEffect } from 'react';
import { TreeFolder } from './utils/TreeFolder';
import { pathUtils, hasExcludedChildren } from './utils/TreeUtils';

export const FileTree = React.memo(({
  structure,
  level = 0,
  onExclude,
  parentIsExcluded = false,
  basePath = '',
  parentPath = '',
  excludePatterns = '',
  initiallyExpanded = false,
  preservedExpansionState = {},
  onExpansionStateChange,
  // New props for module functionality
  modules = [],
  onAddToModule
}) => {

  const [expanded, setExpanded] = useState({});
  const [loadedChildren, setLoadedChildren] = useState({});
  const [localStructure, setLocalStructure] = useState(structure);
  const [containsExcluded, setContainsExcluded] = useState(false);

  const currentRelativePath = level === 0 
    ? structure?.path
    : pathUtils.join(parentPath, structure?.name || '');

  // First update localStructure with the incoming structure and computed fullPath
  useEffect(() => {    
    setLocalStructure({
      ...structure,
      fullPath: currentRelativePath,
      path: structure?.path
    });
  }, [structure, currentRelativePath]);

  // Initialize expansion state from preserved state or defaults
  useEffect(() => {
    const hasPreservedState = Object.keys(preservedExpansionState).length > 0;
    const hasCurrentState = Object.keys(expanded).length > 0;
    
    if (hasPreservedState && !hasCurrentState) {
      setExpanded(preservedExpansionState);
    } else if (!hasPreservedState && !hasCurrentState) {
      const newExpanded = {};
      
      if (level === 0 || initiallyExpanded) {
        newExpanded[currentRelativePath] = true;
      }
      
      setExpanded(newExpanded);
    }
  }, [structure?.path]);

  // Separate effect for initial expansion (only runs once per mount)
  useEffect(() => {
    if ((level === 0 || initiallyExpanded) && Object.keys(expanded).length === 0) {
      setExpanded(prev => ({
        ...prev,
        [currentRelativePath]: true
      }));
    }
  }, [level, initiallyExpanded, currentRelativePath]);

  // Reset loaded children when the structure key (path) changes
  useEffect(() => {
    if (structure?.path && structure.path !== localStructure?.path) {
      setLoadedChildren({});
    }
  }, [structure?.path, localStructure?.path]);

  // Report expansion state changes back to parent (only from root level)
  const lastReportedState = React.useRef('');
  useEffect(() => {
    if (level === 0 && onExpansionStateChange) {
      const currentStateString = JSON.stringify(expanded);
      if (currentStateString !== lastReportedState.current) {
        lastReportedState.current = currentStateString;
        onExpansionStateChange(expanded);
      }
    }
  }, [expanded, level, onExpansionStateChange]);

  useEffect(() => {
    const checkExclusions = async () => {
      if (localStructure?.type === 'folder') {
        const hasExcluded = await hasExcludedChildren(
          { ...localStructure, fullPath: currentRelativePath },
          excludePatterns,
          basePath
        );
        setContainsExcluded(hasExcluded);
      }
    };

    checkExclusions();
  }, [localStructure, excludePatterns, basePath, currentRelativePath]);

  const toggleFolder = async (relativePath, forceReload = false) => {
    if (expanded[relativePath] && !forceReload) {
      setExpanded(prev => ({ ...prev, [relativePath]: false }));
      return;
    }

    try {
      let absolutePath;
      if (pathUtils.isAbsolute(relativePath)) {
        absolutePath = relativePath;
      } else if (basePath) {
        absolutePath = pathUtils.join(basePath, relativePath);
      } else {
        absolutePath = relativePath;
      }

      const children = await window.electron.getFileStructure(
        absolutePath,
        basePath
      );
      
      if (children && children.children) {
        const updatedChildren = children.children.map(child => ({
          ...child,
          fullPath: pathUtils.join(relativePath, child.name)
        }));

        setLoadedChildren(prev => ({
          ...prev,
          [relativePath]: updatedChildren
        }));

        setExpanded(prev => ({
          ...prev,
          [relativePath]: true
        }));
      }
    } catch (error) {
      console.error('Error loading children:', error);
      setLoadedChildren(prev => ({
        ...prev,
        [relativePath]: []
      }));
    }
  };

  const renderChildren = (parentRelativePath) => {
    const children = loadedChildren[parentRelativePath] || localStructure.children || [];
    return children.map((child) => (
      <FileTree
        key={child.fullPath || pathUtils.join(parentRelativePath, child.name)}
        structure={child}
        level={level + 1}
        onExclude={onExclude}
        parentIsExcluded={parentIsExcluded}
        basePath={basePath}
        parentPath={parentRelativePath}
        excludePatterns={excludePatterns}
        initiallyExpanded={initiallyExpanded}
        preservedExpansionState={level === 0 ? {} : preservedExpansionState}
        onExpansionStateChange={level === 0 ? undefined : onExpansionStateChange}
        // Pass through module props
        modules={modules}
        onAddToModule={onAddToModule}
      />
    ));
  };

  return (
    <>
      <TreeFolder
        structure={localStructure}
        level={level}
        onExclude={onExclude}
        basePath={basePath}
        parentPath={parentPath}
        excludePatterns={excludePatterns}
        onLoadChildren={setLoadedChildren}
        expanded={expanded}
        onToggle={toggleFolder}
        containsExcluded={containsExcluded}
        // Pass module props to TreeFolder
        modules={modules}
        onAddToModule={onAddToModule}
      />
      {localStructure.type === 'folder' && expanded[currentRelativePath] && (
        <div className="pl-2">
          {renderChildren(currentRelativePath)}
        </div>
      )}
    </>
  );
});

FileTree.displayName = 'FileTree';