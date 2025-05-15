import React, { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

export function NewProject({ onCreateProject }) {
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreate = async (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      if (newProjectName.trim()) {
        await onCreateProject(newProjectName);
        setNewProjectName('');
      }
    }
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          onKeyPress={handleCreate}
          className="flex-grow px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder="New project name"
        />
        <button
          onClick={handleCreate}
          className="p-2 bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 text-blue-500" />
        </button>
      </div>
    </div>
  );
}