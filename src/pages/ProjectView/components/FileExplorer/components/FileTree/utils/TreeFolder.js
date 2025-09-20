import React, { useState } from 'react';
import { FileTreeItem } from '../../FileTreeItem';
import { pathUtils, checkExcludedStatus } from './TreeUtils';
import { ContextMenu } from '../../ContextMenu/ContextMenu';

// Helper function to normalize path and remove redundant ./ components
const normalizePath = (inputPath) => {
  if (!inputPath) return '';
  
  // Convert all separators to forward slashes
  let normalized = inputPath.replace(/\\/g, '/');
  
  // Remove redundant ./ at the beginning
  normalized = normalized.replace(/^\.\/+/, '');
  
  // Remove redundant /./ in the middle
  normalized = normalized.replace(/\/\.\/+/g, '/');
  
  // Remove trailing slashes except for root
  normalized = normalized.replace(/\/+$/, '');
  
  return normalized;
};

// Helper function to safely join paths
const safePathJoin = (basePath, relativePath) => {
  if (!basePath || !relativePath) return basePath || relativePath || '';
  
  // Normalize both paths first
  const cleanBasePath = normalizePath(basePath);
  const cleanRelativePath = normalizePath(relativePath);
  
  // If the relative path is empty after normalization, just return base
  if (!cleanRelativePath || cleanRelativePath === '.') {
    return cleanBasePath;
  }
  
  // Join them with a single separator, avoiding double slashes
  return `${cleanBasePath}/${cleanRelativePath}`.replace(/\/+/g, '/');
};

export const TreeFolder = ({
  structure,
  level,
  onExclude,
  basePath,
  parentPath,
  excludePatterns,
  onLoadChildren,
  expanded,
  onToggle,
  containsExcluded,
  modules = [],
  onAddToModule,
  onAnalyzeContext,
  onAddToCurrentAnalysis
}) => {
  const [contextMenu, setContextMenu] = useState(null);

  const currentRelativePath = level === 0
    ? structure.path
    : pathUtils.join(parentPath, structure.name);

  const handleContextMenu = (e, item) => {
    e.preventDefault();

    const fullPath = currentRelativePath;
    const pattern = item.type === 'folder'
      ? `${fullPath},${fullPath}/**`
      : fullPath;

    const isExcluded = checkExcludedStatus({ ...item, fullPath }, excludePatterns);

    // Build context menu options
    const options = [
      // General pattern option
      {
        label: isExcluded ? `Include ${item.name}` : `Exclude ${item.name}`,
        onClick: async () => {
          await onExclude(pattern);
          if (expanded[currentRelativePath]) {
            onToggle(currentRelativePath, true);
          }
        }
      }
    ];

    // Add module options if modules exist and onAddToModule is provided
    if (modules.length > 0 && onAddToModule) {
      // Add separator
      options.push({ separator: true });

      // Add submenu for modules
      options.push({
        label: `Add to Module`,
        submenu: modules.map(module => ({
          label: module.name,
          onClick: async () => {
            await onAddToModule(module.id, pattern);
            // Optionally refresh the tree
            if (expanded[currentRelativePath]) {
              onToggle(currentRelativePath, true);
            }
          }
        }))
      });
    }

    options.push({
      label: 'Analysis',
      submenu: [
        {
          label: 'Analyze',
          onClick: async () => {
            try {
              console.log('Starting context analysis for:', fullPath);
              
              // FIXED: Properly construct the target path
              let targetPath;
              if (item.type === 'file') {
                // For files, construct the absolute path properly
                targetPath = safePathJoin(basePath, fullPath);
                console.log('File analysis - absolute path:', targetPath);
              } else {
                // For folders, we can use the relative path as before
                targetPath = fullPath;
                console.log('Folder analysis - relative path:', targetPath);
              }
              
              await onAnalyzeContext(targetPath, item.name);
            } catch (error) {
              console.error('Context analysis failed:', error);
              alert(`Analysis failed: ${error.message}`);
            }
          }
        },
        {
          label: 'Add to current analysis',
          onClick: async () => {
            try {
              console.log('Adding to current analysis:', fullPath);
              
              // FIXED: Properly construct the target path
              let targetPath;
              if (item.type === 'file') {
                // For files, construct the absolute path properly
                targetPath = safePathJoin(basePath, fullPath);
                console.log('File add to analysis - absolute path:', targetPath);
              } else {
                // For folders, use the relative path as before
                targetPath = fullPath;
                console.log('Folder add to analysis - relative path:', targetPath);
              }
              
              await onAddToCurrentAnalysis(targetPath, item.name);
            } catch (error) {
              console.error('Add to analysis failed:', error);
              alert(`Add to analysis failed: ${error.message}`);
            }
          }
        }
      ]
    });

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options
    });
  };

  const isExcluded = checkExcludedStatus({ ...structure, fullPath: currentRelativePath }, excludePatterns);

  return (
    <div className={level === 0 ? "pl-2" : ""}>
      <FileTreeItem
        item={{
          ...structure,
          fullPath: currentRelativePath,
          excluded: isExcluded
        }}
        level={level}
        isExpanded={expanded[currentRelativePath]}
        onToggle={() => onToggle(currentRelativePath)}
        onContextMenu={handleContextMenu}
        containsExcludedItems={containsExcluded}
      />
      {contextMenu && (
        <ContextMenu
          {...contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};