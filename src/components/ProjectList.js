import React, { useState, useEffect } from 'react';
import { TrashIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

function ProjectList({ projects = [], onSelectProject, onDeleteProject }) {
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  const groupedProjects = projects.reduce((acc, project) => {
    if (!project.parent_id) {
      acc[project.id] = {
        main: project,
        versions: []
      };
    } else {
      if (!acc[project.parent_id]) {
        acc[project.parent_id] = { main: null, versions: [] };
      }
      acc[project.parent_id].versions.push(project);
    }
    return acc;
  }, {});

  const toggleExpand = (projectId) => {
    
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  return (
    <div className="flex-grow overflow-auto">
      <h2 className="text-lg font-medium mb-4">Projects</h2>
      <div className="space-y-3">
        {Object.entries(groupedProjects).map(([projectId, { main, versions }]) => {
          if (!main) {
            console.log('Skipping project - no main project found:', projectId);
            return null;
          }

          const isExpanded = expandedProjects.has(main.id);
          const hasVersions = versions.length > 0;

          return (
            <div key={projectId} className="bg-gray-800 rounded-lg overflow-hidden">
              {/* Main Project */}
              <div className="flex items-center">
                <div className="w-10 flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(main.id);
                    }}
                    className="p-2 hover:bg-gray-700 rounded-md"
                  >
                    <ChevronRightIcon 
                      className={`h-5 w-5 text-gray-400 transition-transform duration-200 
                        ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>
                </div>
                <button
                  onClick={() => {
                    onSelectProject(main);
                  }}
                  className="flex-grow px-3 py-3 text-left hover:bg-gray-700"
                >
                  <span className="font-medium text-gray-200">
                    {main.name}
                    {hasVersions && (
                      <span className="ml-2 text-sm text-gray-400">
                        ({versions.length} version{versions.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => onDeleteProject(main.id)}
                  className="px-4 py-3 hover:bg-red-600 transition-colors"
                >
                  <TrashIcon className="h-5 w-5 text-red-500" />
                </button>
              </div>
              
              {isExpanded && versions.length > 0 && (
                <div className="border-t border-gray-700">
                  {versions.map(version => {                   
                    return (
                      <div key={version.id} className="flex items-center bg-gray-750 hover:bg-gray-700">
                        <div className="w-10 flex justify-center">
                          <div className="w-px h-full bg-gray-600"></div>
                        </div>
                        <button
                          onClick={() => onSelectProject(version)}
                          className="flex-grow px-3 py-2 text-left"
                        >
                          <span className="text-gray-300 text-sm">
                            {version.version_name || version.name}
                          </span>
                        </button>
                        <button
                          onClick={() => onDeleteProject(version.id)}
                          className="px-4 py-2 hover:bg-red-600 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProjectList;