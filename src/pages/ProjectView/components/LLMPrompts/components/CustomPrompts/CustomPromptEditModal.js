import React, { useState, useEffect } from 'react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';

const CustomPromptEditModal = ({ prompt, isNew, onClose, onSave, onDelete }) => {
  const [editingPrompt, setEditingPrompt] = useState(prompt);

  const handleSave = () => {
    if (!editingPrompt.title.trim()) {
      alert('Please fill in the title');
      return;
    }
    onSave(editingPrompt);
  };

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    onDelete(editingPrompt.id);
    onClose();
  };

  const canSave = editingPrompt.title.trim();
  const canCopy = editingPrompt.title.trim() && editingPrompt.prompt.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-gray-100">
            {isNew ? 'New Custom Prompt' : 'Edit Custom Prompt'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <input
              type="text"
              value={editingPrompt.title}
              onChange={(e) => setEditingPrompt({...editingPrompt, title: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-200"
              placeholder="Enter prompt title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
            <textarea
              value={editingPrompt.prompt}
              onChange={(e) => setEditingPrompt({...editingPrompt, prompt: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-200 h-[40vh] resize-none font-mono text-sm"
              placeholder="Enter your prompt content (optional - can be added later)"
            />
            {!canCopy && editingPrompt.title.trim() && (
              <p className="text-xs text-gray-400 mt-1">
                Copy button will be enabled once both title and prompt are filled
              </p>
            )}
          </div>
          
          <div className="flex justify-between items-center pt-4">
            {!isNew && (
              <button
                onClick={handleDelete}
                className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white text-sm"
              >
                <TrashIcon className="h-4 w-4" />
                <span>Delete</span>
              </button>
            )}
            <div className="flex space-x-2 ml-auto">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className={`px-4 py-2 rounded-md text-white text-sm ${
                  canSave 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
                disabled={!canSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomPromptEditModal;