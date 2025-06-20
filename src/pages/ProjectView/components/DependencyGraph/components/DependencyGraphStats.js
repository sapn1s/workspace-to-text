// src/pages/ProjectView/components/DependencyGraph/components/DependencyGraphStats.js - Compact version
import React from 'react';

export function DependencyGraphStats({ stats, compact = false }) {
  const formatNumber = (num) => num.toLocaleString();
  
  if (compact) {
    // Inline compact version for header
    return (
      <div className="flex items-center space-x-4 text-xs">
        <div className="text-blue-400">
          {formatNumber(stats.totalFiles)} files
        </div>
        <div className="text-green-400">
          {formatNumber(stats.internal)} internal
        </div>
        <div className="text-purple-400">
          {formatNumber(stats.external)} external
        </div>
        {stats.unresolved > 0 && (
          <div className="text-red-400">
            {formatNumber(stats.unresolved)} unresolved
          </div>
        )}
      </div>
    );
  }
  
  // Original card version for side panel
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h4 className="text-sm font-medium text-gray-200 mb-3">Analysis Overview</h4>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">
            {formatNumber(stats.totalFiles)}
          </div>
          <div className="text-xs text-gray-400">Total Files</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {formatNumber(stats.internal)}
          </div>
          <div className="text-xs text-gray-400">Internal Dependencies</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">
            {formatNumber(stats.external)}
          </div>
          <div className="text-xs text-gray-400">External Packages</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">
            {formatNumber(stats.unresolved)}
          </div>
          <div className="text-xs text-gray-400">Unresolved</div>
        </div>
      </div>
    </div>
  );
}