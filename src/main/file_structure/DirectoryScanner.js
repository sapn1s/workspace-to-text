const path = require('path');
const { ExclusionManager } = require('./ExclusionManager');
const { FileUtils } = require('./FileUtils');
const { PathUtils } = require('./PathUtils');

class DirectoryScanner {
    constructor(rootDir, includePatterns, excludePatterns) {
        this.rootDir = path.normalize(rootDir);
        this.exclusionManager = new ExclusionManager(rootDir, excludePatterns);
        this.includePatterns = this.setupIncludePatterns(includePatterns);
        this.processedPaths = new Set();
    }

    setupIncludePatterns(includePatterns) {
        if (!includePatterns) return [];

        return includePatterns.split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(pattern => {
                return pattern
                    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '.*')
                    .replace(/\?/g, '.');
            });
    }

    shouldIncludePath(relativePath) {
        if (this.includePatterns.length === 0) return true;

        try {
            const fullPath = path.join(this.rootDir, relativePath);
            const isDirectory = FileUtils.isDirectory(fullPath);
            if (isDirectory) return true;

            const normalizedPath = PathUtils.normalizePath(relativePath);
            return this.includePatterns.some(pattern => {
                const regex = new RegExp(`^${pattern}$`);
                return regex.test(normalizedPath);
            });
        } catch (error) {
            console.warn(`Error checking include path for ${relativePath}:`, error);
            return false;
        }
    }

    buildFullRelativePath(currentPath, parentPath = null) {
        if (!parentPath) return currentPath;
        return PathUtils.normalizePath(path.join(parentPath, currentPath));
    }

    async scanDirectory(dirPath, projectRoot = null, parentPath = '') {
        let relativePath;
        try {
            this.processedPaths.clear();
            this.exclusionManager.clearCache();

            // Calculate relativePath early so it's available in the catch block
            relativePath = PathUtils.getRelativePath(dirPath, projectRoot || this.rootDir);
            
            // Build full relative path including parent path
            const fullRelativePath = this.buildFullRelativePath(relativePath, parentPath);

            // Verify directory exists before proceeding
            await FileUtils.statAsync(dirPath);

            // Check if path exists and is accessible
            if (!await FileUtils.pathExists(dirPath)) {
                throw new Error(`Directory does not exist: ${dirPath}`);
            }

            const stats = await FileUtils.statAsync(dirPath);
            if (!stats.isDirectory()) {
                return null;
            }

            const entries = await FileUtils.readdirAsync(dirPath);
            const results = [];

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry);
                const entryRelativePath = PathUtils.getRelativePath(
                    fullPath, 
                    projectRoot || this.rootDir
                );
                
                // Build the full relative path for the entry
                const entryFullRelativePath = this.buildFullRelativePath(entryRelativePath, parentPath);

                try {
                    const stats = await FileUtils.statAsync(fullPath);
                    const isExcluded = this.exclusionManager.isPathExcluded(entryFullRelativePath);

                    if (stats.isDirectory()) {
                        results.push({
                            type: 'folder',
                            name: entry,
                            path: entryFullRelativePath,
                            fullPath: entryFullRelativePath, // Add fullPath for backward compatibility
                            excluded: isExcluded,
                            hasChildren: (await FileUtils.readdirAsync(fullPath)).length > 0,
                            children: []
                        });
                    } else if (stats.isFile() && FileUtils.isTextFile(fullPath)) {
                        if (this.shouldIncludePath(entryFullRelativePath)) {
                            results.push({
                                type: 'file',
                                name: entry,
                                path: entryFullRelativePath,
                                fullPath: entryFullRelativePath, // Add fullPath for backward compatibility
                                excluded: isExcluded
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`Error accessing ${fullPath}:`, error);
                    continue;
                }
            }

            results.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'folder' ? -1 : 1;
                }
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            });

            const isRoot = PathUtils.isRootPath(fullRelativePath);
            return {
                type: 'folder',
                name: path.basename(dirPath),
                path: fullRelativePath,
                fullPath: fullRelativePath, // Add fullPath for backward compatibility
                excluded: isRoot ? false : this.exclusionManager.isPathExcluded(fullRelativePath),
                children: results,
                hasChildren: results.length > 0
            };

        } catch (error) {
            console.error('Error scanning directory:', error);
            const fallbackPath = relativePath || path.basename(dirPath);
            const fullFallbackPath = this.buildFullRelativePath(fallbackPath, parentPath);
            return {
                type: 'folder',
                name: path.basename(dirPath),
                path: fullFallbackPath,
                fullPath: fullFallbackPath, // Add fullPath for backward compatibility
                excluded: false,
                error: `Error reading directory: ${error.message}`,
                children: [],
                hasChildren: false
            };
        }
    }
}

module.exports = { DirectoryScanner };