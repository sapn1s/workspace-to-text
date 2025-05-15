import React from 'react';
import { ChevronDownIcon, ChevronRightIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Custom Toggle Switch Component
const ToggleSwitch = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? 'bg-blue-600' : 'bg-gray-600'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

export function ModuleItem({ 
  module,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  isIncluded,
  onToggleInclude
}) {
  return (
    <div className="bg-gray-700 rounded-md overflow-hidden mb-2">
      <div className="p-3 flex items-center justify-between hover:bg-gray-600">
        <div className="flex items-center flex-grow">
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-gray-500 rounded"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <span className="ml-2 text-sm">{module.name}</span>
        </div>
        <div className="flex items-center space-x-2">
          <ToggleSwitch
            checked={isIncluded}
            onChange={onToggleInclude}
          />
          <button
            onClick={onEdit}
            className="p-1 hover:bg-gray-500 rounded"
          >
            <PencilIcon className="w-4 h-4 text-blue-400" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-gray-500 rounded"
          >
            <TrashIcon className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 py-2 border-t border-gray-600 bg-gray-750">
          {module.description && (
            <p className="text-sm text-gray-400 mb-2">{module.description}</p>
          )}
          
          {module.patterns?.length > 0 && (
            <div className="mb-2">
              <h4 className="text-xs font-medium text-gray-400 mb-1">Patterns:</h4>
              <div className="space-y-1">
                {module.patterns.map((pattern, index) => (
                  <div key={index} className="text-sm text-gray-300 font-mono pl-2">
                    {pattern}
                  </div>
                ))}
              </div>
            </div>
          )}

          {module.dependencies?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-1">Includes:</h4>
              <div className="space-y-1">
                {module.dependencies.map(dep => (
                  <div key={dep.id} className="text-sm text-gray-300 pl-2">
                    {dep.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ModuleItem;