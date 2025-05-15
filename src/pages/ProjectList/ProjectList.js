import React, { useState, useEffect } from 'react';
import { TrashIcon, ChevronDownIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Dialog } from '../../components/common/Dialog';

// Confirmation Dialog Component
function DeleteConfirmationDialog({ project, onConfirm, onCancel }) {
  return (
    <Dialog
      title="Delete Project"
      onClose={onCancel}
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-100">
              Delete "{project.name}"?
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {project.versions && project.versions.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-md p-3">
            <p className="text-sm text-yellow-200">
              This will also delete {project.versions.length} version{project.versions.length !== 1 ? 's' : ''}
              associated with this project.
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 text-sm text-white"
          >
            Delete Project
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function ProjectList({ projects = [], onSelectProject, onDeleteProject }) {
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [projectToDelete, setProjectToDelete] = useState(null);

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

  const handleDeleteClick = (project, event) => {
    event.stopPropagation(); // Prevent triggering project selection

    // Add version count to the project object for the confirmation dialog
    const projectWithVersions = {
      ...project,
      versions: groupedProjects[project.id]?.versions || []
    };

    setProjectToDelete(projectWithVersions);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      onDeleteProject(projectToDelete.id);
      setProjectToDelete(null);
    }
  };

  const cancelDelete = () => {
    setProjectToDelete(null);
  };

  return (
    <>
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
                    onClick={(e) => handleDeleteClick(main, e)}
                    className="px-4 py-3 hover:bg-red-600 transition-colors"
                    title="Delete project"
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
                            onClick={(e) => handleDeleteClick(version, e)}
                            className="px-4 py-2 hover:bg-red-600 transition-colors"
                            title="Delete version"
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

      {/* Confirmation Dialog */}
      {projectToDelete && (
        <DeleteConfirmationDialog
          project={projectToDelete}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </>
  );
}

export default ProjectList;