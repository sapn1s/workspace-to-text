// src/pages/ProjectView/components/ProjectVersionSelector/ProjectVersionSelector.js
import React, { useState, useRef, useEffect } from 'react';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const ProjectVersionSelector = ({ project, versions, onVersionSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  if (!project) {
    return null;
  }

  const handleVersionChange = async (selectedProject) => {
    setIsExpanded(false);
    onVersionSelect(selectedProject);
  };

  const toggleExpanded = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Early return if versions is not loaded yet
  if (!versions || versions.length === 0) {
    return (
      <div className="mb-3">
        <div className="text-xs text-gray-400 mb-1">Project Version:</div>
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-700 rounded text-sm">
          <span className="text-gray-200 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // IMPROVED: More robust main project finding
  const findMainProject = (currentProject, allVersions) => {
    // First, try to find the main project directly in the versions list
    const mainFromVersions = allVersions.find(v => v.parent_id === null);
    if (mainFromVersions) {
      return mainFromVersions;
    }

    // If not found, traverse up the hierarchy
    if (!currentProject.parent_id) {
      return currentProject;
    }
    
    const parent = allVersions.find(v => v.id === currentProject.parent_id);
    if (parent) {
      return findMainProject(parent, allVersions);
    }
    
    // FALLBACK: Create a mock main project from the current project's data
    console.warn('Main project not found, creating fallback');
    return {
      ...currentProject,
      id: currentProject.parent_id || currentProject.id,
      parent_id: null,
      version_name: null
    };
  };

  const mainProject = findMainProject(project, versions);
  const mainProjectId = mainProject?.id;
  const selectedVersionId = project.id;

  // Build tree structure recursively
  const buildVersionTree = (parentId, level = 0) => {
    return versions
      .filter(v => v.parent_id === parentId)
      .sort((a, b) => b.id - a.id)
      .map(version => ({
        ...version,
        level,
        children: buildVersionTree(version.id, level + 1)
      }));
  };

  const versionTree = buildVersionTree(mainProjectId);
  const hasVersions = versionTree.length > 0;

  // Flatten the tree for rendering
  const flattenTree = (nodes) => {
    const result = [];
    nodes.forEach(node => {
      result.push(node);
      if (node.children && node.children.length > 0) {
        result.push(...flattenTree(node.children));
      }
    });
    return result;
  };

  const flatVersions = flattenTree(versionTree);

  // IMPROVED: Better current selection display
  const getCurrentSelectionPath = (currentProject) => {
    if (!currentProject.parent_id) {
      return currentProject.name;
    }

    const path = [];
    let current = currentProject;
    let safetyCounter = 0; // Prevent infinite loops
    
    while (current && current.parent_id !== null && safetyCounter < 10) {
      if (current.version_name) {
        path.unshift(current.version_name);
      }
      current = versions?.find(v => v.id === current.parent_id);
      safetyCounter++;
    }
    
    if (path.length === 0) {
      return `${mainProject?.name || currentProject.name}`;
    } else {
      return `${mainProject?.name || 'Project'} → ${path.join(' → ')}`;
    }
  };

  const currentSelection = getCurrentSelectionPath(project);

  // Tree line component for visual hierarchy
  const TreeLine = ({ level, isLast = false }) => {
    if (level === 0) return null;
    
    return (
      <div className="flex items-center" style={{ width: `${level * 16}px` }}>
        {[...Array(level)].map((_, i) => (
          <div key={i} className="relative flex items-center justify-center" style={{ width: '16px', height: '20px' }}>
            {i === level - 1 ? (
              <div className="absolute flex items-center justify-center w-full h-full">
                <div 
                  className="border-l-2 border-b-2 border-gray-500" 
                  style={{ 
                    width: '6px', 
                    height: '10px',
                    borderBottomLeftRadius: '4px',
                    transform: 'translateX(-1px)'
                  }} 
                />
              </div>
            ) : (
              <div className="absolute flex items-center justify-center w-full h-full">
                <div 
                  className="border-l-2 border-gray-500" 
                  style={{ 
                    height: '20px',
                    transform: 'translateX(-1px)'
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mb-3 relative" ref={dropdownRef}>
      <div className="space-y-1">
        <div className="text-xs text-gray-400 mb-1">Project Version:</div>
        
        {/* Current Selection - Always Visible */}
        <div 
          className={`flex items-center justify-between px-3 py-1.5 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors text-sm ${
            hasVersions ? 'border border-gray-600' : ''
          }`}
          onClick={hasVersions ? toggleExpanded : undefined}
        >
          <span className="text-gray-200 font-medium truncate">{currentSelection}</span>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {!hasVersions && (
              <span className="text-xs text-gray-500 italic">main only</span>
            )}
            {hasVersions && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(e);
                }} 
                className="p-0.5 hover:bg-gray-500 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="h-3 w-3 text-gray-300" />
                ) : (
                  <ChevronRightIcon className="h-3 w-3 text-gray-300" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Expanded Tree View */}
        {isExpanded && hasVersions && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-md border border-gray-600 shadow-lg z-[9999]">
            <div className="py-1 space-y-0">
              {/* Main Project Row */}
              <div 
                className={`flex items-center px-3 py-1 cursor-pointer transition-colors text-sm ${
                  selectedVersionId === mainProject.id 
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-gray-600 text-gray-200'
                }`}
                onClick={() => handleVersionChange(mainProject)}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{mainProject.name}</span>
                  <span className="text-xs bg-gray-800 px-1.5 py-0.5 rounded">
                    main
                  </span>
                  {selectedVersionId === mainProject.id && (
                    <span className="text-xs bg-blue-500 px-1.5 py-0.5 rounded">
                      current
                    </span>
                  )}
                </div>
              </div>

              {/* Version Tree */}
              {flatVersions.map((version, index) => {
                const isSelected = selectedVersionId === version.id;
                const isLast = index === flatVersions.length - 1;
                
                return (
                  <div
                    key={version.id}
                    className={`flex items-center cursor-pointer transition-colors text-sm ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-600 text-gray-200'
                    }`}
                    onClick={() => handleVersionChange(version)}
                  >
                    <div className="flex items-center w-full px-3 py-1">
                      <TreeLine level={version.level} isLast={isLast} />
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></div>
                        <span className="truncate">{version.version_name}</span>
                        {isSelected && (
                          <span className="text-xs bg-blue-500 px-1.5 py-0.5 rounded flex-shrink-0">
                            current
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectVersionSelector;