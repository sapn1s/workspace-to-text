// public/electron/file_structure/ExclusionManager.js - FIXED VERSION

const path = require('path');
const { PathUtils } = require('./PathUtils');
const { createIgnoreInstance, createBasicIgnoreInstance } = require('../fileUtils');

class ExclusionManager {
    constructor(rootDir, excludePatterns, settings = {}, resolvedPatterns = null) {
        this.rootDir = path.normalize(rootDir);
        
        // FIX: Handle both string and array patterns properly
        if (typeof excludePatterns === 'string') {
            this.excludePatterns = excludePatterns ? 
                excludePatterns.split(',').map(p => p.trim()).filter(p => p) : 
                [];
        } else if (Array.isArray(excludePatterns)) {
            this.excludePatterns = excludePatterns;
        } else {
            this.excludePatterns = [];
        }
        
        this.pathExclusionCache = new Map();
        this.resolvedPatterns = resolvedPatterns;
        this.settings = settings;
        
        // Setup ignore instance
        this.ig = this.setupIgnore();
    }

    setupIgnore() {
        // Use resolved patterns if available, otherwise fall back to basic pattern handling
        if (this.resolvedPatterns) {
            return createIgnoreInstance(this.resolvedPatterns, this.rootDir);
        } else {
            // Fall back to basic pattern handling
            const excludePatternsString = this.excludePatterns.join(',');
            return createBasicIgnoreInstance(excludePatternsString, this.settings, this.rootDir);
        }
    }

    isPathExcluded(relativePath) {
        // Root path is never excluded
        if (PathUtils.isRootPath(relativePath)) {
            return false;
        }

        try {
            // Normalize the input path
            let normalizedPath = this.normalizePath(relativePath);
            
            // If the path is empty after normalization, it's the root
            if (!normalizedPath || normalizedPath === '.') {
                return false;
            }

            // Check for paths that would go outside the project
            if (normalizedPath.includes('../')) {
                console.warn(`ExclusionManager: Path goes outside root directory: ${relativePath} -> ${normalizedPath}`);
                return false;
            }

            // Check cache first
            if (this.pathExclusionCache.has(normalizedPath)) {
                return this.pathExclusionCache.get(normalizedPath);
            }

            // Test with ignore library
            const isExcluded = this.ig.ignores(normalizedPath);
            
            // Cache the result
            this.pathExclusionCache.set(normalizedPath, isExcluded);
            
            return isExcluded;
        } catch (error) {
            console.warn(`ExclusionManager: Error checking path exclusion for ${relativePath}:`, error.message);
            // On error, default to not excluded to be safe
            return false;
        }
    }

    normalizePath(relativePath) {
        if (!relativePath) return '';
        
        let normalizedPath;
        
        if (path.isAbsolute(relativePath)) {
            // If it's absolute, make it relative to root
            try {
                normalizedPath = path.relative(this.rootDir, relativePath);
            } catch (error) {
                console.warn(`ExclusionManager: Could not make path relative: ${relativePath}`);
                return '';
            }
        } else {
            // It's already relative, just use it
            normalizedPath = relativePath;
        }

        // Clean up the path
        return normalizedPath
            .replace(/\\/g, '/')           // Convert backslashes to forward slashes
            .replace(/^\.\/+/, '')         // Remove leading ./ 
            .replace(/^\/+/, '')           // Remove leading slashes
            .replace(/\/+$/, '');          // Remove trailing slashes
    }

    clearCache() {
        this.pathExclusionCache.clear();
    }

    // Method to get pattern info for debugging
    getPatternInfo() {
        if (this.resolvedPatterns) {
            return {
                type: 'resolved',
                excludeCount: this.resolvedPatterns.excludeArray?.length || 0,
                includeGitignore: this.resolvedPatterns.includeGitignore,
                includeDotfiles: this.resolvedPatterns.includeDotfiles,
                moduleCount: this.resolvedPatterns.moduleInfo?.size || 0,
                patterns: this.resolvedPatterns.excludeArray
            };
        } else {
            return {
                type: 'basic',
                excludeCount: this.excludePatterns.length,
                respectGitignore: this.settings.respectGitignore !== false,
                ignoreDotfiles: this.settings.ignoreDotfiles !== false,
                patterns: this.excludePatterns
            };
        }
    }
}

module.exports = { ExclusionManager };