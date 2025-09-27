// src/pages/ProjectView/components/ProjectMenu/components/RenameVersionForm.js
import React, { useState, useRef, useEffect } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';

export const RenameVersionForm = ({ project, onVersionUpdated, onCancel }) => {
  const [renameValue, setRenameValue] = useState(project.version_name || '');
  const inputRef = useRef();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleRename = async () => {
    if (!renameValue.trim() || renameValue === project.version_name) {
      onCancel();
      return;
    }

    try {
      await window.electron.renameVersion(project.id, renameValue.trim());
      
      // Simple reload instead of complex state management
      window.location.reload();
      
    } catch (error) {
      console.error('Failed to rename version:', error);
      alert('Failed to rename version: ' + error.message);
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="text-xs text-gray-400 mb-2 flex items-center">
        <PencilIcon className="h-3 w-3 mr-1" />
        Rename version:
      </div>
      <input
        ref={inputRef}
        type="text"
        value={renameValue}
        onChange={(e) => setRenameValue(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleRename()}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        className="w-full px-3 py-2 bg-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
      />
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={handleRename}
          className="px-3 py-1 text-sm text-blue-400 hover:text-blue-300"
          disabled={!renameValue.trim()}
        >
          Rename
        </button>
      </div>
    </div>
  );
};