import React, { useState, useEffect } from 'react';
import { Dialog } from '../../../../components/common/Dialog';

export function RenameProjectDialog({ project, onSave, onClose }) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name || '');
    }
  }, [project]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(project.id, name.trim());
    }
  };

  return (
    <Dialog
      title="Rename Project"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter project name"
            autoFocus
            required
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 text-sm"
            disabled={!name.trim()}
          >
            Save
          </button>
        </div>
      </form>
    </Dialog>
  );
}