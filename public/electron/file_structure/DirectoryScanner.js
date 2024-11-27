const path = require('path');
const { ExclusionManager } = require('./ExclusionManager');
const { FileUtils } = require('./FileUtils');
const { PathUtils } = require('./PathUtils');

class DirectoryScanner {
    constructor(rootDir, includePatterns, excludePatterns, settings = {}) {
        this.rootDir = path.normalize(rootDir);
        this.exclusionManager = new ExclusionManager(rootDir, excludePatterns, settings);
        this.includePatterns = this.setupIncludePatterns(includePatterns);
        this.processedPaths = new Set();
        this.errors = [];
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
            const normalizedPath = PathUtils.normalizePath(relativePath);
            
            // Always include directories for navigation
            if (FileUtils.isDirectory(path.join(this.rootDir, relativePath))) {
                return true;
            }

            return this.includePatterns.some(pattern => {
                const regex = new RegExp(`^${pattern}$`);
                return regex.test(normalizedPath);
            });
        } catch (error) {
            this.errors.push({
                type: 'INCLUDE_CHECK_ERROR',
                path: relativePath,
                message: error.message
            });
            return true; // Include by default on error
        }
    }

    async validateDirectory(dirPath) {
        try {
            const exists = await FileUtils.pathExists(dirPath);
            if (!exists) {
                throw new Error(`Directory does not exist: ${dirPath}`);
            }

            const stats = await FileUtils.statAsync(dirPath);
            if (!stats.isDirectory()) {
                throw new Error(`Path is not a directory: ${dirPath}`);
            }

            return true;
        } catch (error) {
            this.errors.push({
                type: 'VALIDATION_ERROR',
                path: dirPath,
                message: error.message
            });
            return false;
        }
    }

    async scanDirectory(dirPath, projectRoot = null, parentPath = '') {
        // Reset error state for new scan
        this.errors = [];
        this.processedPaths.clear();
        this.exclusionManager.clearCache();

        const relativePath = projectRoot ? 
            path.relative(projectRoot, dirPath) :
            path.relative(this.rootDir, dirPath);

        const normalizedRelativePath = PathUtils.normalizePath(relativePath);
        const fullRelativePath = PathUtils.joinPaths(parentPath, normalizedRelativePath);

        // Validate directory before proceeding
        const isValid = await this.validateDirectory(dirPath);
        if (!isValid) {
            return this.createErrorResponse(dirPath, fullRelativePath);
        }

        try {
            const entries = await FileUtils.readdirAsync(dirPath);
            const results = await this.processDirectoryEntries(dirPath, entries, projectRoot, fullRelativePath);

            return {
                type: 'folder',
                name: path.basename(dirPath),
                path: fullRelativePath,
                fullPath: fullRelativePath,
                excluded: PathUtils.isRootPath(fullRelativePath) ? false : this.exclusionManager.isPathExcluded(fullRelativePath),
                children: results,
                hasChildren: results.length > 0,
                errors: this.errors.length > 0 ? this.errors : undefined
            };
        } catch (error) {
            this.errors.push({
                type: 'SCAN_ERROR',
                path: dirPath,
                message: error.message
            });
            return this.createErrorResponse(dirPath, fullRelativePath);
        }
    }

    async processDirectoryEntries(dirPath, entries, projectRoot, parentPath) {
        const results = [];

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry);
            const entryRelativePath = projectRoot ? 
                path.relative(projectRoot, fullPath) :
                path.relative(this.rootDir, fullPath);

            const entryFullRelativePath = PathUtils.joinPaths(parentPath, PathUtils.normalizePath(path.basename(fullPath)));

            try {
                const stats = await FileUtils.statAsync(fullPath);
                const isExcluded = this.exclusionManager.isPathExcluded(entryFullRelativePath);

                if (stats.isDirectory()) {
                    results.push({
                        type: 'folder',
                        name: entry,
                        path: entryFullRelativePath,
                        fullPath: entryFullRelativePath,
                        excluded: isExcluded,
                        hasChildren: (await FileUtils.readdirAsync(fullPath)).length > 0,
                        children: []
                    });
                } else if (this.shouldIncludePath(entryRelativePath)) {
                    results.push({
                        type: 'file',
                        name: entry,
                        path: entryFullRelativePath,
                        fullPath: entryFullRelativePath,
                        excluded: isExcluded
                    });
                }
            } catch (error) {
                this.errors.push({
                    type: 'ENTRY_ERROR',
                    path: fullPath,
                    message: error.message
                });
            }
        }

        return results.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    }

    createErrorResponse(dirPath, fullRelativePath) {
        return {
            type: 'folder',
            name: path.basename(dirPath),
            path: fullRelativePath,
            fullPath: fullRelativePath,
            excluded: false,
            children: [],
            hasChildren: false,
            errors: this.errors
        };
    }
}

module.exports = { DirectoryScanner };
