const ignore = require('ignore');

// Normalize paths to ensure consistent matching
const normalizePathForIgnore = (path) => {
    if (!path) return '';
    return path
        .replace(/\\/g, '/') // Convert backslashes to forward slashes
        .replace(/^\.\/+/, '') // Remove leading ./ 
        .replace(/^\/+/, '')  // Remove leading slashes
        .replace(/\/+$/, ''); // Remove trailing slashes
};

// Utility functions for path operations
export const pathUtils = {
    join: (...parts) => {
        const processed = parts
            .map((part, i) => {
                // Handle null/undefined parts
                if (!part) return '';

                // Retain leading slashes or drive letters for first part
                if (i === 0 && (part.startsWith('/') || /^[A-Za-z]:\\/.test(part))) {
                    return part.replace(/[\/\\]$/, '');
                }
                // Trim and remove slashes from other parts
                return part.trim().replace(/(^[\/\\]|[\/\\]$)/g, '');
            })
            .filter(x => x.length);
        return processed.join('/');
    },
    isAbsolute: (path) => {
        if (!path) return false;
        return path.startsWith('/') || /^[A-Za-z]:\\/.test(path);
    }
};

// Check if an item matches any exclusion pattern
export const checkExcludedStatus = (item, excludePatterns) => {
    if (!excludePatterns || !item) return false;

    // Handle root directory case
    if (!item.fullPath || item.fullPath === '.' || item.fullPath === './') {
        return false;
    }

    try {
        const itemPath = normalizePathForIgnore(item.fullPath || item.path);
        if (!itemPath) return false;

        const patterns = excludePatterns
            .split(',')
            .map(p => normalizePathForIgnore(p.trim()))
            .filter(p => p);

        if (patterns.length === 0) return false;

        const ig = ignore().add(patterns);
        return ig.ignores(itemPath);
    } catch (error) {
        console.warn('Error checking excluded status:', error);
        return false;
    }
};

// Check if an item has excluded children
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
