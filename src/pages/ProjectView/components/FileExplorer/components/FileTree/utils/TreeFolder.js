import React, { useState } from 'react';
import { FileTreeItem } from '../../FileTreeItem';
import { pathUtils, checkExcludedStatus } from './TreeUtils';
import { ContextMenu } from '../../ContextMenu/ContextMenu';

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
  onAddToModule
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
            console.log("yeees?")
            await onAddToModule(module.id, pattern);
            // Optionally refresh the tree
            if (expanded[currentRelativePath]) {
              onToggle(currentRelativePath, true);
            }
          }
        }))
      });
    }

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