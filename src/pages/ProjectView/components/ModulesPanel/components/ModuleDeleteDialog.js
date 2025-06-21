// src/pages/ProjectView/components/ModulesPanel/components/ModuleDeleteDialog.js
import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Dialog } from '../../../../../components/common/Dialog';

export function ModuleDeleteDialog({ module, onConfirm, onCancel }) {
  return (
    <Dialog
      title="Delete Module"
      onClose={onCancel}
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-100">
              Delete "{module.name}"?
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {module.patterns && module.patterns.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-md p-3">
            <p className="text-sm text-yellow-200 mb-2">
              This module contains {module.patterns.length} pattern{module.patterns.length !== 1 ? 's' : ''}:
            </p>
            <div className="max-h-20 overflow-y-auto">
              {module.patterns.map((pattern, index) => (
                <div key={index} className="text-xs text-yellow-300 font-mono">
                  {pattern}
                </div>
              ))}
            </div>
          </div>
        )}

        {module.dependencies && module.dependencies.length > 0 && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-md p-3">
            <p className="text-sm text-blue-200">
              This module includes {module.dependencies.length} sub-module{module.dependencies.length !== 1 ? 's' : ''}:
              {' ' + module.dependencies.map(dep => dep.name).join(', ')}
            </p>
          </div>
        )}

        <div className="bg-red-900/20 border border-red-700 rounded-md p-3">
          <p className="text-sm text-red-200">
            <strong>Warning:</strong> Deleting this module will remove it from all project versions 
            and any analysis configurations that depend on it.
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 text-sm text-white"
          >
            Delete Module
          </button>
        </div>
      </div>
    </Dialog>
  );
}