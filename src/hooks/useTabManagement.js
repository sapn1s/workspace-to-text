// src/hooks/useTabManagement.js
import { useState, useEffect, useCallback } from 'react';

export function useTabManagement() {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  // Load tabs from localStorage on mount
  useEffect(() => {
    const savedTabs = localStorage.getItem('projectTabs');
    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs);
        setTabs(parsedTabs);
        
        // Set the first tab as active if we have tabs but no active tab
        if (parsedTabs.length > 0 && !activeTabId) {
          setActiveTabId(parsedTabs[0].id);
        }
      } catch (error) {
        console.error('Error loading tabs from localStorage:', error);
        setTabs([]);
      }
    }
  }, []);

  // Save tabs to localStorage whenever tabs change
  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem('projectTabs', JSON.stringify(tabs));
    } else {
      localStorage.removeItem('projectTabs');
    }
  }, [tabs]);

  // Create or update a tab for a project
  const createOrUpdateTab = useCallback((project) => {
    const tabId = `tab-${project.id}`;
    
    setTabs(prevTabs => {
      const existingTabIndex = prevTabs.findIndex(tab => tab.id === tabId);
      
      const newTab = {
        id: tabId,
        projectId: project.id,
        versionId: project.id, // Initially same as project ID
        projectName: project.name,
        versionName: project.version_name || 'Main',
        lastAccessed: Date.now()
      };

      if (existingTabIndex >= 0) {
        // Update existing tab
        const updatedTabs = [...prevTabs];
        updatedTabs[existingTabIndex] = { ...updatedTabs[existingTabIndex], ...newTab };
        return updatedTabs;
      } else {
        // Create new tab
        return [...prevTabs, newTab];
      }
    });

    setActiveTabId(tabId);
    return tabId;
  }, []);

  // Update the version in the current active tab
  const updateTabVersion = useCallback((versionId, versionName) => {
    if (!activeTabId) return;

    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, versionId, versionName, lastAccessed: Date.now() }
          : tab
      )
    );
  }, [activeTabId]);

  // Close a tab
  const closeTab = useCallback((tabId) => {
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // If we're closing the active tab, switch to another tab or clear active
      if (tabId === activeTabId) {
        if (newTabs.length > 0) {
          // Find the most recently accessed tab
          const mostRecent = newTabs.reduce((latest, tab) => 
            tab.lastAccessed > latest.lastAccessed ? tab : latest
          );
          setActiveTabId(mostRecent.id);
        } else {
          setActiveTabId(null);
        }
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  // Switch to a specific tab
  const switchToTab = useCallback((tabId) => {
    setActiveTabId(tabId);
    
    // Update last accessed time
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId 
          ? { ...tab, lastAccessed: Date.now() }
          : tab
      )
    );
  }, []);

  // Get the currently active tab
  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Close all tabs
  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  return {
    tabs,
    activeTabId,
    activeTab,
    createOrUpdateTab,
    updateTabVersion,
    closeTab,
    switchToTab,
    closeAllTabs
  };
}