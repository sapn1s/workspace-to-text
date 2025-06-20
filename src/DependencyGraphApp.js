// src/DependencyGraphApp.js - Enhanced with colored node type selection and info legend
import React, { useState, useEffect, useRef } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { DependencyGraphCanvas } from './pages/ProjectView/components/DependencyGraph/components/DependencyGraphCanvas';
import { DependencyGraphStats } from './pages/ProjectView/components/DependencyGraph/components/DependencyGraphStats';
import { DependencyListPanels } from './pages/ProjectView/components/DependencyGraph/components/DependencyListPanels';
import { DependencyGraphSearch } from './pages/ProjectView/components/DependencyGraph/components/DependencyGraphSearch';
import DependencyGraphErrorBoundary from './components/common/DependencyGraphErrorBoundary';

// Node type configurations with colors
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

  return (
    <div className="flex items-center space-x-3">
      <span className="text-xs text-gray-300">Node types:</span>
      
      {/* Node type checkboxes with colors */}
      <div className="flex items-center space-x-2">
        {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => (
          <label key={type} className="flex items-center text-xs cursor-pointer group">
            <input
              type="checkbox"
              checked={nodeFilter[type]}
              onChange={(e) => onNodeFilterChange(type, e.target.checked)}
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
                className="ml-1.5 select-none transition-colors duration-200"
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
          <InformationCircleIcon className="w-4 h-4 text-gray-400 hover:text-gray-300" />
        </button>

        {/* Legend popup */}
        {showLegend && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 rounded-lg border border-gray-600 shadow-xl z-50">
            <div className="p-3">
              <h4 className="text-sm font-medium text-gray-200 mb-3">Node Types</h4>
              
              <div className="space-y-2">
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

export default function DependencyGraphApp() {
  const [projectData, setProjectData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [error, setError] = useState(null);
  const [showExternal, setShowExternal] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState('hierarchical');
  const [nodeFilter, setNodeFilter] = useState({
    hub: true,
    entry: true,
    bridge: true,
    leaf: true,
    config: true
  });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [sidePanelWidth, setSidePanelWidth] = useState(320);

  // Ref to access canvas methods
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Calculate responsive panel width based on window size
  useEffect(() => {
    const updateResponsiveLayout = () => {
      const windowWidth = window.innerWidth;
      
      if (windowWidth < 1024) {
        setSidePanelWidth(Math.max(250, windowWidth * 0.25));
      } else {
        setSidePanelWidth(320);
      }
    };

    updateResponsiveLayout();
    window.addEventListener('resize', updateResponsiveLayout);
    
    return () => window.removeEventListener('resize', updateResponsiveLayout);
  }, []);

  // Calculate canvas size based on available space
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const padding = 32;
        
        const availableWidth = containerRect.width - padding;
        const availableHeight = containerRect.height - padding;
        
        setCanvasSize({
          width: Math.max(300, availableWidth),
          height: Math.max(200, availableHeight)
        });
      }
    };

    let resizeObserver;
    
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        setTimeout(updateCanvasSize, 10);
      });
      resizeObserver.observe(containerRef.current);
    }

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [showSidePanel, sidePanelWidth]);

  // Additional effect to handle initial load after graphData is available
  useEffect(() => {
    if (graphData && containerRef.current) {
      setTimeout(() => {
        if (containerRef.current) {
          const container = containerRef.current;
          const containerRect = container.getBoundingClientRect();
          const padding = 32;
          const availableWidth = containerRect.width - padding;
          const availableHeight = containerRect.height - padding;
          
          setCanvasSize({
            width: Math.max(300, availableWidth),
            height: Math.max(200, availableHeight)
          });
        }
      }, 100);
    }
  }, [graphData]);

  // Parse URL parameters and dependency data
  useEffect(() => {
    let params;
    
    if (window.location.hash.includes('?')) {
      const hashParts = window.location.hash.split('?');
      params = new URLSearchParams(hashParts[1]);
    } else {
      params = new URLSearchParams(window.location.search);
    }
    
    const projectId = params.get('projectId');
    
    if (projectId) {
      const data = {
        projectId: parseInt(projectId),
        projectName: params.get('projectName') || 'Unknown Project',
        projectPath: params.get('projectPath') || '',
        excludePatterns: params.get('excludePatterns') || '',
        versionName: params.get('versionName') || 'Main'
      };
      
      setProjectData(data);
      document.title = `Dependency Graph - ${data.projectName} (${data.versionName})`;

      const dependencyDataStr = params.get('dependencyData');
      if (dependencyDataStr) {
        try {
          const decodedData = decodeURIComponent(atob(dependencyDataStr));
          const dependencyData = JSON.parse(decodedData);
          setGraphData(dependencyData);
        } catch (error) {
          console.error('Error parsing dependency data:', error);
          setError('Failed to parse dependency data from URL');
        }
      }
    } else {
      setError('No project data found in URL parameters');
    }
  }, []);

  const handleNodeSelect = (node) => {
    if (canvasRef.current && node.id) {
      canvasRef.current.centerOnNode(node.id);
      canvasRef.current.selectNodeSilently(node.id);
    }
  };

  const handleFitToView = () => {
    if (canvasRef.current) {
      canvasRef.current.fit();
    }
  };

  const handleDeselectNode = () => {
    if (canvasRef.current) {
      canvasRef.current.deselectNode();
    }
  };

  // FIXED: Create a new object when updating nodeFilter to ensure re-render
  const handleNodeFilterChange = (type, checked) => {
    console.log(`Toggling node filter: ${type} = ${checked}`);
    
    setNodeFilter(prevFilter => {
      const newFilter = {
        ...prevFilter,
        [type]: checked
      };
      
      console.log('Updated node filter:', newFilter);
      return newFilter;
    });
  };

  const stats = graphData ? {
    internal: graphData.stats?.internalDeps || 0,
    external: graphData.stats?.externalDeps || 0,
    unresolved: graphData.stats?.unresolvedDeps || 0,
    totalFiles: graphData.stats?.totalFiles || 0
  } : null;

  if (!projectData) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dependency graph...</p>
          <p className="text-sm text-gray-500 mt-2">
            If this persists, the window may have been opened incorrectly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DependencyGraphErrorBoundary>
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="flex-none bg-gray-800 border-b border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-lg font-bold text-gray-100">
                  {projectData.projectName} - Dependencies
                </h1>
                <div className="text-xs text-gray-400">
                  {projectData.versionName} • {projectData.projectPath}
                </div>
              </div>
              
              {/* Compact Stats */}
              {stats && (
                <div className="flex items-center space-x-4 text-xs">
                  <span className="text-blue-400">{stats.totalFiles} files</span>
                  <span className="text-green-400">{stats.internal} internal</span>
                  <span className="text-purple-400">{stats.external} external</span>
                  {stats.unresolved > 0 && (
                    <span className="text-red-400">{stats.unresolved} unresolved</span>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={() => window.close()}
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className="flex-none bg-gray-800 border-b border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Left: Search and Quick Actions */}
            <div className="flex items-center space-x-3 min-w-0">
              {graphData && (
                <div className="min-w-0 flex-shrink">
                  <DependencyGraphSearch
                    graphData={graphData.graph}
                    onNodeSelect={handleNodeSelect}
                    showExternal={showExternal}
                  />
                </div>
              )}
              
              <button
                onClick={handleFitToView}
                className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 text-xs whitespace-nowrap"
              >
                Fit View
              </button>
              
              <button
                onClick={handleDeselectNode}
                className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 text-xs whitespace-nowrap"
              >
                Deselect
              </button>
            </div>

            {/* Center: Layout and Filters */}
            <div className="flex items-center space-x-4 flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-300">Layout:</label>
                <select
                  value={selectedLayout}
                  onChange={(e) => setSelectedLayout(e.target.value)}
                  className="bg-gray-700 text-gray-200 text-xs rounded px-2 py-1.5"
                >
                  <option value="hierarchical">Hierarchical</option>
                  <option value="circular">Circular</option>
                  <option value="force">Force</option>
                  <option value="tree">Tree</option>
                </select>
              </div>

              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={showExternal}
                  onChange={(e) => setShowExternal(e.target.checked)}
                  className="mr-1.5"
                />
                External packages
              </label>

              {/* Enhanced Node Type Filter */}
              <NodeTypeFilter 
                nodeFilter={nodeFilter}
                onNodeFilterChange={handleNodeFilterChange}
              />
            </div>

            {/* Right: Panel Toggle */}
            <button
              onClick={() => setShowSidePanel(!showSidePanel)}
              className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 text-xs whitespace-nowrap"
            >
              {showSidePanel ? 'Hide Panel' : 'Show Panel'}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas Area */}
          <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
            {error && (
              <div className="flex-none mb-4 mx-4 mt-4 bg-red-900/20 border border-red-700 rounded-md p-3">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {graphData && (
              <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                <div style={{ width: canvasSize.width, height: canvasSize.height }}>
                  <DependencyGraphCanvas 
                    ref={canvasRef}
                    data={graphData.graph} 
                    showExternal={showExternal}
                    layout={selectedLayout}
                    nodeFilter={nodeFilter}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    onNodeSelect={handleNodeSelect}
                  />
                </div>
              </div>
            )}

            {!graphData && !error && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-400 mb-2">No dependency data available</p>
                  <p className="text-sm text-yellow-400">
                    Please ensure the dependency analysis was completed in the main window.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Responsive Side Panel */}
          {showSidePanel && (
            <div 
              className="flex-none bg-gray-800 border-l border-gray-700 flex flex-col"
              style={{ width: sidePanelWidth }}
            >
              {/* Panel Header */}
              <div className="flex-none p-3 border-b border-gray-700">
                <h3 className="text-sm font-medium text-gray-200">Analysis Details</h3>
              </div>
              
              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto">
                {graphData && (
                  <DependencyListPanels 
                    graphData={graphData}
                    showExternal={showExternal}
                    onNodeSelect={handleNodeSelect}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none bg-gray-800 border-t border-gray-700 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2">
            <span>
              {graphData ? `${graphData.graph?.nodes?.length || 0} nodes, ${graphData.graph?.edges?.length || 0} edges` : 'No data'}
            </span>
            <span className="flex items-center space-x-4">
              <span>Canvas: {canvasSize.width}×{canvasSize.height}</span>
              <span className="hidden sm:inline">Panel: {showSidePanel ? sidePanelWidth + 'px' : 'hidden'}</span>
              <span className="hidden md:inline">Read-only view • Refresh analysis from main window</span>
            </span>
          </div>
        </div>
      </div>
    </DependencyGraphErrorBoundary>
  );
}