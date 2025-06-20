// Debug LayoutEngine.js - Let's see what's happening

export class LayoutEngine {
  constructor() {
    this.tempCanvas = null;
    this.tempCtx = null;
  }

  // Get a temporary canvas context for measuring text
  getTempContext() {
    if (!this.tempCanvas) {
      this.tempCanvas = document.createElement('canvas');
      this.tempCtx = this.tempCanvas.getContext('2d');
    }
    return this.tempCtx;
  }

  // Calculate label width for a node
  getLabelWidth(node, fontSize = 12) {
    const ctx = this.getTempContext();
    ctx.font = `${fontSize}px sans-serif`;
    const label = node.label || node.id || '';
    const width = ctx.measureText(label).width;
    return width;
  }

  calculateLayout(nodes, edges, options) {
    const { width, height, layout } = options;
    switch (layout) {
      case 'hierarchical':
        return this.hierarchicalLayoutWithDebug(nodes, edges, width, height);
      case 'circular':
        return this.circularLayoutWithLabels(nodes, edges, width, height);
      case 'tree':
        return this.treeLayoutWithLabels(nodes, edges, width, height);
      case 'force':
      default:
        return this.forceLayoutWithLabels(nodes, edges, width, height);
    }
  }

  hierarchicalLayoutWithDebug(nodes, edges, width, height) {
    const positions = new Map();
    const layers = this.calculateDepthLayers(nodes, edges);
    const maxLayer = Math.max(...Object.keys(layers).map(Number));


    const layerHeight = height / (maxLayer + 2);
    const margin = 50;

    Object.entries(layers).forEach(([depth, layerNodes]) => {
      const y = margin + (parseInt(depth) + 1) * layerHeight;

      if (layerNodes.length === 1) {
        // Single node - center it
        const x = width / 2;
        positions.set(layerNodes[0].id, {
          x, y,
          radius: layerNodes[0].radius || 20,
          vx: 0, vy: 0
        });
      } else {
        // Multiple nodes - calculate spacing with labels     
        // Calculate label widths
        const nodeData = layerNodes.map(node => {
          const labelWidth = this.getLabelWidth(node);
          return { node, labelWidth };
        });

        // Calculate total required width
        let totalRequiredWidth = 0;
        for (let i = 0; i < nodeData.length; i++) {
          const current = nodeData[i];
          totalRequiredWidth += current.labelWidth + 40; // Label + padding
        }

        const availableWidth = width - 2 * margin;

        if (totalRequiredWidth > availableWidth) {
          // Use proper label-aware spacing even if it goes beyond canvas
          let currentX = margin;
          const extraSpace = 20; // Minimum extra space between labels

          nodeData.forEach(({ node, labelWidth }, index) => {
            currentX += labelWidth / 2; // Move to center of label area
            positions.set(node.id, {
              x: currentX, y,
              radius: node.radius || 20,
              vx: 0, vy: 0
            });
            currentX += labelWidth / 2 + 40 + extraSpace; // Move past label + padding
          });
        } else {
          // Use label-aware spacing
          let currentX = margin;
          const extraSpace = (availableWidth - totalRequiredWidth) / (layerNodes.length + 1);
          currentX += extraSpace;

          nodeData.forEach(({ node, labelWidth }, index) => {
            currentX += labelWidth / 2; // Move to center of label area
            positions.set(node.id, {
              x: currentX, y,
              radius: node.radius || 20,
              vx: 0, vy: 0
            });
            currentX += labelWidth / 2 + 40 + extraSpace; // Move past label + padding
          });
        }
      }
    });

    positions.forEach((pos, nodeId) => {
      const node = nodes.find(n => n.id === nodeId);
    });

    return positions;
  }

  // Keep all the original methods for non-hierarchical layouts
  circularLayoutWithLabels(nodes, edges, width, height) {
    const positions = new Map();
    const centerX = width / 2;
    const centerY = height / 2;

    const sortedNodes = [...nodes].sort((a, b) => b.importance - a.importance);
    const rings = this.createRings(sortedNodes);
    const maxRadius = Math.min(width, height) / 2 - 150; // More margin for labels

    rings.forEach((ring, ringIndex) => {
      const radius = ringIndex === 0 ? 0 : (maxRadius / rings.length) * (ringIndex + 1);
      if (ring.length === 1) {
        // Single node in center
        positions.set(ring[0].id, {
          x: centerX,
          y: centerY,
          radius: ring[0].radius || 20,
          vx: 0, vy: 0
        });
      } else {
        // Calculate required circumference for all labels
        let totalRequiredArc = 0;
        ring.forEach(node => {
          const labelWidth = this.getLabelWidth(node);
          const nodeWidth = (node.radius || 20) * 2;
          const requiredWidth = Math.max(labelWidth + 30, nodeWidth + 20);
          totalRequiredArc += requiredWidth / Math.max(radius, 1); // Convert to radians
        });

        const availableCircumference = 2 * Math.PI;
        if (totalRequiredArc > availableCircumference && radius > 0) {
          // Need larger radius for proper spacing
          const newRadius = totalRequiredArc / (2 * Math.PI) * Math.max(radius, 100);

          let currentAngle = 0;
          ring.forEach((node, nodeIndex) => {
            const labelWidth = this.getLabelWidth(node);
            const requiredWidth = Math.max(labelWidth + 30, (node.radius || 20) * 2 + 20);
            const angleStep = requiredWidth / newRadius;

            const x = centerX + newRadius * Math.cos(currentAngle);
            const y = centerY + newRadius * Math.sin(currentAngle);

            positions.set(node.id, {
              x, y,
              radius: node.radius || 20,
              vx: 0, vy: 0
            });

            currentAngle += angleStep;
          });
        } else {
          // Normal spacing
          const angleStep = ring.length > 1 ? (2 * Math.PI) / ring.length : 0;
          ring.forEach((node, nodeIndex) => {
            const angle = nodeIndex * angleStep;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            positions.set(node.id, {
              x, y,
              radius: node.radius || 20,
              vx: 0, vy: 0
            });
          });
        }
      }
    });

    return positions;
  }

  treeLayoutWithLabels(nodes, edges, width, height) {
    const positions = new Map();
    const roots = this.findRootNodes(nodes, edges);

    if (roots.length === 0) {
      return this.hierarchicalLayoutWithDebug(nodes, edges, width, height);
    }

    // Calculate required width for each tree
    let totalRequiredWidth = 0;
    const treeWidths = [];

    roots.forEach(root => {
      const tree = this.buildTree(root, nodes, edges);
      const requiredWidth = this.calculateTreeRequiredWidth(tree);
      treeWidths.push(requiredWidth);
      totalRequiredWidth += requiredWidth;
    });

    // Determine if we need to expand beyond canvas width
    const availableWidth = width - 100; // Margins
    let scale = 1;
    let actualWidth = width;

    if (totalRequiredWidth > availableWidth) {
      actualWidth = totalRequiredWidth + 100; // Add margins
    } else {
      scale = availableWidth / totalRequiredWidth;
    }

    // Position each tree
    let currentX = 50;
    roots.forEach((root, rootIndex) => {
      const treeWidth = treeWidths[rootIndex] * scale;
      const rootX = currentX + treeWidth / 2;
      const tree = this.buildTree(root, nodes, edges);
      this.layoutTreeWithLabels(tree, positions, rootX, 50, treeWidth, height - 100);

      currentX += treeWidth + 20; // Space between trees
    });

    return positions;
  }

  calculateTreeRequiredWidth(tree) {
    if (!tree.children || tree.children.length === 0) {
      return this.getLabelWidth(tree.node) + 40;
    }

    // Calculate width needed for this level
    const nodeWidth = this.getLabelWidth(tree.node) + 40;

    // Calculate width needed for children
    let childrenWidth = 0;
    tree.children.forEach(child => {
      childrenWidth += this.calculateTreeRequiredWidth(child);
    });

    return Math.max(nodeWidth, childrenWidth);
  }

  layoutTreeWithLabels(tree, positions, x, y, width, height) {
    const treeHeight = this.calculateTreeHeight(tree);
    const levelHeight = height / (treeHeight + 1);

    this.layoutTreeLevelWithLabels(tree, positions, x, y, width, levelHeight, 0);
  }

  layoutTreeLevelWithLabels(tree, positions, centerX, y, width, levelHeight, level) {
    // Position current node
    positions.set(tree.node.id, {
      x: centerX,
      y: y + level * levelHeight,
      radius: tree.node.radius || 20,
      vx: 0, vy: 0
    });

    // Position children with label-aware spacing
    if (tree.children.length > 0) {
      // Calculate required width for all children
      const childData = tree.children.map(child => ({
        child,
        requiredWidth: this.calculateTreeRequiredWidth(child)
      }));

      const totalChildWidth = childData.reduce((sum, data) => sum + data.requiredWidth, 0);

      if (totalChildWidth > width) {
        // Expand if necessary
        let currentChildX = centerX - totalChildWidth / 2;

        childData.forEach(({ child, requiredWidth }) => {
          const childCenterX = currentChildX + requiredWidth / 2;
          this.layoutTreeLevelWithLabels(child, positions, childCenterX, y, requiredWidth, levelHeight, level + 1);
          currentChildX += requiredWidth + 20;
        });
      } else {
        // Normal distribution
        const childSpacing = width / tree.children.length;
        tree.children.forEach((child, index) => {
          const childX = centerX - width / 2 + (index + 0.5) * childSpacing;
          this.layoutTreeLevelWithLabels(child, positions, childX, y, childSpacing, levelHeight, level + 1);
        });
      }
    }
  }

  forceLayoutWithLabels(nodes, edges, width, height) {
    const positions = new Map();
    const margin = 50;

    // Calculate a good grid for initial placement considering labels
    const avgLabelWidth = nodes.reduce((sum, node) => sum + this.getLabelWidth(node), 0) / nodes.length;
    const minSpacing = Math.max(80, avgLabelWidth + 40);

    // Calculate grid dimensions
    const effectiveWidth = Math.max(width - 2 * margin, nodes.length * minSpacing);
    const cols = Math.max(1, Math.floor(effectiveWidth / minSpacing));
    const rows = Math.ceil(nodes.length / cols);
    const cellWidth = effectiveWidth / cols;
    const cellHeight = (height - 2 * margin) / rows;

    // Initialize with grid-based positions
    nodes.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const baseX = margin + col * cellWidth + cellWidth / 2;
      const baseY = margin + row * cellHeight + cellHeight / 2;

      // Add some randomness within the cell
      const randomX = (Math.random() - 0.5) * Math.min(cellWidth * 0.3, 30);
      const randomY = (Math.random() - 0.5) * Math.min(cellHeight * 0.3, 30);

      positions.set(node.id, {
        x: baseX + randomX,
        y: baseY + randomY,
        radius: node.radius || 20,
        vx: 0,
        vy: 0
      });
    });

    return positions;
  }

  updateForceLayout(nodes, edges, positions) {
    const repulsionStrength = 1800;
    const attractionStrength = 0.01;
    const damping = 0.85;
    const minDistance = 80;

    // Reset velocities
    nodes.forEach(node => {
      const pos = positions.get(node.id);
      if (pos) {
        pos.vx *= damping;
        pos.vy *= damping;
      }
    });

    // Repulsion between all nodes
    nodes.forEach(nodeA => {
      const posA = positions.get(nodeA.id);
      if (!posA) return;

      nodes.forEach(nodeB => {
        if (nodeA.id === nodeB.id) return;
        const posB = positions.get(nodeB.id);
        if (!posB) return;

        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        if (distance < minDistance + posA.radius + posB.radius) {
          const force = repulsionStrength / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          posA.vx += fx;
          posA.vy += fy;
        }
      });
    });

    // Attraction along edges
    edges.forEach(edge => {
      const posFrom = positions.get(edge.from);
      const posTo = positions.get(edge.to);

      if (posFrom && posTo) {
        const dx = posTo.x - posFrom.x;
        const dy = posTo.y - posFrom.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDistance = 120 + posFrom.radius + posTo.radius;

        const force = (distance - targetDistance) * attractionStrength;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        posFrom.vx += fx;
        posFrom.vy += fy;
        posTo.vx -= fx;
        posTo.vy -= fy;
      }
    });

    // Update positions and apply boundaries
    nodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;

      pos.x += pos.vx;
      pos.y += pos.vy;

      // Keep nodes within bounds
      const margin = pos.radius + 10;
      pos.x = Math.max(margin, Math.min(1000 - margin, pos.x));
      pos.y = Math.max(margin, Math.min(650 - margin, pos.y));
    });
  }

  calculateDepthLayers(nodes, edges) {
    const layers = {};
    const visited = new Set();
    const depths = new Map();

    // Find root nodes (nodes with no incoming edges)
    const roots = nodes.filter(node =>
      !edges.some(edge => edge.to === node.id)
    );

    // If no roots found, pick nodes with highest outgoing connections
    if (roots.length === 0) {
      const outgoingCounts = nodes.map(node => ({
        node,
        count: edges.filter(e => e.from === node.id).length
      }));
      outgoingCounts.sort((a, b) => b.count - a.count);
      roots.push(outgoingCounts[0]?.node);
    }

    // BFS to assign depths
    const queue = roots.map(node => ({ node, depth: 0 }));
    roots.forEach(node => {
      depths.set(node.id, 0);
      visited.add(node.id);
    });

    while (queue.length > 0) {
      const { node, depth } = queue.shift();

      if (!layers[depth]) layers[depth] = [];
      layers[depth].push(node);

      // Find children
      edges.filter(e => e.from === node.id).forEach(edge => {
        const child = nodes.find(n => n.id === edge.to);
        if (child && !visited.has(child.id)) {
          visited.add(child.id);
          depths.set(child.id, depth + 1);
          queue.push({ node: child, depth: depth + 1 });
        }
      });
    }

    // Handle unvisited nodes (cycles or disconnected components)
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const maxDepth = Math.max(...Object.keys(layers).map(Number), -1);
        const newDepth = maxDepth + 1;
        if (!layers[newDepth]) layers[newDepth] = [];
        layers[newDepth].push(node);
      }
    });

    return layers;
  }

  createRings(nodes) {
    const rings = [];
    const nodesPerRing = [1, 6, 12, 18, 24]; // Fibonacci-like progression
    let nodeIndex = 0;

    for (let ringIndex = 0; ringIndex < 5 && nodeIndex < nodes.length; ringIndex++) {
      const ringSize = Math.min(nodesPerRing[ringIndex], nodes.length - nodeIndex);
      rings.push(nodes.slice(nodeIndex, nodeIndex + ringSize));
      nodeIndex += ringSize;
    }

    // Put remaining nodes in the last ring
    if (nodeIndex < nodes.length) {
      rings[rings.length - 1].push(...nodes.slice(nodeIndex));
    }

    return rings;
  }

  findRootNodes(nodes, edges) {
    return nodes.filter(node =>
      !edges.some(edge => edge.to === node.id) &&
      edges.some(edge => edge.from === node.id)
    );
  }

  buildTree(root, nodes, edges) {
    const tree = { node: root, children: [] };
    const visited = new Set([root.id]);

    const buildSubtree = (parentTree) => {
      const children = edges
        .filter(e => e.from === parentTree.node.id)
        .map(e => nodes.find(n => n.id === e.to))
        .filter(child => child && !visited.has(child.id));

      children.forEach(child => {
        visited.add(child.id);
        const childTree = { node: child, children: [] };
        parentTree.children.push(childTree);
        buildSubtree(childTree);
      });
    };

    buildSubtree(tree);
    return tree;
  }

  layoutTree(tree, positions, x, y, width, height) {
    const treeHeight = this.calculateTreeHeight(tree);
    const levelHeight = height / (treeHeight + 1);

    this.layoutTreeLevel(tree, positions, x, y, width, levelHeight, 0);
  }

  layoutTreeLevel(tree, positions, centerX, y, width, levelHeight, level) {
    // Position current node
    positions.set(tree.node.id, {
      x: centerX,
      y: y + level * levelHeight,
      radius: tree.node.radius,
      vx: 0,
      vy: 0
    });

    // Position children
    if (tree.children.length > 0) {
      const childWidth = width / tree.children.length;
      tree.children.forEach((child, index) => {
        const childX = centerX - width / 2 + (index + 0.5) * childWidth;
        this.layoutTreeLevel(child, positions, childX, y, childWidth, levelHeight, level + 1);
      });
    }
  }

  calculateTreeHeight(tree) {
    if (tree.children.length === 0) return 0;
    return 1 + Math.max(...tree.children.map(child => this.calculateTreeHeight(child)));
  }
}