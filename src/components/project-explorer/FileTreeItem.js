import React from 'react';
import { 
  FolderIcon, 
  DocumentIcon, 
  ArrowDownIcon, 
  ArrowRightIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';

export const FileTreeItem = ({ 
  item, 
  level, 
  isExpanded, 
  onToggle, 
  onContextMenu,
  containsExcludedItems = false,
  fullPath = ''
}) => {
  const isFolder = item.type === 'folder';
  
  const handleClick = () => {
    if (isFolder) {
      onToggle(item.fullPath || item.path);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    onContextMenu(e, {
      ...item,
      fullPath: item.fullPath || item.path
    });
  };

  const getItemStyle = () => {
    if (item.excluded) {
      return 'text-red-400';
    }
    if (isFolder && containsExcludedItems && !item.excluded) {
      return 'text-yellow-400';
    }
    return 'group-hover:text-gray-200';
  };

  const getIconStyle = () => {
    if (item.excluded) {
      return 'text-red-400';
    }
    if (isFolder && containsExcludedItems && !item.excluded) {
      return 'text-yellow-400';
    }
    return isFolder ? 'text-blue-400' : 'text-gray-300';
  };

  const getArrowStyle = () => {
    if (item.excluded) {
      return 'text-red-400/70';
    }
    if (containsExcludedItems && !item.excluded) {
      return 'text-yellow-400/70';
    }
    return 'text-gray-400';
  };

  return (
    <div 
      className={`flex items-center py-1 px-2 hover:bg-gray-700 rounded cursor-pointer group`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div style={{ marginLeft: `${level * 12}px` }} className="flex items-center">
        {isFolder && (
          isExpanded ? (
            <ArrowDownIcon className={`w-4 h-4 mr-1 ${getArrowStyle()}`} />
          ) : (
            <ArrowRightIcon className={`w-4 h-4 mr-1 ${getArrowStyle()}`} />
          )
        )}
        {isFolder ? (
          <FolderIcon className={`w-4 h-4 mr-2 ${getIconStyle()}`} />
        ) : (
          <DocumentIcon className={`w-4 h-4 mr-2 ${getIconStyle()}`} />
        )}
        <span className={`text-sm ${getItemStyle()}`}>
          {item.name}
        </span>
        {item.error && (
          <ExclamationCircleIcon 
            className="w-4 h-4 ml-2 text-red-500" 
            title={item.error}
          />
        )}
      </div>
    </div>
  );
};