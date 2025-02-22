// Build a folder tree structure from flat file list
export const buildFolderTree = (files) => {
    const tree = {};
  
    files.forEach(file => {
      const parts = file.path.split('/');
      let currentLevel = tree;
  
      // Build folder structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!part) continue;
        
        if (!currentLevel[part]) {
          currentLevel[part] = {
            isFolder: true,
            name: part,
            path: parts.slice(0, i + 1).join('/'),
            children: {},
            charCount: 0
          };
        }
        
        currentLevel = currentLevel[part].children;
      }
  
      // Add file to the appropriate folder
      const fileName = parts[parts.length - 1];
      currentLevel[fileName] = {
        isFolder: false,
        name: fileName,
        path: file.path,
        charCount: file.charCount
      };
    });
  
    // Calculate folder sizes by summing up all child files
    const calculateFolderSizes = (folder) => {
      let totalSize = 0;
      
      Object.values(folder).forEach(item => {
        if (item.isFolder) {
          item.charCount = calculateFolderSizes(item.children);
        }
        totalSize += item.charCount;
      });
      
      return totalSize;
    };
  
    // Process the tree to calculate folder sizes
    calculateFolderSizes(tree);
    
    return tree;
  };
  
  // Convert tree structure to a flat array for rendering
  export const treeToArray = (tree, level = 0) => {
    const result = [];
    
    // Sort folders and files by size (descending)
    const items = Object.values(tree).sort((a, b) => b.charCount - a.charCount);
    
    items.forEach(item => {
      result.push({ ...item, level });
      
      if (item.isFolder) {
        result.push(...treeToArray(item.children, level + 1));
      }
    });
    
    return result;
  };