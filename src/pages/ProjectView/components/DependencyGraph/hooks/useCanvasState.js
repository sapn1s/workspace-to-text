// src/pages/ProjectView/components/DependencyGraph/hooks/useCanvasState.js
import { useState, useRef, useCallback } from 'react';

export function useCanvasState(width, height, virtualScale) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Store highlighted node for search
  const highlightedNodeRef = useRef(null);
  const highlightTimeoutRef = useRef(null);
  const actualVirtualWidthRef = useRef(width * virtualScale);
  const animationFrameRef = useRef(null); // Add this to track animation

  // Animate pan and zoom
  const animateTo = useCallback((targetPan, targetZoom = zoom, onComplete = null) => {
    // Cancel any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const startPan = { ...pan };
    const startZoom = zoom;
    const startTime = Date.now();
    const duration = 1000; // 1 second animation
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease in out)
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;
      
      // Interpolate values
      const currentPan = {
        x: startPan.x + (targetPan.x - startPan.x) * eased,
        y: startPan.y + (targetPan.y - startPan.y) * eased
      };
      const currentZoom = startZoom + (targetZoom - startZoom) * eased;
      
      setPan(currentPan);
      setZoom(currentZoom);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
        if (onComplete) {
          onComplete();
        }
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [pan, zoom]);

  // Highlight a node temporarily
  const highlightNode = useCallback((nodeId, redrawCallback) => {
    // Clear previous highlight
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    
    highlightedNodeRef.current = nodeId;
    
    // Force redraw to show highlight
    if (redrawCallback) {
      redrawCallback();
    }
    
    // Remove highlight after 2 seconds
    highlightTimeoutRef.current = setTimeout(() => {
      highlightedNodeRef.current = null;
      // Force redraw to remove highlight
      if (redrawCallback) {
        redrawCallback();
      }
    }, 2000);
  }, []);

  // FIXED: Center on a specific node with proper virtual canvas handling
  const centerOnNode = useCallback((nodeId, nodePositions) => {
    if (!nodePositions) {
      console.warn('centerOnNode: No node positions provided');
      return;
    }
    
    const nodePosition = nodePositions.get(nodeId);
    if (!nodePosition) {
      console.warn(`centerOnNode: Node ${nodeId} not found in positions`);
      return;
    }
    
    console.log(`Centering on node ${nodeId}:`, {
      nodePosition,
      currentZoom: zoom,
      currentPan: pan,
      canvasSize: { width, height },
      virtualWidth: actualVirtualWidthRef.current
    });
    
    // Use the visible canvas dimensions (not virtual) for centering calculation
    const visibleCenterX = width / 2;
    const visibleCenterY = height / 2;
    
    // Calculate the target zoom level for better visibility
    // If we're very zoomed out, zoom in a bit to make the node more visible
    let targetZoom = zoom;
    if (zoom < 0.8) {
      targetZoom = 1.2; // Zoom in for better visibility
    } else if (zoom > 2) {
      targetZoom = 1.5; // Zoom out if too close
    } else {
      targetZoom = Math.max(1, zoom); // Ensure at least 1x zoom
    }
    
    // Calculate where the node currently appears on screen with the target zoom
    const nodeScreenX = (nodePosition.x * targetZoom) + pan.x;
    const nodeScreenY = (nodePosition.y * targetZoom) + pan.y;
    
    // Calculate how much we need to pan to center the node
    const panAdjustmentX = visibleCenterX - nodeScreenX;
    const panAdjustmentY = visibleCenterY - nodeScreenY;
    
    // Calculate the new pan position
    const newPan = {
      x: pan.x + panAdjustmentX,
      y: pan.y + panAdjustmentY
    };
    
    console.log('Centering calculation:', {
      visibleCenter: { x: visibleCenterX, y: visibleCenterY },
      nodeScreen: { x: nodeScreenX, y: nodeScreenY },
      panAdjustment: { x: panAdjustmentX, y: panAdjustmentY },
      newPan,
      targetZoom
    });
    
    // Animate to new position and zoom
    animateTo(newPan, targetZoom, () => {
      // Highlight the node after centering
      highlightNode(nodeId);
      console.log(`Successfully centered on node ${nodeId}`);
    });
  }, [width, height, zoom, pan, animateTo, highlightNode]);

  // FIXED: Improved fit to view function
  const fit = useCallback(() => {
    console.log('Fitting view to canvas');
    
    // Cancel any ongoing animation first
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // For fit, we want to reset to a reasonable default state
    // If we have a very wide virtual canvas, start from the left
    const shouldStartFromLeft = actualVirtualWidthRef.current > width * 2;
    
    const newPan = shouldStartFromLeft 
      ? { x: 0, y: 0 }  // Start from left for wide layouts
      : { x: (width - actualVirtualWidthRef.current) / 2, y: 0 }; // Center for normal layouts
    
    const newZoom = Math.min(1, width / actualVirtualWidthRef.current); // Ensure everything fits
    
    console.log('Fit calculation:', {
      virtualWidth: actualVirtualWidthRef.current,
      canvasWidth: width,
      newPan,
      newZoom,
      shouldStartFromLeft
    });
    
    animateTo(newPan, newZoom);
  }, [width, animateTo]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  return {
    // State
    selectedNode,
    hoveredNode,
    zoom,
    pan,
    isDragging,
    dragStart,
    highlightedNodeRef,
    actualVirtualWidthRef,
    
    // Setters
    setSelectedNode,
    setHoveredNode,
    setZoom,
    setPan,
    setIsDragging,
    setDragStart,
    
    // Methods
    animateTo,
    highlightNode,
    centerOnNode,
    fit,
    cleanup
  };
}