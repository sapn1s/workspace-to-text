const ignore = require('ignore');
const path = require('path');
const { DEFAULT_EXCLUDES } = require('./constants');
const { FileUtils } = require('./FileUtils');
const { PathUtils } = require('./PathUtils');
const { DOT_FILE_EXCLUDES, CORE_EXCLUDES, GIT_EXCLUDES } = require('../constants');

class ExclusionManager {
    constructor(rootDir, excludePatterns, settings = {}) {
        this.rootDir = path.normalize(rootDir);
        this.ig = this.setupIgnore(excludePatterns, settings);
        this.excludePatterns = excludePatterns ? 
            excludePatterns.split(',').map(p => p.trim()) : 
            [];
        this.pathExclusionCache = new Map();
    }

    setupIgnore(excludePatterns, settings = {}) {
        const ig = ignore();
        
         // Add gitignore rules if enabled
         if (settings.respectGitignore !== false) {
            const gitignoreRules = FileUtils.readGitignore(this.rootDir);
            ig.add(gitignoreRules);
            ig.add(GIT_EXCLUDES);
        }

        // Add dot files excludes if enabled
        if (settings.ignoreDotfiles !== false) {
            ig.add(DOT_FILE_EXCLUDES);
        }

        // Add user-specified excludes
        if (excludePatterns) {
            const patterns = excludePatterns.split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0)
                .flatMap(pattern => PathUtils.normalizeExcludePattern(pattern, this.rootDir));
            ig.add(patterns);
        }

        return ig;
    }

    isPathExcluded(relativePath) {
        if (PathUtils.isRootPath(relativePath)) return false;

        try {
            // Get the absolute path
            const absolutePath = path.isAbsolute(relativePath) ?
                relativePath :
                path.resolve(this.rootDir, relativePath);

            // Make it relative to the root directory
            const normalizedPath = path.relative(this.rootDir, absolutePath);

            // Convert to forward slashes and ensure it doesn't start with ../
            const cleanPath = normalizedPath
                .replace(/\\/g, '/')
                .replace(/^\.\.\//, '')
                .replace(/^\//, '');

            if (this.pathExclusionCache.has(cleanPath)) {
                return this.pathExclusionCache.get(cleanPath);
            }

            const isExcluded = this.ig.ignores(cleanPath);
            this.pathExclusionCache.set(cleanPath, isExcluded);
            return isExcluded;
        } catch (error) {
            console.warn(`Error checking path exclusion for ${relativePath}:`, error);
            return false;
        }
    }

    clearCache() {
        this.pathExclusionCache.clear();
    }
}

module.exports = { ExclusionManager };