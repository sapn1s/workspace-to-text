// src/pages/ProjectView/components/DependencyGraph/components/NodeInfoPanel.js
import React from 'react';

export function NodeInfoPanel({ node, onDeselect, showDeselect = false }) {
  if (!node) return null;

  return (
    <div className="absolute top-4 left-4 bg-gray-800 rounded-lg p-3 border border-gray-600 max-w-xs shadow-lg">
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-medium text-gray-200 text-sm flex-1 pr-2">{node.label}</h4>
        {showDeselect && onDeselect && (
          <button
            onClick={onDeselect}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-200 border border-gray-600 flex-shrink-0"
            title="Deselect node"
          >
            ×
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-2 break-all">{node.path || node.id}</p>
      <div className="text-xs text-gray-500 space-y-1">
        <div>Type: <span className="text-gray-300">{node.category}</span></div>
        <div>Imports: <span className="text-gray-300">{node.imports}</span></div>
        <div>Imported by: <span className="text-gray-300">{node.importedBy}</span></div>
        {node.size && (
          <div>Size: <span className="text-gray-300">{node.size}</span></div>
        )}
      </div>
    </div>
  );
}