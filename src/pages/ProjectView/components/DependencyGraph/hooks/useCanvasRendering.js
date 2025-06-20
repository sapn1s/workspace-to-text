// src/pages/ProjectView/components/DependencyGraph/hooks/useCanvasRendering.js
import { useEffect, useCallback, useRef } from 'react';
import { NodeRenderer } from '../utils/NodeRenderer';

export function useCanvasRendering({
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
  dataVersion // NEW: Add dataVersion parameter
}) {
  const nodeRenderer = useRef(new NodeRenderer());
  const animationRef = useRef({ frame: 0, animationId: null });
  const lastDataRef = useRef(null); // Track when data changes

  // Memoize the draw function with search highlighting support
  const draw = useCallback((ctx, categorizedNodes, filteredEdges, nodePositions, currentFrame) => {
    const virtualWidth = actualVirtualWidthRef.current;
    const scaledHeight = height * virtualScale;
    
    ctx.clearRect(0, 0, virtualWidth, scaledHeight);

    // Apply zoom and pan transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Update layout if using force-directed and still animating
    if (currentFrame < 300 && layout === 'force') {
      // Note: This would need the layoutEngine reference
      // layoutEngine.current.updateForceLayout(categorizedNodes, filteredEdges, nodePositions);
    }

    // Draw edges first (behind nodes)
    nodeRenderer.current.drawEdges(ctx, filteredEdges, nodePositions, {
      selectedNode,
      hoveredNode,
      highlightedNode: highlightedNodeRef.current
    });

    // Draw nodes with search highlighting
    nodeRenderer.current.drawNodes(ctx, categorizedNodes, nodePositions, {
      selectedNode,
      hoveredNode,
      highlightedNode: highlightedNodeRef.current,
      zoom
    });

    ctx.restore();
  }, [height, pan.x, pan.y, zoom, selectedNode, hoveredNode, layout, virtualScale, actualVirtualWidthRef, highlightedNodeRef]);

  // Force redraw function for external use
  const forceRedraw = useCallback(() => {
    if (!processedDataRef.current || !nodePositionsRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { categorizedNodes, filteredEdges } = processedDataRef.current;
    const nodePositions = nodePositionsRef.current;

    draw(ctx, categorizedNodes, filteredEdges, nodePositions, animationRef.current.frame);
  }, [draw, processedDataRef, nodePositionsRef, canvasRef]);

  // Main animation/rendering effect - triggers when data changes
  useEffect(() => {  
    if (!processedDataRef.current || !nodePositionsRef.current || !canvasRef.current) {
      console.log('🎨 Rendering skipped - missing data or canvas');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size with current virtual width
    const dpr = window.devicePixelRatio || 1;
    const virtualWidth = actualVirtualWidthRef.current;
    const effectiveScale = dpr / virtualScale;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(effectiveScale, effectiveScale);

    const { categorizedNodes, filteredEdges } = processedDataRef.current;
    const nodePositions = nodePositionsRef.current;

    // Check if this is new data (different from last render)
    const currentDataHash = `${categorizedNodes?.length || 0}-${filteredEdges?.length || 0}`;
    const isNewData = lastDataRef.current !== currentDataHash;
    lastDataRef.current = currentDataHash;

    if (isNewData) {
      // Reset animation frame for new data
      animationRef.current.frame = 0;
    }

    // Animation loop
    const animate = () => {
      const currentFrame = animationRef.current.frame;
      
      draw(ctx, categorizedNodes, filteredEdges, nodePositions, currentFrame);
      
      animationRef.current.frame++;
      
      // Continue animation if force layout is still running
      if (currentFrame < 300 && layout === 'force') {
        animationRef.current.animationId = requestAnimationFrame(animate);
      } else {
        animationRef.current.animationId = null;
      }
    };

    // Start animation
    animate();

    return () => {
      if (animationRef.current.animationId) {
        cancelAnimationFrame(animationRef.current.animationId);
        animationRef.current.animationId = null;
      }
    };
  }, [
    draw, 
    layout, 
    width, 
    height, 
    processedDataRef, 
    nodePositionsRef, 
    canvasRef, 
    actualVirtualWidthRef, 
    virtualScale,
    dataVersion // CRITICAL: Use dataVersion to trigger re-render when data changes
  ]);

  // Separate effect for handling zoom/pan updates (but not data changes)
  useEffect(() => {
    if (!processedDataRef.current || !nodePositionsRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { categorizedNodes, filteredEdges } = processedDataRef.current;
    const nodePositions = nodePositionsRef.current;

    // Immediate redraw for zoom/pan changes (only if not currently animating)
    if (!animationRef.current.animationId) {
      draw(ctx, categorizedNodes, filteredEdges, nodePositions, animationRef.current.frame);
    }
  }, [zoom, pan, draw, processedDataRef, nodePositionsRef, canvasRef]);

  return {
    forceRedraw,
    animationRef
  };
}

// src/pages/ProjectView/components/DependencyGraph/components/CanvasControls.js
import React from 'react';

export function CanvasControls({ 
  zoom, 
  setZoom, 
  setPan, 
  actualVirtualWidth, 
  width, 
  virtualScale 
}) {
  return (
    <>
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <button
          onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
          className="px-2 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
        >
          +
        </button>
        <span className="px-2 py-1 bg-gray-800 rounded text-xs text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
          className="px-2 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
        >
          -
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600"
        >
          Reset
        </button>
      </div>

      {/* Virtual Width Indicator */}
      {actualVirtualWidth > width * virtualScale * 1.5 && (
        <div className="absolute bottom-4 left-4 bg-gray-800 rounded-lg p-2 border border-gray-600 text-xs text-gray-300">
          Extended layout: {Math.round(actualVirtualWidth)}px wide
          <br />
          <span className="text-gray-500">Pan to explore →</span>
        </div>
      )}
    </>
  );
}