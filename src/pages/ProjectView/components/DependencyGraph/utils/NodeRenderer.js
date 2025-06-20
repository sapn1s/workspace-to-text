// Simplified NodeRenderer.js - nodes are properly spaced by LayoutEngine

export class NodeRenderer {
  constructor() {
    this.labelCache = new Map();
  }

  drawNodes(ctx, nodes, positions, options = {}) {
    const { selectedNode, hoveredNode, zoom = 1 } = options;
        
    nodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;
      
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;
      const isHighlighted = isSelected || isHovered;
      
      this.drawNode(ctx, node, pos, {
        isSelected,
        isHovered,
        isHighlighted,
        zoom
      });
    });
  }

  drawNode(ctx, node, pos, options = {}) {
    const { isSelected, isHovered, isHighlighted, zoom } = options;
    const { x, y, radius } = pos;
    
    ctx.save();
    
    // Draw glow effect for highlighted nodes
    if (isHighlighted) {
      this.drawGlow(ctx, x, y, radius, node.glowColor);
    }
    
    // Draw main node circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    
    // Fill
    ctx.fillStyle = node.color;
    ctx.fill();
    
    // Stroke
    ctx.strokeStyle = isSelected ? '#ffffff' : node.strokeColor;
    ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
    ctx.stroke();
    
    // Draw category indicator (small inner circle for config files)
    if (node.category === 'config') {
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    
    // Draw connection count indicator for hub nodes
    if (node.category === 'hub' && node.imports + node.importedBy > 10) {
      this.drawConnectionIndicator(ctx, x, y, radius, node.imports + node.importedBy);
    }
    
    // Draw label normally - no collision detection needed
    if (zoom > 0.5) {
      this.drawLabel(ctx, node, x, y, radius, zoom);
    }
    
    ctx.restore();
  }

  drawLabel(ctx, node, x, y, radius, zoom) {
    const fontSize = Math.max(10, 12 * zoom);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Add text shadow for better readability
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    // Truncate label if too long for better performance
    const label = this.truncateLabel(node.label || node.id, ctx, 120);
    ctx.fillText(label, x, y + radius + 5);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  truncateLabel(label, ctx, maxWidth) {
    const cacheKey = `${label}_${maxWidth}_${ctx.font}`;
    if (this.labelCache.has(cacheKey)) {
      return this.labelCache.get(cacheKey);
    }
    
    if (ctx.measureText(label).width <= maxWidth) {
      this.labelCache.set(cacheKey, label);
      return label;
    }
    
    let truncated = label;
    while (truncated.length > 1 && ctx.measureText(truncated + '...').width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    
    const result = truncated + '...';
    this.labelCache.set(cacheKey, result);
    return result;
  }

  drawGlow(ctx, x, y, radius, glowColor) {
    const gradient = ctx.createRadialGradient(x, y, radius, x, y, radius * 2.5);
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  drawConnectionIndicator(ctx, x, y, radius, connectionCount) {
    const indicatorRadius = 4;
    const indicatorX = x + radius * 0.7;
    const indicatorY = y - radius * 0.7;
    
    // Background circle
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, indicatorRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#1f2937';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Connection count text
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.min(connectionCount, 99), indicatorX, indicatorY);
  }

  drawEdges(ctx, edges, positions, options = {}) {
    const { selectedNode, hoveredNode } = options;
    
    // Group edges by connection strength for better visual hierarchy
    const edgeGroups = this.groupEdgesByStrength(edges);
    
    // Draw edges in order: weak -> strong (strong edges appear on top)
    Object.keys(edgeGroups).sort().forEach(strength => {
      edgeGroups[strength].forEach(edge => {
        this.drawEdge(ctx, edge, positions, {
          strength: parseInt(strength),
          isHighlighted: this.isEdgeHighlighted(edge, selectedNode, hoveredNode)
        });
      });
    });
  }

  drawEdge(ctx, edge, positions, options = {}) {
    const { strength = 1, isHighlighted = false } = options;
    const fromPos = positions.get(edge.from);
    const toPos = positions.get(edge.to);
    
    if (!fromPos || !toPos) return;
    
    // Calculate edge start/end points (edge of circles, not center)
    const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
    const startX = fromPos.x + fromPos.radius * Math.cos(angle);
    const startY = fromPos.y + fromPos.radius * Math.sin(angle);
    const endX = toPos.x - toPos.radius * Math.cos(angle);
    const endY = toPos.y - toPos.radius * Math.sin(angle);
    
    ctx.save();
    
    // Edge styling based on strength and highlight state
    const opacity = isHighlighted ? 0.8 : 0.4;
    const width = isHighlighted ? Math.max(2, strength) : Math.max(1, strength * 0.7);
    const color = isHighlighted ? '#60a5fa' : '#4b5563';
    
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = opacity;
    
    // Draw curved edge for better visual separation
    if (this.shouldDrawCurvedEdge(fromPos, toPos)) {
      this.drawCurvedEdge(ctx, startX, startY, endX, endY);
    } else {
      // Straight edge
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    
    // Draw arrowhead
    this.drawArrowhead(ctx, endX, endY, angle, width);
    
    ctx.restore();
  }

  shouldDrawCurvedEdge(fromPos, toPos) {
    const distance = Math.sqrt(
      (toPos.x - fromPos.x) ** 2 + (toPos.y - fromPos.y) ** 2
    );
    return distance > 100; // Use curves for longer edges
  }

  drawCurvedEdge(ctx, startX, startY, endX, endY) {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    // Calculate control point offset perpendicular to the edge
    const angle = Math.atan2(endY - startY, endX - startX);
    const perpAngle = angle + Math.PI / 2;
    const curvature = 20; // Adjust curvature strength
    
    const controlX = midX + curvature * Math.cos(perpAngle);
    const controlY = midY + curvature * Math.sin(perpAngle);
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.stroke();
  }

  drawArrowhead(ctx, x, y, angle, width) {
    const arrowLength = Math.max(8, width * 2);
    const arrowWidth = Math.max(4, width);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowLength, -arrowWidth);
    ctx.lineTo(-arrowLength, arrowWidth);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    ctx.restore();
  }

  groupEdgesByStrength(edges) {
    const groups = {};
    
    edges.forEach(edge => {
      // Calculate edge strength based on frequency (if available) or default to 1
      const strength = edge.weight || 1;
      const roundedStrength = Math.min(5, Math.max(1, Math.round(strength)));
      
      if (!groups[roundedStrength]) {
        groups[roundedStrength] = [];
      }
      groups[roundedStrength].push(edge);
    });
    
    return groups;
  }

  isEdgeHighlighted(edge, selectedNode, hoveredNode) {
    if (!selectedNode && !hoveredNode) return false;
    
    const targetNode = selectedNode || hoveredNode;
    return edge.from === targetNode.id || edge.to === targetNode.id;
  }
}