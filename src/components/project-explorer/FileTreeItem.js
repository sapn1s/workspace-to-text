import React from 'react';
import { FolderIcon, DocumentIcon, ArrowDownIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export const FileTreeItem = ({ 
  item, 
  level, 
  isExpanded, 
  onToggle, 
  onContextMenu 
}) => {
  const isFolder = item.type === 'folder';

  return (
    <div 
      className={`flex items-center py-1 px-2 hover:bg-gray-700 rounded cursor-pointer ${
        item.excluded ? 'opacity-80' : ''
      }`}
      onClick={() => isFolder && onToggle(item.path)}
      onContextMenu={(e) => onContextMenu(e, item)}
    >
      <div style={{ marginLeft: `${level * 12}px` }} className="flex items-center">
        {isFolder && (
          isExpanded ? (
            <ArrowDownIcon className={`w-4 h-4 mr-1 ${
              item.excluded ? 'text-excluded-icon' : 'text-gray-400'
            }`} />
          ) : (
            <ArrowRightIcon className={`w-4 h-4 mr-1 ${
              item.excluded ? 'text-excluded-icon' : 'text-gray-400'
            }`} />
          )
        )}
        {isFolder ? (
          <FolderIcon className={`w-4 h-4 mr-2 ${
            item.excluded ? 'text-excluded-icon' : 'text-blue-400'
          }`} />
        ) : (
          <DocumentIcon className={`w-4 h-4 mr-2 ${
            item.excluded ? 'text-excluded-icon' : 'text-gray-300'
          }`} />
        )}
        <span className={`text-sm ${
          item.excluded 
            ? 'text-excluded line-through decoration-excluded decoration-2'
            : 'text-gray-200'
        }`}>
          {item.name}
        </span>
      </div>
    </div>
  );
};