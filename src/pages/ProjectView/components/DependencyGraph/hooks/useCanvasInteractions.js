// src/pages/ProjectView/components/DependencyGraph/hooks/useCanvasInteractions.js
import { useEffect } from 'react';

export function useCanvasInteractions({
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
}) {
  useEffect(() => {
    if (!canvasRef.current || !processedDataRef.current || !nodePositionsRef.current) return;

    const canvas = canvasRef.current;
    const { categorizedNodes } = processedDataRef.current;
    const nodePositions = nodePositionsRef.current;

    const getMousePos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) - pan.x) / zoom,
        y: ((e.clientY - rect.top) - pan.y) / zoom
      };
    };

    const findNodeAtPosition = (mousePos) => {
      for (const node of categorizedNodes) {
        const pos = nodePositions.get(node.id);
        if (!pos) continue;
        
        const distance = Math.sqrt(
          (mousePos.x - pos.x) ** 2 + (mousePos.y - pos.y) ** 2
        );
        
        if (distance <= pos.radius) {
          return node;
        }
      }
      return null;
    };

    const handleMouseMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setPan(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }

      const mousePos = getMousePos(e);
      const foundNode = findNodeAtPosition(mousePos);

      setHoveredNode(foundNode);
      canvas.style.cursor = foundNode ? 'pointer' : isDragging ? 'grabbing' : 'grab';
    };

    const handleMouseDown = (e) => {
      const mousePos = getMousePos(e);
      const foundNode = findNodeAtPosition(mousePos);

      if (foundNode) {
        setSelectedNode(foundNode);
        // Notify parent component about node selection
        if (onNodeSelect) {
          onNodeSelect(foundNode);
        }
      } else {
        // REMOVED: setSelectedNode(null); - no longer deselect when clicking empty space
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      canvas.style.cursor = 'grab';
    };

    const handleWheel = (e) => {
      e.preventDefault();
      const mousePos = getMousePos(e);
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(3, zoom * zoomFactor));
      
      // Zoom towards mouse position
      const zoomPoint = {
        x: mousePos.x * zoom,
        y: mousePos.y * zoom
      };
      
      const newZoomPoint = {
        x: mousePos.x * newZoom,
        y: mousePos.y * newZoom
      };
      
      setPan(prev => ({
        x: prev.x + (zoomPoint.x - newZoomPoint.x),
        y: prev.y + (zoomPoint.y - newZoomPoint.y)
      }));
      
      setZoom(newZoom);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [
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
  ]);
}