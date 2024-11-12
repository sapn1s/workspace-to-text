import React, { useState, useEffect } from 'react';
import { TreeFolder } from './file_tree/TreeFolder';
import { pathUtils, hasExcludedChildren } from './file_tree/TreeUtils';

export const FileTree = React.memo(({
  structure,
  level = 0,
  onExclude,
  parentIsExcluded = false,
  basePath = '',
  parentPath = '',
  excludePatterns = ''
}) => {
  const [expanded, setExpanded] = useState({});
  const [loadedChildren, setLoadedChildren] = useState({});
  const [localStructure, setLocalStructure] = useState(structure);
  const [containsExcluded, setContainsExcluded] = useState(false);

  const currentRelativePath = level === 0 
    ? structure?.path  // Use structure.path directly instead of localStructure.path
    : pathUtils.join(parentPath, structure?.name || '');

  // First update localStructure with the incoming structure and computed fullPath
  useEffect(() => {
    console.log('Setting localStructure:', {
      structure,
      currentRelativePath,
      path: structure?.path
    });
    
    setLocalStructure({
      ...structure,
      fullPath: currentRelativePath,
      path: structure?.path // Preserve the original path
    });
  }, [structure, currentRelativePath]);

  // Then handle expansion based on the updated localStructure
  useEffect(() => {
    console.log('FileTree mount/update:', {
      level,
      hasPath: !!localStructure?.path,
      path: localStructure?.path,
      currentRelativePath,
      structure: localStructure
    });

    console.log("level", (level === 0), "path", (localStructure?.path==true))
    if (level === 0) {
      toggleFolder(currentRelativePath, true);
    }
  }, [level, localStructure?.path]);;

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
    console.log('Toggle folder called:', {
      relativePath,
      forceReload,
      isRootLevel: level === 0,
      expanded: expanded[relativePath]
    });

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
        '',
        excludePatterns,
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