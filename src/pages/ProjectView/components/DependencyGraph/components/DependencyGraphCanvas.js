import React, { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useCanvasState } from '../hooks/useCanvasState';
import { useCanvasDataProcessing } from '../hooks/useCanvasDataProcessing';
import { CanvasControls, useCanvasRendering } from '../hooks/useCanvasRendering';
import { useCanvasInteractions } from '../hooks/useCanvasInteractions';
import { NodeInfoPanel } from './NodeInfoPanel';

const DependencyGraphCanvas = forwardRef(({ 
  data, 
  showExternal, 
  layout, 
  nodeFilter, 
  width = 1000, 
  height = 650,
  virtualScale = 1,
  onNodeSelect
}, ref) => {
  const canvasRef = useRef(null);

  // Canvas state management
  const {
    selectedNode,
    hoveredNode,
    zoom,
    pan,
    isDragging,
    dragStart,
    highlightedNodeRef,
    actualVirtualWidthRef,
    setSelectedNode,
    setHoveredNode,
    setZoom,
    setPan,
    setIsDragging,
    setDragStart,
    animateTo,
    highlightNode,
    centerOnNode,
    fit,
    cleanup
  } = useCanvasState(width, height, virtualScale);

  // Data processing and layout calculation
  const {
    processedDataRef,
    nodePositionsRef,
    layoutEngine,
    nodeCategorizer,
    dataVersion // Get the dataVersion to force re-renders
  } = useCanvasDataProcessing({
    data,
    showExternal,
    layout,
    nodeFilter,
    width,
    height,
    virtualScale,
    actualVirtualWidthRef,
    setPan
  });

  // Rendering management - NOW DEPENDS ON dataVersion
  const { forceRedraw } = useCanvasRendering({
    canvasRef,
    processedDataRef,
    nodePositionsRef,
    width,
    height,
    virtualScale,
    actualVirtualWidthRef,
    zoom,
    pan,
    selectedNode,
    hoveredNode,
    highlightedNodeRef,
    layout,
    dataVersion // Add this dependency to trigger re-renders when data changes
  });

  // Mouse interactions
  useCanvasInteractions({
    canvasRef,
    processedDataRef,
    nodePositionsRef,
    zoom,
    pan,
    isDragging,
    dragStart,
    setHoveredNode,
    setSelectedNode,
    setIsDragging,
    setDragStart,
    setPan,
    setZoom,
    onNodeSelect
  });

  // Method to deselect node
  const deselectNode = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Method to select node silently (without triggering onNodeSelect callback)
  const selectNodeSilently = useCallback((nodeId) => {
    if (!processedDataRef.current?.categorizedNodes) return;
    
    const node = processedDataRef.current.categorizedNodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
    }
  }, [setSelectedNode]);

  // Method to center on node
  const centerOnNodeMethod = useCallback((nodeId) => {
    centerOnNode(nodeId, nodePositionsRef.current);
  }, [centerOnNode]);

  // Method to highlight node
  const highlightNodeMethod = useCallback((nodeId) => {
    highlightNode(nodeId, forceRedraw);
  }, [highlightNode, forceRedraw]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    centerOnNode: centerOnNodeMethod,
    fit: fit,
    getSelectedNode: () => selectedNode,
    highlightNode: highlightNodeMethod,
    selectNodeSilently: selectNodeSilently,
    deselectNode: deselectNode
  }), [centerOnNodeMethod, fit, selectedNode, highlightNodeMethod, selectNodeSilently, deselectNode]);

  // Cleanup on unmount
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border border-gray-600 rounded-lg"
        style={{ backgroundColor: '#111827' }}
      />
      
      <NodeInfoPanel 
        node={selectedNode || hoveredNode} 
        onDeselect={deselectNode}
        showDeselect={!!selectedNode} // Only show deselect button when a node is selected (not just hovered)
      />
      
      <CanvasControls
        zoom={zoom}
        setZoom={setZoom}
        setPan={setPan}
        actualVirtualWidth={actualVirtualWidthRef.current}
        width={width}
        virtualScale={virtualScale}
      />
    </div>
  );
});

DependencyGraphCanvas.displayName = 'DependencyGraphCanvas';

export { DependencyGraphCanvas };