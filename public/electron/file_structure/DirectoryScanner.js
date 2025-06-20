// public/electron/file_structure/DirectoryScanner.js - FIXED VERSION

const path = require('path');
const { ExclusionManager } = require('./ExclusionManager');
const { FileUtils } = require('./FileUtils');
const { PathUtils } = require('./PathUtils');

class DirectoryScanner {
    constructor(rootDir, excludePatterns, settings = {}, resolvedPatterns = null) {
        this.rootDir = path.normalize(rootDir);
        
        // FIX: Pass the exclude patterns string, not the raw parameter
        const patternsString = resolvedPatterns ? 
            resolvedPatterns.excludePatterns : 
            (excludePatterns || '');
            
        this.exclusionManager = new ExclusionManager(
            this.rootDir, 
            patternsString, // Pass the string, not array or object
            settings,
            resolvedPatterns
        );
        this.processedPaths = new Set();
        this.errors = [];
        this.resolvedPatterns = resolvedPatterns;
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

    async scanDirectory(dirPath, projectRoot = null) {
        // Reset error state for new scan
        this.errors = [];
        this.processedPaths.clear();
        this.exclusionManager.clearCache();

        // FIX: Simplify path calculation
        const normalizedDirPath = path.normalize(dirPath);
        const scanRoot = projectRoot || this.rootDir;

        // Validate directory before proceeding
        const isValid = await this.validateDirectory(normalizedDirPath);
        if (!isValid) {
            return this.createErrorResponse(normalizedDirPath, path.basename(normalizedDirPath));
        }

        try {
            const entries = await FileUtils.readdirAsync(normalizedDirPath);
            const results = await this.processDirectoryEntries(normalizedDirPath, entries, scanRoot);

            return {
                type: 'folder',
                name: path.basename(normalizedDirPath),
                path: path.relative(scanRoot, normalizedDirPath).replace(/\\/g, '/') || '.',
                fullPath: path.relative(scanRoot, normalizedDirPath).replace(/\\/g, '/') || '.',
                excluded: false, // Root is never excluded
                children: results,
                hasChildren: results.length > 0,
                errors: this.errors.length > 0 ? this.errors : undefined,
                // Include pattern info for debugging if resolved patterns are available
                ...(this.resolvedPatterns && process.env.NODE_ENV === 'development' && {
                    _patternInfo: {
                        excludeCount: this.resolvedPatterns.excludeArray?.length || 0,
                        includeGitignore: this.resolvedPatterns.includeGitignore,
                        includeDotfiles: this.resolvedPatterns.includeDotfiles,
                        moduleCount: this.resolvedPatterns.moduleInfo?.size || 0
                    }
                })
            };
        } catch (error) {
            this.errors.push({
                type: 'SCAN_ERROR',
                path: normalizedDirPath,
                message: error.message
            });
            return this.createErrorResponse(normalizedDirPath, path.basename(normalizedDirPath));
        }
    }

    async processDirectoryEntries(dirPath, entries, scanRoot) {
        const results = [];

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry);
            
            // FIX: Calculate relative path properly
            const relativePath = path.relative(scanRoot, fullPath).replace(/\\/g, '/');
            
            // Skip if path calculation failed
            if (!relativePath || relativePath.startsWith('..')) {
                continue;
            }

            try {
                const stats = await FileUtils.statAsync(fullPath);
                const isExcluded = this.exclusionManager.isPathExcluded(relativePath);

                if (stats.isDirectory()) {
                    results.push({
                        type: 'folder',
                        name: entry,
                        path: relativePath,
                        fullPath: relativePath,
                        excluded: isExcluded,
                        hasChildren: (await FileUtils.readdirAsync(fullPath)).length > 0,
                        children: []
                    });
                } else {
                    results.push({
                        type: 'file',
                        name: entry,
                        path: relativePath,
                        fullPath: relativePath,
                        excluded: isExcluded
                    });
                }
            } catch (error) {
                this.errors.push({
                    type: 'ENTRY_ERROR',
                    path: fullPath,
                    message: error.message
                });
                console.warn(`DirectoryScanner: Error processing ${fullPath}:`, error.message);
            }
        }

        return results.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    }

    createErrorResponse(dirPath, name) {
        return {
            type: 'folder',
            name: name,
            path: '.',
            fullPath: '.',
            excluded: false,
            children: [],
            hasChildren: false,
            errors: this.errors
        };
    }
}

module.exports = { DirectoryScanner };