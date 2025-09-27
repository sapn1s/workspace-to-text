import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

export const DeleteVersionButton = ({ project, hasVersions, onVersionDeleted, onProjectDeleted }) => {
  const isMainProject = !project.parent_id;

  const handleDelete = async () => {
    if (isMainProject) {    
      const confirmed = window.confirm(
        `Are you sure you want to delete the entire project "${project.name}"? This action cannot be undone.`
      );
      
      if (confirmed) {
        try {
          await window.electron.deleteProject(project.id);
          onProjectDeleted();
        } catch (error) {
          console.error('Failed to delete project:', error);
          alert('Failed to delete project: ' + error.message);
        }
      }
    } else {
      const confirmed = window.confirm(
        `Are you sure you want to delete version "${project.version_name}"? This action cannot be undone.`
      );
      
      if (confirmed) {
        try {
          await window.electron.deleteVersion(project.id);
          const mainProjectId = project.parent_id;
          await onVersionDeleted(mainProjectId);
        } catch (error) {
          console.error('Failed to delete version:', error);
          alert('Failed to delete version: ' + error.message);
        }
      }
    }
  };

  return (
    <>
      <button
        onClick={handleDelete}
        className={`w-full text-left px-4 py-2 text-sm flex items-center ${
          isMainProject && hasVersions
            ? 'text-gray-500 cursor-not-allowed'
            : 'text-red-400 hover:bg-gray-700 hover:text-red-300'
        }`}
        disabled={isMainProject && hasVersions}
        title={
          isMainProject && hasVersions
            ? 'Main project can only be deleted from the project list page'
            : isMainProject
            ? 'Delete entire project'
            : 'Delete this version'
        }
      >
        <TrashIcon className="h-4 w-4 mr-2" />
        {isMainProject ? 'Delete Project' : 'Delete Version'}
      </button>

      {isMainProject && hasVersions && (
        <div className="px-4 py-2 text-xs text-gray-500">
          Main project can only be deleted from the project list page
        </div>
      )}
    </>
  );
};