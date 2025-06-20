// src/pages/ProjectView/components/DependencyGraph/components/DependencyGraphLegend.js
import React from 'react';

export function DependencyGraphLegend({ className = '' }) {
  const nodeTypes = [
    {
      type: 'hub',
      color: '#ef4444',
      label: 'Hub Nodes',
      description: 'Heavily depended upon (5+ incoming dependencies)'
    },
    {
      type: 'entry',
      color: '#a855f7',
      label: 'Entry Points',
      description: 'Many outgoing, few incoming dependencies'
    },
    {
      type: 'bridge',
      color: '#3b82f6',
      label: 'Bridge Nodes',
      description: 'Standard files with moderate connectivity'
    },
    {
      type: 'leaf',
      color: '#10b981',
      label: 'Leaf Nodes',
      description: 'No outgoing dependencies'
    },
    {
      type: 'config',
      color: '#6b7280',
      label: 'Config Files',
      description: 'Configuration and setup files'
    }
  ];

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <h4 className="text-sm font-medium text-gray-200 mb-3">Node Types</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {nodeTypes.map(({ type, color, label, description }) => (
          <div key={type} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <div
                className="w-4 h-4 rounded-full border border-gray-600"
                style={{ backgroundColor: color }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-200">{label}</div>
              <div className="text-xs text-gray-400 leading-relaxed">
                {description}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-700">
        <h5 className="text-xs font-medium text-gray-300 mb-2">Interaction Guide</h5>
        <div className="text-xs text-gray-400 space-y-1">
          <div>• <span className="text-gray-300">Click</span> nodes to select and highlight connections</div>
          <div>• <span className="text-gray-300">Drag</span> empty space to pan the view</div>
          <div>• <span className="text-gray-300">Scroll</span> to zoom in/out</div>
          <div>• <span className="text-gray-300">Hover</span> over nodes for detailed information</div>
        </div>
      </div>
    </div>
  );
}