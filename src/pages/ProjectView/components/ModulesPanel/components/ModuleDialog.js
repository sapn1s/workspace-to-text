import { useState } from 'react';
import { Dialog } from '../../../../../components/common/Dialog';
import { ChipInput } from './ChipInput';

export function ModuleDialog({ module, modules, onSave, onClose }) {
  const [name, setName] = useState(module?.name || '');
  const [description, setDescription] = useState(module?.description || '');
  const [patterns, setPatterns] = useState(module?.patterns?.join(',') || '');
  const [selectedDeps, setSelectedDeps] = useState(
    module?.dependencies?.map(d => d.id) || []
  );

  const isEditing = Boolean(module);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: module?.id,
      name,
      description,
      patterns: patterns.split(',').filter(p => p.trim()),
      dependencies: selectedDeps
    });
  };

  // Filter out the current module from available dependencies
  const availableDeps = modules.filter(m => m.id !== module?.id);

  return (
    <Dialog
      title={isEditing ? 'Edit Module' : 'Create Module'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 rounded-md text-sm"
            placeholder="Module name"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 rounded-md text-sm"
            placeholder="Module description"
            rows={3}
          />
        </div>

        {/* Patterns */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Patterns
          </label>
          <ChipInput
            value={patterns}
            onChange={setPatterns}
            placeholder="Add patterns (e.g., src/admin/**, *.config.js)"
          />
          <p className="text-xs text-gray-400 mt-1">
            Press Enter or comma to add patterns
          </p>
        </div>

        {/* Dependencies */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Include Modules
          </label>
          <div className="space-y-2">
            {availableDeps.map(dep => (
              <label key={dep.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedDeps.includes(dep.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDeps([...selectedDeps, dep.id]);
                    } else {
                      setSelectedDeps(selectedDeps.filter(id => id !== dep.id));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-300">{dep.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Buttons */}
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
          >
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}