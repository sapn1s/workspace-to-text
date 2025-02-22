import React from 'react';
import { 
  ChevronRightIcon, 
  ChevronDownIcon,
  FolderIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

// Size thresholds for coloring (in characters)
export const SIZE_THRESHOLDS = {
  LARGE: 100000,  // 100K chars - Red
  MEDIUM: 50000,  // 50K chars - Orange
  SMALL: 10000    // 10K chars - Yellow
};

// Get color based on character count
export const getSizeColor = (charCount) => {
  if (charCount >= SIZE_THRESHOLDS.LARGE) return 'text-red-500';
  if (charCount >= SIZE_THRESHOLDS.MEDIUM) return 'text-orange-500';
  if (charCount >= SIZE_THRESHOLDS.SMALL) return 'text-yellow-500';
  return 'text-green-500';
};

// Format character count with commas and abbreviations
export const formatCharCount = (count) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(2)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

// Format for displaying in tooltip and detailed views
export const formatDetailedCount = (count) => {
  return count.toLocaleString();
};

// Legend component for size thresholds
export const SizeLegend = () => (
  <div className="flex items-center gap-4 text-xs text-gray-400 ml-4">
    <div className="flex items-center">
      <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1" />
      &gt;100K
    </div>
    <div className="flex items-center">
      <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-1" />
      &gt;50K
    </div>
    <div className="flex items-center">
      <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-1" />
      &gt;10K
    </div>
    <div className="flex items-center">
      <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1" />
      &lt;10K
    </div>
  </div>
);

// Recursive folder tree item component
export const FolderTreeItem = ({ item, expanded, onToggle, totalCount }) => {
  const { name, charCount, level, isFolder, path } = item;
  const colorClass = getSizeColor(charCount);
  const indentation = level * 12; // Indent based on nesting level
  
  return (
    <div className="py-1">
      <div 
        className={`flex items-center hover:bg-gray-700 rounded px-2 cursor-pointer group ${isFolder ? 'font-medium' : ''}`}
        onClick={() => isFolder && onToggle(path)}
        style={{ paddingLeft: `${indentation + 8}px` }}
        title={`${path} (${formatDetailedCount(charCount)} characters)`}
      >
        {isFolder ? (
          <>
            {expanded[path] ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-400 mr-1" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-400 mr-1" />
            )}
            <FolderIcon className={`w-4 h-4 text-blue-400 mr-2 ${colorClass.replace('text-', 'group-hover:text-')}`} />
          </>
        ) : (
          <>
            <span className="w-5"></span>
            <DocumentIcon className="w-4 h-4 text-gray-400 mr-2" />
          </>
        )}
        
        <span className="flex-grow text-sm truncate">
          {name}
        </span>
        
        <div className="flex items-center">
          <span className={`text-sm font-mono ${colorClass} ml-2`}>
            {formatCharCount(charCount)}
          </span>
          
          {/* Percentage pill (for files in folders) */}
          {!isFolder && totalCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-600 rounded-full text-gray-300">
              {Math.round((charCount / totalCount) * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};