const ignore = require('ignore');
const path = require('path');
const { DEFAULT_EXCLUDES } = require('./constants');
const { FileUtils } = require('./FileUtils');
const { PathUtils } = require('./PathUtils');

class ExclusionManager {
    constructor(rootDir, excludePatterns) {
        this.rootDir = rootDir;
        this.ig = this.setupIgnore(excludePatterns);
        this.excludePatterns = excludePatterns ? 
            excludePatterns.split(',').map(p => p.trim()) : 
            [];
        this.pathExclusionCache = new Map();
    }

    setupIgnore(excludePatterns) {
        const ig = ignore().add(DEFAULT_EXCLUDES);
        const gitignoreRules = FileUtils.readGitignore(this.rootDir);

        if (gitignoreRules.length > 0) {
            ig.add(gitignoreRules);
        }

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
            // Ensure the path is relative to the project root
            let normalizedPath;
            if (path.isAbsolute(relativePath)) {
                normalizedPath = path.relative(this.rootDir, relativePath);
            } else {
                // If the path starts with ../, make it relative to the root
                if (relativePath.startsWith('..')) {
                    const absolutePath = path.resolve(this.rootDir, relativePath);
                    normalizedPath = path.relative(this.rootDir, absolutePath);
                } else {
                    normalizedPath = relativePath;
                }
            }
            
            // Convert to forward slashes and remove any leading ./ or /
            normalizedPath = PathUtils.normalizePath(normalizedPath);
            
            if (PathUtils.isRootPath(normalizedPath)) return false;

            if (this.pathExclusionCache.has(normalizedPath)) {
                return this.pathExclusionCache.get(normalizedPath);
            }

            const isExcluded = this.ig.ignores(normalizedPath);
            this.pathExclusionCache.set(normalizedPath, isExcluded);
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