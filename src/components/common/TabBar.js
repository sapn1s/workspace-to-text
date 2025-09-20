// src/components/common/TabBar.js
import React from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

export function TabBar({ 
  tabs, 
  activeTabId, 
  onTabClick, 
  onTabClose, 
  onNewTab,
  maxVisibleTabs = 8 
}) {
  if (tabs.length === 0) return null;

  // Sort tabs by last accessed (most recent first) for overflow handling
  const sortedTabs = [...tabs].sort((a, b) => b.lastAccessed - a.lastAccessed);
  
  // Always show the active tab and the most recently used tabs
  const visibleTabs = [];
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  
  if (activeTab) {
    visibleTabs.push(activeTab);
  }
  
  // Add other recent tabs up to the limit
  for (const tab of sortedTabs) {
    if (visibleTabs.length >= maxVisibleTabs) break;
    if (tab.id !== activeTabId && !visibleTabs.find(t => t.id === tab.id)) {
      visibleTabs.push(tab);
    }
  }

  // Sort visible tabs back to their original order (by projectId or creation order)
  visibleTabs.sort((a, b) => a.projectId - b.projectId);

  const hiddenTabsCount = tabs.length - visibleTabs.length;

  return (
    <div className="flex items-center bg-gray-800 border-b border-gray-700 px-2">
      {/* Visible Tabs */}
      <div className="flex items-center overflow-hidden">
        {visibleTabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              flex items-center px-3 py-2 text-sm border-r border-gray-700 cursor-pointer
              min-w-0 max-w-[200px] group relative
              ${tab.id === activeTabId 
                ? 'bg-gray-700 text-gray-100' 
                : 'text-gray-300 hover:bg-gray-750 hover:text-gray-200'
              }
            `}
            onClick={() => onTabClick(tab.id)}
          >
            {/* Tab Content */}
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">
                {tab.projectName}
              </div>
              {tab.versionName !== 'Main' && (
                <div className="truncate text-xs text-gray-400">
                  {tab.versionName}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="ml-2 p-1 rounded hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Close tab"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>

            {/* Active Tab Indicator */}
            {tab.id === activeTabId && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </div>
        ))}
      </div>

      {/* Hidden Tabs Indicator */}
      {hiddenTabsCount > 0 && (
        <div className="px-2 py-2 text-xs text-gray-500">
          +{hiddenTabsCount} more
        </div>
      )}

      {/* New Tab Button */}
      <button
        onClick={onNewTab}
        className="p-2 ml-2 hover:bg-gray-700 rounded transition-colors"
        title="Open new project"
      >
        <PlusIcon className="w-4 h-4 text-gray-400" />
      </button>

      {/* Close All Button (when multiple tabs) */}
      {tabs.length > 1 && (
        <button
          onClick={() => {
            if (window.confirm(`Close all ${tabs.length} tabs?`)) {
              tabs.forEach(tab => onTabClose(tab.id));
            }
          }}
          className="px-2 py-1 ml-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
          title="Close all tabs"
        >
          Close All
        </button>
      )}
    </div>
  );
}