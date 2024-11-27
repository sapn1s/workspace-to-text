import React, { useState, useRef, useEffect } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

const ProjectMenu = ({ project, onVersionCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
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
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateVersion = async () => {
    if (!newVersionName.trim()) return;
    
    try {
      // For version creation, always use the main project's ID
      const parentId = project.parent_id || project.id;
      const newVersionId = await window.electron.createProjectVersion(parentId, newVersionName);
      setNewVersionName('');
      setIsCreatingVersion(false);
      setIsOpen(false);
      if (onVersionCreated) {
        await onVersionCreated(parentId, newVersionId);
      }
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  };
  
  if (!project || project.parent_id) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5">
          <div className="py-1">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectMenu;