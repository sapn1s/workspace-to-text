// src/pages/ProjectView/components/DependencyGraph/hooks/useCanvasDataProcessing.js
import { useEffect, useCallback, useRef, useState } from 'react';
import { LayoutEngine } from '../utils/LayoutEngine';
import { NodeCategorizer } from '../utils/NodeCategorizer';

export function useCanvasDataProcessing({
  data,
  showExternal,
  layout,
  nodeFilter,
  width,
  height,
  virtualScale,
  actualVirtualWidthRef,
  setPan
}) {
  const layoutEngine = useRef(new LayoutEngine());
  const nodeCategorizer = useRef(new NodeCategorizer());
  const processedDataRef = useRef(null);
  const nodePositionsRef = useRef(null);

  // Calculate dynamic virtual width based on layout requirements
  const calculateRequiredWidth = useCallback((categorizedNodes) => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = '12px sans-serif';

    let maxRequiredWidth = width;

    if (layout === 'hierarchical') {
      // Group nodes by layers (simplified estimation)
      const nodesByApproxLayer = {};
      categorizedNodes.forEach((node, index) => {
        const layer = Math.floor(index / 8);
        if (!nodesByApproxLayer[layer]) nodesByApproxLayer[layer] = [];
        nodesByApproxLayer[layer].push(node);
      });

      Object.values(nodesByApproxLayer).forEach(layerNodes => {
        let layerWidth = 100; // Margins
        layerNodes.forEach(node => {
          const labelWidth = tempCtx.measureText(node.label || node.id).width;
          layerWidth += labelWidth + 60; // Label + padding
        });
        maxRequiredWidth = Math.max(maxRequiredWidth, layerWidth);
      });
    } else if (layout === 'tree') {
      const avgLabelWidth = categorizedNodes.reduce((sum, node) => {
        return sum + tempCtx.measureText(node.label || node.id).width;
      }, 0) / categorizedNodes.length;
      
      const estimatedWidth = Math.sqrt(categorizedNodes.length) * (avgLabelWidth + 60);
      maxRequiredWidth = Math.max(maxRequiredWidth, estimatedWidth);
    } else if (layout === 'circular') {
      const totalLabelWidth = categorizedNodes.reduce((sum, node) => {
        return sum + tempCtx.measureText(node.label || node.id).width + 30;
      }, 0);
      
      const requiredRadius = totalLabelWidth / (2 * Math.PI);
      const requiredDiameter = requiredRadius * 2 + 200;
      maxRequiredWidth = Math.max(maxRequiredWidth, requiredDiameter);
    } else { // force layout
      const avgLabelWidth = categorizedNodes.reduce((sum, node) => {
        return sum + tempCtx.measureText(node.label || node.id).width;
      }, 0) / categorizedNodes.length;
      
      const minSpacing = Math.max(80, avgLabelWidth + 40);
      const cols = Math.max(1, Math.floor(width / minSpacing));
      const requiredCols = Math.ceil(categorizedNodes.length / 8);
      const estimatedWidth = requiredCols * minSpacing + 100;
      maxRequiredWidth = Math.max(maxRequiredWidth, estimatedWidth);
    }

    const calculatedWidth = Math.max(width * virtualScale, maxRequiredWidth + 200);
    return calculatedWidth;
  }, [layout, width, virtualScale]);

  // Add a state variable to force re-renders when data changes
  const [dataVersion, setDataVersion] = useState(0);

  // Process data when it changes
  useEffect(() => {
    if (!data) {
      processedDataRef.current = null;
      nodePositionsRef.current = null;
      actualVirtualWidthRef.current = width * virtualScale;
      setDataVersion(prev => prev + 1); // Force re-render
      return;
    }

    // DEBUG: Log all node types before filtering
    const nodeTypeStats = {};
    data.nodes.forEach(node => {
      const category = nodeCategorizer.current.categorizeNode(node, data);
      nodeTypeStats[category] = (nodeTypeStats[category] || 0) + 1;
    });

    // Filter data based on showExternal and nodeFilter
    const filteredNodes = data.nodes.filter(node => {
      // External filter
      if (node.type === 'external' && !showExternal) {
        return false;
      }
      
      // Node type filter
      const category = nodeCategorizer.current.categorizeNode(node, data);
      const shouldInclude = nodeFilter[category];
      
      return shouldInclude;
    });
    
    // Filter edges to only include those between visible nodes
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = data.edges.filter(edge => {
      const fromIncluded = filteredNodeIds.has(edge.from);
      const toIncluded = filteredNodeIds.has(edge.to);
      return fromIncluded && toIncluded;
    });

    // Categorize nodes and calculate layout
    const categorizedNodes = filteredNodes.map(node => ({
      ...node,
      category: nodeCategorizer.current.categorizeNode(node, data),
      ...nodeCategorizer.current.getNodeProperties(node, data)
    }));

    // Calculate required virtual width
    const requiredWidth = calculateRequiredWidth(categorizedNodes);
    actualVirtualWidthRef.current = requiredWidth;

    // Use calculated virtual dimensions for layout
    const layoutDimensions = { 
      width: requiredWidth, 
      height: height * virtualScale, 
      layout 
    };

    const nodePositions = layoutEngine.current.calculateLayout(
      categorizedNodes,
      filteredEdges,
      layoutDimensions
    );

    processedDataRef.current = { categorizedNodes, filteredEdges };
    nodePositionsRef.current = nodePositions;

    // Reset pan to show the start of the graph when layout changes significantly
    if (layout === 'hierarchical' && requiredWidth > width * 2) {
      setPan({ x: 0, y: 0 });
    }

    // Increment data version to force re-render
    setDataVersion(prev => prev + 1);
  }, [data, showExternal, layout, nodeFilter, width, height, virtualScale, calculateRequiredWidth, actualVirtualWidthRef, setPan]);

  return {
    processedDataRef,
    nodePositionsRef,
    layoutEngine,
    nodeCategorizer,
    dataVersion // Export dataVersion so rendering can depend on it
  };
}