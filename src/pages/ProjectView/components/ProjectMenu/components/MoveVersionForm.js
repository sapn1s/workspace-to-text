import React, { useState, useEffect } from 'react';
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

export const MoveVersionForm = ({ project, onVersionUpdated, onCancel }) => {
  const [availableParents, setAvailableParents] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(project.parent_id);
  const [isLoadingParents, setIsLoadingParents] = useState(false);

  useEffect(() => {
    const loadAvailableParents = async () => {
      setIsLoadingParents(true);
      try {
        const parents = await window.electron.getAvailableParents(project.id);
        setAvailableParents(parents);
      } catch (error) {
        console.error('Failed to load available parents:', error);
        alert('Failed to load available parents: ' + error.message);
        onCancel();
      } finally {
        setIsLoadingParents(false);
      }
    };

    loadAvailableParents();
  }, [project.id, onCancel]);

  const handleMove = async () => {
    if (!selectedParentId || selectedParentId === project.parent_id) {
      onCancel();
      return;
    }

    try {
      await window.electron.moveVersion(project.id, selectedParentId);
      
      // Simple reload instead of complex state management
      window.location.reload();
      
    } catch (error) {
      console.error('Failed to move version:', error);
      alert('Failed to move version: ' + error.message);
    }
  };

  const renderParentOption = (parent) => {
    const isMainProject = !parent.parent_id;
    const isSelected = selectedParentId === parent.id;
    
    return (
      <div
        key={parent.id}
        className={`flex items-center px-3 py-2 cursor-pointer text-sm ${
          isSelected 
            ? 'bg-blue-600 text-white' 
            : 'hover:bg-gray-600 text-gray-200'
        }`}
        onClick={() => setSelectedParentId(parent.id)}
      >
        <div className="flex items-center space-x-2 w-full">
          {isMainProject ? (
            <span className="font-medium">{parent.name}</span>
          ) : (
            <>
              <span className="text-gray-400">└</span>
              <span>{parent.version_name}</span>
            </>
          )}
          {isMainProject && (
            <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">
              main
            </span>
          )}
          {isSelected && (
            <span className="text-xs bg-blue-500 px-1.5 py-0.5 rounded ml-auto">
              current
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 py-3">
      <div className="text-xs text-gray-400 mb-2 flex items-center">
        <ArrowsPointingOutIcon className="h-3 w-3 mr-1" />
        Move version under:
      </div>
      {isLoadingParents ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : (
        <div className="max-h-40 overflow-y-auto border border-gray-600 rounded-md mb-3">
          {availableParents.map(renderParentOption)}
        </div>
      )}
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={handleMove}
          className="px-3 py-1 text-sm text-blue-400 hover:text-blue-300"
          disabled={!selectedParentId || selectedParentId === project.parent_id || isLoadingParents}
        >
          Move
        </button>
      </div>
    </div>
  );
};