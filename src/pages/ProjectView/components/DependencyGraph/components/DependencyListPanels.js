// src/pages/ProjectView/components/DependencyGraph/components/DependencyListPanels.js
import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export function DependencyListPanels({ graphData, showExternal, onNodeSelect }) {
  const [expandedSections, setExpandedSections] = useState({
    unresolved: true,
    external: showExternal,
    topNodes: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Get top nodes by connection count
  const getTopNodes = () => {
    return graphData.graph.nodes
      .filter(node => node.type === 'file')
      .map(node => ({
        ...node,
        totalConnections: node.imports + node.importedBy
      }))
      .sort((a, b) => b.totalConnections - a.totalConnections)
      .slice(0, 10);
  };

  // Group external dependencies by package
  const getGroupedExternals = () => {
    const packageCounts = {};
    graphData.external?.forEach(dep => {
      packageCounts[dep.to] = (packageCounts[dep.to] || 0) + 1;
    });
    
    return Object.entries(packageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15);
  };

  // Handle clicking on a top node
  const handleTopNodeClick = (node) => {
    if (onNodeSelect) {
      console.log('Top node clicked:', node.label);
      onNodeSelect(node);
    }
  };

  const topNodes = getTopNodes();
  const groupedExternals = getGroupedExternals();

  return (
    <div className="space-y-4 p-3">
      {/* Top Connected Nodes */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <button
          onClick={() => toggleSection('topNodes')}
          className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-700"
        >
          <h4 className="text-sm font-medium text-gray-200">
            Most Connected Files ({topNodes.length})
          </h4>
          {expandedSections.topNodes ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {expandedSections.topNodes && (
          <div className="px-3 pb-3 max-h-60 overflow-y-auto">
            {topNodes.map((node, index) => (
              <button
                key={node.id}
                onClick={() => handleTopNodeClick(node)}
                className="w-full py-2 border-b border-gray-700 last:border-b-0 hover:bg-gray-700 rounded transition-colors text-left"
                title={`Click to center on ${node.path}`}
              >
                <div className="text-sm text-gray-200 truncate" title={node.path}>
                  {index + 1}. {node.label}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {node.imports} imports • {node.importedBy} imported by
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Unresolved Dependencies */}
      {graphData.unresolved && graphData.unresolved.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <button
            onClick={() => toggleSection('unresolved')}
            className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-700"
          >
            <h4 className="text-sm font-medium text-red-400">
              Unresolved Dependencies ({graphData.unresolved.length})
            </h4>
            {expandedSections.unresolved ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          {expandedSections.unresolved && (
            <div className="px-3 pb-3 max-h-60 overflow-y-auto">
              {graphData.unresolved.slice(0, 20).map((dep, index) => (
                <div key={index} className="py-2 border-b border-gray-700 last:border-b-0">
                  <div className="text-xs text-gray-300 truncate" title={dep.from}>
                    {dep.from}
                  </div>
                  <div className="text-xs text-red-400 mt-1 truncate" title={dep.to}>
                    → {dep.to}
                  </div>
                </div>
              ))}
              {graphData.unresolved.length > 20 && (
                <div className="text-xs text-gray-500 py-2 text-center">
                  ... and {graphData.unresolved.length - 20} more
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* External Dependencies */}
      {showExternal && graphData.external && graphData.external.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <button
            onClick={() => toggleSection('external')}
            className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-700"
          >
            <h4 className="text-sm font-medium text-green-400">
              External Packages ({groupedExternals.length})
            </h4>
            {expandedSections.external ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          {expandedSections.external && (
            <div className="px-3 pb-3 max-h-60 overflow-y-auto">
              {groupedExternals.map(([pkg, count], index) => (
                <div key={pkg} className="py-2 border-b border-gray-700 last:border-b-0">
                  <div className="text-sm text-green-400 truncate" title={pkg}>
                    {pkg}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {count} import{count !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-3">
        <h4 className="text-sm font-medium text-gray-200 mb-2">Quick Stats</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Average connections:</span>
            <span className="text-gray-200">
              {topNodes.length > 0 
                ? Math.round(topNodes.reduce((sum, node) => sum + node.totalConnections, 0) / topNodes.length)
                : 0
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Max connections:</span>
            <span className="text-gray-200">
              {topNodes.length > 0 ? topNodes[0].totalConnections : 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Files with no dependencies:</span>
            <span className="text-gray-200">
              {graphData.graph.nodes.filter(node => 
                node.type === 'file' && node.imports === 0
              ).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}