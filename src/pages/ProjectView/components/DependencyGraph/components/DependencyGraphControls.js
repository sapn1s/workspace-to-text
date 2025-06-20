// src/pages/ProjectView/components/DependencyGraph/components/DependencyGraphControls.js
import React, { useState, useRef, useEffect } from 'react';
import { ArrowPathIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

// Node type configurations with colors (shared with main app)
const NODE_TYPE_CONFIG = {
  hub: { 
    label: 'Hub', 
    color: '#ef4444',
    description: 'Heavily depended upon (5+ incoming dependencies)'
  },
  entry: { 
    label: 'Entry', 
    color: '#a855f7',
    description: 'Many outgoing, few incoming dependencies'
  },
  bridge: { 
    label: 'Bridge', 
    color: '#3b82f6',
    description: 'Standard files with moderate connectivity'
  },
  leaf: { 
    label: 'Leaf', 
    color: '#10b981',
    description: 'No outgoing dependencies'
  },
  config: { 
    label: 'Config', 
    color: '#6b7280',
    description: 'Configuration and setup files'
  }
};

// Enhanced Node Type Filter Component
const NodeTypeFilter = ({ nodeFilter, onNodeFilterChange }) => {
  const [showLegend, setShowLegend] = useState(false);
  const legendRef = useRef(null);

  // Handle clicking outside to close legend
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (legendRef.current && !legendRef.current.contains(event.target)) {
        setShowLegend(false);
      }
    };

    if (showLegend) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLegend]);

  const handleFilterChange = (type, checked) => {
    onNodeFilterChange({
      ...nodeFilter,
      [type]: checked
    });
  };

  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm text-gray-300">Show node types:</span>
      
      {/* Node type checkboxes with colors */}
      <div className="flex items-center space-x-3">
        {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => (
          <label key={type} className="flex items-center text-sm cursor-pointer group">
            <input
              type="checkbox"
              checked={nodeFilter[type]}
              onChange={(e) => handleFilterChange(type, e.target.checked)}
              className="sr-only"
            />
            <div className="relative flex items-center">
              {/* Custom checkbox with node color */}
              <div 
                className={`w-4 h-4 rounded border-2 transition-all duration-200 ${
                  nodeFilter[type] 
                    ? 'border-transparent' 
                    : 'border-gray-500 bg-gray-700'
                }`}
                style={{ 
                  backgroundColor: nodeFilter[type] ? config.color : 'transparent'
                }}
              >
                {nodeFilter[type] && (
                  <svg 
                    className="w-3 h-3 text-white absolute inset-0.5" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                )}
              </div>
              {/* Label with color indicator */}
              <span 
                className="ml-2 select-none transition-colors duration-200"
                style={{ 
                  color: nodeFilter[type] ? config.color : '#9ca3af'
                }}
              >
                {config.label}
              </span>
            </div>
          </label>
        ))}
      </div>

      {/* Info icon for legend */}
      <div className="relative" ref={legendRef}>
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="p-1 rounded-full hover:bg-gray-700 transition-colors duration-200"
          title="Show node type descriptions"
        >
          <InformationCircleIcon className="w-5 h-5 text-gray-400 hover:text-gray-300" />
        </button>

        {/* Legend popup */}
        {showLegend && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 rounded-lg border border-gray-600 shadow-xl z-50">
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-200 mb-3">Node Types</h4>
              
              <div className="space-y-3">
                {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => (
                  <div key={type} className="flex items-start space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: config.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-200">{config.label} Nodes</div>
                      <div className="text-xs text-gray-400 leading-relaxed">
                        {config.description}
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
          </div>
        )}
      </div>
    </div>
  );
};

export function DependencyGraphControls({
  projectPath,
  loading,
  isCheckingSize,
  showExternal,
  selectedLayout,
  nodeFilter,
  onAnalyze,
  onShowExternalChange,
  onLayoutChange,
  onNodeFilterChange,
  isPopupWindow = false
}) {
  // Detect if we're in a popup window (no window.electron access)
  const inPopup = !window.electron || isPopupWindow;

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      {/* Main Controls Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onAnalyze}
            disabled={loading || isCheckingSize || !projectPath || inPopup}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              inPopup 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title={inPopup ? 'Analysis must be performed from the main window' : 'Analyze project dependencies'}
          >
            {isCheckingSize ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Checking size...
              </>
            ) : loading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : inPopup ? (
              <>
                <InformationCircleIcon className="h-4 w-4 mr-2" />
                Analysis Disabled
              </>
            ) : (
              'Analyze Dependencies'
            )}
          </button>
          
          {/* Layout Selection */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-300">Layout:</label>
            <select
              value={selectedLayout}
              onChange={(e) => onLayoutChange(e.target.value)}
              className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="hierarchical">Hierarchical</option>
              <option value="circular">Circular</option>
              <option value="force">Force-directed</option>
              <option value="tree">Tree</option>
            </select>
          </div>

          {/* Show External Toggle */}
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={showExternal}
              onChange={(e) => onShowExternalChange(e.target.checked)}
              className="mr-2"
              disabled={loading}
            />
            Show external packages
          </label>
        </div>
      </div>

      {/* Info message for popup windows */}
      {inPopup && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-md p-3">
          <div className="flex items-start space-x-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">Read-only Mode</p>
              <p>This dependency graph is displaying pre-analyzed data. To perform a new analysis or refresh the data, please use the main project window.</p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Node Type Filters */}
      <div className="border-t border-gray-700 pt-4">
        <NodeTypeFilter 
          nodeFilter={nodeFilter}
          onNodeFilterChange={onNodeFilterChange}
        />
      </div>
    </div>
  );
}