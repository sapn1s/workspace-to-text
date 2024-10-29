import React, { useState } from 'react';
import { FileTreeItem } from './FileTreeItem';
import { ContextMenu } from './ContextMenu';

export const FileTree = ({ 
  structure, 
  level = 0,
  onExclude 
}) => {
  const [expanded, setExpanded] = useState({});
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    const pattern = item.type === 'folder' 
      ? `${item.name}/**,${item.name}`
      : item.name;
    
    const options = [{
      label: item.excluded ? `Include ${item.name}` : `Exclude ${item.name}`,
      onClick: () => onExclude(pattern)
    }];
    
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      options
    });
  };

  const toggleFolder = (path) => {
    setExpanded(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  return (
    <div className="pl-2">
      {structure.map((item) => (
        <div key={item.path}>
          <FileTreeItem
            item={item}
            level={level}
            isExpanded={expanded[item.path]}
            onToggle={toggleFolder}
            onContextMenu={handleContextMenu}
          />
          {item.type === 'folder' && expanded[item.path] && item.children && (
            <FileTree 
              structure={item.children}
              level={level + 1}
              onExclude={onExclude}
            />
          )}
        </div>
      ))}
      {contextMenu && (
        <ContextMenu
          {...contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};