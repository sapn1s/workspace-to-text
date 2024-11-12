export const pathUtils = {
    join: (...parts) => {
      const processed = parts
        .map((part, i) => {
          if (i === 0 && (part.startsWith('/') || /^[A-Za-z]:\\/.test(part))) {
            return part.replace(/[\/\\]$/, '');
          }
          return part.trim().replace(/(^[\/\\]|[\/\\]$)/g, '');
        })
        .filter(x => x.length);
      return processed.join('/');
    },
    isAbsolute: (path) => {
      return path.startsWith('/') || /^[A-Za-z]:\\/.test(path);
    }
  };
  
  export const checkExcludedStatus = (item, excludePatterns) => {
    if (!excludePatterns) return false;
    
    const patterns = excludePatterns.split(',').map(p => p.trim());
    const itemPath = item.fullPath || item.path;
    
    return patterns.some(pattern => {
      if (pattern.includes('**')) {
        const basePattern = pattern.replace('/**', '');
        return itemPath === basePattern || itemPath.startsWith(basePattern + '/');
      }
      return itemPath === pattern;
    });
  };
  
  export const hasExcludedChildren = async (item, excludePatterns, basePath) => {
    if (!item) return false;
    
    if (checkExcludedStatus(item, excludePatterns)) return true;
    
    if (item.type !== 'folder' || item.hasChildren === false) return false;
    
    if (item.children && item.children.length > 0) {
      return item.children.some(child => {
        const childFullPath = pathUtils.join(item.fullPath || item.path, child.name);
        return checkExcludedStatus({ ...child, fullPath: childFullPath }, excludePatterns) || 
          (child.type === 'folder' && hasExcludedChildren(child, excludePatterns, basePath));
      });
    }
    
    if (item.hasChildren) {
      try {
        const fullPath = pathUtils.join(basePath, item.path);
        const structure = await window.electron.getFileStructure(
          fullPath,
          '',
          excludePatterns,
          basePath
        );
        
        if (structure && structure.children) {
          item.children = structure.children.map(child => ({
            ...child,
            fullPath: pathUtils.join(item.fullPath || item.path, child.name)
          }));
          
          return item.children.some(child => 
            checkExcludedStatus(child, excludePatterns) || 
            (child.type === 'folder' && hasExcludedChildren(child, excludePatterns, basePath))
          );
        }
      } catch (error) {
        console.error('Error loading children for exclusion check:', error);
      }
    }
    
    return false;
  };
  