const path = require('path');
const fsSync = require('fs');
const mime = require('mime-types');
const { TEXT_EXTENSIONS, BINARY_EXTENSIONS, DOT_FILE_EXCLUDES, GIT_EXCLUDES } = require('./constants');
const { getFolderStats } = require('./utils/sizeUtils');

function normalizeRelativePath(fullPath, rootDir) {
    return path.relative(rootDir, fullPath).replace(/\\/g, '/');
}

function makePathRelative(pathToCheck) {
    if (!pathToCheck) return '';
    const pathStr = String(pathToCheck);
    return pathStr
        .replace(/^\.[\\/]+/, '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '');
}

function normalizeExcludePattern(pattern, rootPath) {
    pattern = pattern.trim().replace(/\\/g, '/');
    pattern = pattern.replace(/^\.\//, '');
    
    try {
        const fullPath = path.join(rootPath, pattern);
        if (fsSync.existsSync(fullPath) && fsSync.statSync(fullPath).isDirectory()) {
            return [pattern, `${pattern}/*`];
        }
    } catch (error) {
        console.warn('Error checking path:', error);
    }
    
    return [pattern];
}

function isTextFile(filePath) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    if (BINARY_EXTENSIONS.has(ext)) return false;
    if (TEXT_EXTENSIONS.has(ext)) return true;

    try {
        const mimeType = mime.lookup(filePath) || '';
        return mimeType.startsWith('text/') || mimeType === 'application/json';
    } catch {
        return false;
    }
}

function readGitignore(rootDir) {
    const gitignorePath = path.join(rootDir, '.gitignore');
    if (fsSync.existsSync(gitignorePath)) {
        return fsSync.readFileSync(gitignorePath, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(line => line.replace(/\\/g, '/'));
    }
    return [];
}

function normalizePattern(pattern) {
    pattern = pattern.trim().replace(/\\/g, '/');
    if (!pattern.startsWith('/') && !pattern.startsWith('*')) {
        return pattern.startsWith('./') ? pattern.slice(2) : pattern;
    }
    return pattern;
}

function getFileContent(filePath) {
    if (!isTextFile(filePath)) {
        return '[Binary file not displayed]';
    }
    try {
        return fsSync.readFileSync(filePath, 'utf8');
    } catch (error) {
        return `Error reading file: ${error.message}`;
    }
}

/**
 * Create a properly configured ignore instance using resolved patterns
 * @param {Object} resolvedPatterns - Patterns resolved by PatternResolutionService
 * @param {string} rootDir - Root directory for gitignore reading
 * @returns {Object} Configured ignore instance
 */
function createIgnoreInstance(resolvedPatterns, rootDir) {
    const ignore = require('ignore');
    const ig = ignore();

    // Add gitignore rules if enabled
    if (resolvedPatterns.includeGitignore) {
        const gitignoreRules = readGitignore(rootDir);
        if (gitignoreRules.length > 0) {
            ig.add(gitignoreRules);
        }
        ig.add(GIT_EXCLUDES);
    }

    // Add dotfile excludes if enabled
    if (resolvedPatterns.includeDotfiles) {
        ig.add(DOT_FILE_EXCLUDES);
    }

    // Add user-defined and module exclude patterns
    if (resolvedPatterns.excludeArray && resolvedPatterns.excludeArray.length > 0) {
        const patterns = resolvedPatterns.excludeArray.map(normalizePattern);
        ig.add(patterns);
    }

    return ig;
}

/**
 * Create a configured ignore instance using basic settings (fallback for when resolved patterns aren't available)
 * @param {string} excludePatterns - Comma-separated exclude patterns
 * @param {Object} settings - Basic settings object
 * @param {string} rootDir - Root directory
 * @returns {Object} Configured ignore instance
 */
function createBasicIgnoreInstance(excludePatterns, settings = {}, rootDir) {
    const ignore = require('ignore');
    const ig = ignore();

    // Add gitignore rules if enabled
    if (settings.respectGitignore !== false) {
        const gitignoreRules = readGitignore(rootDir);
        if (gitignoreRules.length > 0) {
            ig.add(gitignoreRules);
        }
        ig.add(GIT_EXCLUDES);
    }

    // Add dotfile excludes if enabled
    if (settings.ignoreDotfiles !== false) {
        ig.add(DOT_FILE_EXCLUDES);
    }

    // Add user-specified excludes
    if (excludePatterns) {
        const patterns = excludePatterns.split(',').map(normalizePattern);
        ig.add(patterns);
    }

    return ig;
}

/**
 * Check if a path should be ignored using resolved patterns
 * @param {string} filePath - Path to check
 * @param {Object} resolvedPatterns - Resolved patterns from PatternResolutionService
 * @param {string} rootDir - Root directory
 * @returns {boolean} True if path should be ignored
 */
function isPathIgnored(filePath, resolvedPatterns, rootDir) {
    if (!resolvedPatterns) {
        return false;
    }

    const ig = createIgnoreInstance(resolvedPatterns, rootDir);
    const relativePath = makePathRelative(normalizeRelativePath(filePath, rootDir));
    
    return ig.ignores(relativePath);
}

/**
 * Check if a path should be ignored using basic settings (fallback)
 * @param {string} filePath - Path to check
 * @param {string} excludePatterns - Comma-separated exclude patterns
 * @param {Object} settings - Basic settings
 * @param {string} rootDir - Root directory
 * @returns {boolean} True if path should be ignored
 */
function isPathIgnoredBasic(filePath, excludePatterns, settings, rootDir) {
    const ig = createBasicIgnoreInstance(excludePatterns, settings, rootDir);
    const relativePath = makePathRelative(normalizeRelativePath(filePath, rootDir));
    
    return ig.ignores(relativePath);
}

module.exports = {
    isTextFile,
    readGitignore,
    normalizePattern,
    normalizeExcludePattern,
    getFileContent,
    normalizeRelativePath,
    makePathRelative,
    getFolderStats, // Re-exported from sizeUtils
    createIgnoreInstance,
    createBasicIgnoreInstance,
    isPathIgnored,
    isPathIgnoredBasic
};