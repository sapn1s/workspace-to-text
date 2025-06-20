// src/pages/ProjectView/components/DependencyGraph/utils/NodeCategorizer.js

export class NodeCategorizer {
  categorizeNode(node, graph) {
    const incoming = graph.edges.filter(e => e.to === node.id).length;
    const outgoing = graph.edges.filter(e => e.from === node.id).length;
    const total = incoming + outgoing;
    
    // Configuration files
    if (this.isConfigFile(node)) {
      return 'config';
    }
    
    // Hub nodes - heavily depended upon (high incoming dependencies)
    if (incoming >= 5) {
      return 'hub';
    }
    
    // Entry points - files that import many but are rarely imported
    if (outgoing >= 5 && incoming <= 2) {
      return 'entry';
    }
    
    // Leaf nodes - no outgoing dependencies
    if (outgoing === 0) {
      return 'leaf';
    }
    
    // Bridge nodes - everything else (moderate connectivity)
    return 'bridge';
  }

  isConfigFile(node) {
    const configPatterns = [
      'package.json',
      'tsconfig.json',
      'webpack.config',
      'vite.config',
      'rollup.config',
      'babel.config',
      '.eslintrc',
      '.prettierrc',
      'tailwind.config',
      'postcss.config',
      'jest.config',
      '.env',
      'docker',
      'makefile',
      'readme'
    ];
    
    const fileName = (node.label || node.name || '').toLowerCase();
    const filePath = (node.path || '').toLowerCase();
    
    return configPatterns.some(pattern => 
      fileName.includes(pattern) || filePath.includes(pattern)
    );
  }

  getNodeProperties(node, graph) {
    const category = this.categorizeNode(node, graph);
    const incoming = graph.edges.filter(e => e.to === node.id).length;
    const outgoing = graph.edges.filter(e => e.from === node.id).length;
    
    return {
      category,
      ...this.getCategoryStyle(category),
      radius: this.calculateRadius(category, incoming + outgoing),
      importance: this.calculateImportance(category, incoming, outgoing)
    };
  }

  getCategoryStyle(category) {
    const styles = {
      hub: {
        color: '#ef4444',      // Red
        strokeColor: '#dc2626',
        glowColor: '#ef444430'
      },
      entry: {
        color: '#a855f7',      // Purple
        strokeColor: '#9333ea',
        glowColor: '#a855f730'
      },
      bridge: {
        color: '#3b82f6',      // Blue
        strokeColor: '#2563eb',
        glowColor: '#3b82f630'
      },
      leaf: {
        color: '#10b981',      // Green
        strokeColor: '#059669',
        glowColor: '#10b98130'
      },
      config: {
        color: '#6b7280',      // Gray
        strokeColor: '#4b5563',
        glowColor: '#6b728030'
      }
    };
    
    return styles[category] || styles.bridge;
  }

  calculateRadius(category, connectionCount) {
    const baseRadius = {
      hub: 16,
      entry: 14,
      bridge: 12,
      leaf: 10,
      config: 8
    };
    
    const base = baseRadius[category] || 12;
    const scaleFactor = Math.min(2, Math.max(0.5, connectionCount / 10));
    
    return Math.round(base * scaleFactor);
  }

  calculateImportance(category, incoming, outgoing) {
    const categoryWeights = {
      hub: 10,
      entry: 8,
      bridge: 5,
      leaf: 2,
      config: 1
    };
    
    const baseImportance = categoryWeights[category] || 5;
    const connectionImportance = (incoming * 2 + outgoing) * 0.1;
    
    return baseImportance + connectionImportance;
  }

  getNodesByCategory(nodes, graph) {
    const categories = {
      hub: [],
      entry: [],
      bridge: [],
      leaf: [],
      config: []
    };
    
    nodes.forEach(node => {
      const category = this.categorizeNode(node, graph);
      categories[category].push(node);
    });
    
    return categories;
  }
}