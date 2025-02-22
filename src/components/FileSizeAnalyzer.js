import React, { useState, useEffect, useMemo } from 'react';
import { ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { 
  SizeLegend, 
  FolderTreeItem,
} from './FileSizeComponents/SizeLegend';
import { 
  buildFolderTree, 
  treeToArray 
} from './FileSizeComponents/FileAnalysisUtils';

// Main file size analyzer component
export default function FileSizeAnalyzer({ fileSizeData = [] }) {
  const [sortByFolder, setSortByFolder] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [totalCharCount, setTotalCharCount] = useState(0);

  // Generate folder tree or flat file list based on sort preference
  const { items, totalCharCount: calculatedTotal } = useMemo(() => {
    if (!fileSizeData.length) return { items: [], totalCharCount: 0 };
    
    const totalCharCount = fileSizeData.reduce((sum, file) => sum + file.charCount, 0);
    setTotalCharCount(totalCharCount);
    
    if (sortByFolder) {
      const tree = buildFolderTree(fileSizeData);
      const flattenedTree = treeToArray(tree);
      return { items: flattenedTree, totalCharCount };
    } else {
      // Flat list sorted by size
      const sortedFiles = [...fileSizeData]
        .sort((a, b) => b.charCount - a.charCount)
        .map(file => ({
          ...file,
          isFolder: false,
          level: 0
        }));
      
      return { items: sortedFiles, totalCharCount };
    }
  }, [fileSizeData, sortByFolder]);

  // Handle expanding/collapsing folders
  const toggleFolder = (path) => {
    setExpanded(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Filter items based on expanded state for folder view
  const visibleItems = useMemo(() => {
    if (!sortByFolder) return items;
    
    // For folder view, we need to check if parent folders are expanded
    const result = [];
    let currentPath = '';
    let currentLevel = 0;
    let visible = true;
    
    for (const item of items) {
      // Reset visibility at root level
      if (item.level === 0) {
        visible = true;
      }
      
      // Check if we moved to a deeper level
      if (item.level > currentLevel) {
        // Check if the parent folder is expanded
        visible = visible && expanded[currentPath];
      }
      
      // Only add items that should be visible
      if (visible) {
        result.push(item);
        
        // Update tracking for next iteration
        if (item.isFolder) {
          currentPath = item.path;
          currentLevel = item.level;
        }
      }
    }
    
    return result;
  }, [items, expanded, sortByFolder]);

  // Expand all root folders initially
  useEffect(() => {
    if (items.length) {
      const rootFolders = items
        .filter(item => item.isFolder && item.level === 0)
        .reduce((acc, folder) => {
          acc[folder.path] = true;
          return acc;
        }, {});
      
      setExpanded(rootFolders);
    }
  }, [items]);

  if (!fileSizeData || fileSizeData.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-center">No analysis results to display</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">File Size Analysis</h3>
        
        <div className="flex items-center">
          <SizeLegend />
          
          <button
            onClick={() => setSortByFolder(!sortByFolder)}
            className="flex items-center ml-4 px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
          >
            <ArrowsUpDownIcon className="w-4 h-4 mr-1" />
            {sortByFolder ? 'By Folder' : 'By Size'}
          </button>
        </div>
      </div>
      
      <div className="text-sm text-gray-300 mb-2">
        Total size: <span className="font-mono">{totalCharCount.toLocaleString()}</span> characters
        in {fileSizeData.length} files
      </div>
      
      <div className="bg-gray-700 rounded-md overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto">
          {visibleItems.length > 0 ? (
            visibleItems.map((item, index) => (
              <FolderTreeItem
                key={item.path + index}
                item={item}
                expanded={expanded}
                onToggle={toggleFolder}
                totalCount={totalCharCount}
              />
            ))
          ) : (
            <div className="p-4 text-gray-400 text-center">No files found in analysis</div>
          )}
        </div>
      </div>
    </div>
  );
}