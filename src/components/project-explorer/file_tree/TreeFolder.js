import React, { useState, useEffect } from 'react';
import { FileTreeItem } from '../FileTreeItem';
import { ContextMenu } from '../ContextMenu';
import { pathUtils, checkExcludedStatus, hasExcludedChildren } from './TreeUtils';

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
  containsExcluded
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

    const options = [{
      label: checkExcludedStatus({ ...item, fullPath }, excludePatterns) ? 
        `Include ${item.name}` : 
        `Exclude ${item.name}`,
      onClick: async () => {
        await onExclude(pattern);
        if (expanded[currentRelativePath]) {
          onToggle(currentRelativePath, true);
        }
      }
    }];

    setContextMenu({
      x: e.pageX,
      y: e.pageY,
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
