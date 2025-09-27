import React, { useState, useRef, useEffect } from 'react';

export const CreateVersionForm = ({ project, onVersionCreated, onCancel }) => {
  const [newVersionName, setNewVersionName] = useState('');
  const [copyFromMain, setCopyFromMain] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleCreateVersion = async () => {
    if (!newVersionName.trim()) return;
    
    try {
      const sourceId = project.id;
      const newVersionId = await window.electron.createProjectVersion(
        sourceId, 
        newVersionName,
        copyFromMain
      );
      
      const mainProjectId = project.parent_id || project.id;
      await onVersionCreated(mainProjectId, newVersionId);
    } catch (error) {
      console.error('Failed to create version:', error);
      alert('Failed to create version: ' + error.message);
    }
  };

  const currentVersionDisplay = project.parent_id 
    ? project.version_name 
    : 'Main Project';

  return (
    <div className="px-4 py-3">
      <input
        ref={inputRef}
        type="text"
        value={newVersionName}
        onChange={(e) => setNewVersionName(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleCreateVersion()}
        placeholder="Enter version name"
        className="w-full px-3 py-2 bg-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
      />
      
      <div className="mb-3">
        <div className="text-xs text-gray-400 mb-2">Create version from:</div>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="branchSource"
              checked={!copyFromMain}
              onChange={() => setCopyFromMain(false)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="ml-2 text-sm text-gray-200">
              Current Version ({currentVersionDisplay})
            </span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="branchSource"
              checked={copyFromMain}
              onChange={() => setCopyFromMain(true)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="ml-2 text-sm text-gray-200">
              Main Project (fresh start)
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateVersion}
          className="px-3 py-1 text-sm text-blue-400 hover:text-blue-300"
          disabled={!newVersionName.trim()}
        >
          Create
        </button>
      </div>
    </div>
  );
};