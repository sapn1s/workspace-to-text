import React, { useState, useRef, useEffect } from 'react';
import { EllipsisVerticalIcon, TrashIcon } from '@heroicons/react/24/outline';

const ProjectMenu = ({ project, versions, onVersionCreated, onVersionDeleted, onBack }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    if (isCreatingVersion && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreatingVersion]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateVersion = async () => {
    if (!newVersionName.trim()) return;
    
    try {
      // Always create a version from the currently selected project/version
      // This ensures we copy the settings from the current selection
      const sourceId = project.id;
      
      // Create version based on the current project configuration
      const newVersionId = await window.electron.createProjectVersion(sourceId, newVersionName);
      
      setNewVersionName('');
      setIsCreatingVersion(false);
      setIsOpen(false);
      
      // Determine the main project ID for version listing 
      const mainProjectId = project.parent_id || project.id;
      
      if (onVersionCreated) {
        await onVersionCreated(mainProjectId, newVersionId);
      }
    } catch (error) {
      console.error('Failed to create version:', error);
      alert('Failed to create version: ' + error.message);
    }
  };

  const handleDeleteVersion = async () => {
    if (!project.parent_id) {    
      const confirmed = window.confirm(
        `Are you sure you want to delete the entire project "${project.name}"? This action cannot be undone.`
      );
      
      if (confirmed) {
        try {
          await window.electron.deleteProject(project.id);
          setIsOpen(false);
          onBack(); // Navigate back to project list
        } catch (error) {
          console.error('Failed to delete project:', error);
          alert('Failed to delete project: ' + error.message);
        }
      }
    } else {
      // This is a version
      const confirmed = window.confirm(
        `Are you sure you want to delete version "${project.version_name}"? This action cannot be undone.`
      );
      
      if (confirmed) {
        try {
          await window.electron.deleteVersion(project.id);
          setIsOpen(false);
          
          if (onVersionDeleted) {
            const mainProjectId = project.parent_id;
            await onVersionDeleted(mainProjectId);
          }
        } catch (error) {
          console.error('Failed to delete version:', error);
          alert('Failed to delete version: ' + error.message);
        }
      }
    }
  };

  const isMainProject = !project.parent_id;
  const hasVersions = versions && versions.length > 0;
  const canDeleteMainProject = isMainProject && !hasVersions;
  
  if (!project) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {/* Create Version Option */}
            {isCreatingVersion ? (
              <div className="px-4 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateVersion()}
                  placeholder="Enter version name"
                  className="w-full px-2 py-1 bg-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end mt-2 space-x-2">
                  <button
                    onClick={() => {
                      setIsCreatingVersion(false);
                      setNewVersionName('');
                    }}
                    className="px-2 py-1 text-sm text-gray-400 hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateVersion}
                    className="px-2 py-1 text-sm text-blue-400 hover:text-blue-300"
                    disabled={!newVersionName.trim()}
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingVersion(true)}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
              >
                Create New Version
              </button>
            )}

            {/* Separator */}
            <div className="border-t border-gray-700 my-1"></div>

            {/* Delete Option */}
            <button
              onClick={handleDeleteVersion}
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

            {/* Info text for disabled delete */}
            {isMainProject && hasVersions && (
              <div className="px-4 py-2 text-xs text-gray-500">
                Main project can only be deleted from the project list page
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectMenu;