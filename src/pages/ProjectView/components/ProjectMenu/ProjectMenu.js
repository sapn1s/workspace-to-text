import React, { useState, useRef, useEffect } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { CreateVersionForm } from './components/CreateVersionForm';
import { RenameVersionForm } from './components/RenameVersionForm';
import { MoveVersionForm } from './components/MoveVersionForm';
import { DeleteVersionButton } from './components/DeleteVersionButton';

const ProjectMenu = ({ project, versions, onVersionCreated, onVersionDeleted, onBack, onVersionUpdated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveForm(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenMenu = () => {
    setIsOpen(!isOpen);
    setActiveForm(null);
  };

  const handleCloseMenu = () => {
    setIsOpen(false);
    setActiveForm(null);
  };

  const handleVersionCreated = async (mainProjectId, newVersionId) => {
    handleCloseMenu();
    if (onVersionCreated) {
      await onVersionCreated(mainProjectId, newVersionId);
    }
  };

  const handleVersionUpdated = async () => {
    handleCloseMenu();
    if (onVersionUpdated) {
      await onVersionUpdated();
    }
  };

  const handleVersionDeleted = async (mainProjectId) => {
    handleCloseMenu();
    if (onVersionDeleted) {
      await onVersionDeleted(mainProjectId);
    }
  };

  const handleProjectDeleted = () => {
    handleCloseMenu();
    onBack();
  };

  if (!project) return null;

  const isMainProject = !project.parent_id;
  const hasVersions = versions && versions.length > 0;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleOpenMenu}
        className="p-2 hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-[9999] max-h-96 overflow-y-auto">
          <div className="py-1">
            
            {/* Create Version */}
            {activeForm === 'create' ? (
              <CreateVersionForm
                project={project}
                onVersionCreated={handleVersionCreated}
                onCancel={() => setActiveForm(null)}
              />
            ) : (
              <button
                onClick={() => setActiveForm('create')}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
              >
                Create New Version
              </button>
            )}

            {/* Rename Version - Only for versions, not main projects */}
            {!isMainProject && (
              activeForm === 'rename' ? (
                <RenameVersionForm
                  project={project}
                  onVersionUpdated={handleVersionUpdated}
                  onCancel={() => setActiveForm(null)}
                />
              ) : (
                <button
                  onClick={() => setActiveForm('rename')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                >
                  Rename Version
                </button>
              )
            )}

            {/* Move Version - Only for versions, not main projects */}
            {!isMainProject && (
              activeForm === 'move' ? (
                <MoveVersionForm
                  project={project}
                  onVersionUpdated={handleVersionUpdated}
                  onCancel={() => setActiveForm(null)}
                />
              ) : (
                <button
                  onClick={() => setActiveForm('move')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                >
                  Move Version
                </button>
              )
            )}

            {/* Separator */}
            <div className="border-t border-gray-700 my-1"></div>

            {/* Delete */}
            <DeleteVersionButton
              project={project}
              hasVersions={hasVersions}
              onVersionDeleted={handleVersionDeleted}
              onProjectDeleted={handleProjectDeleted}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectMenu;