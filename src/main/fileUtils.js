const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const { TEXT_EXTENSIONS, BINARY_EXTENSIONS } = require('./constants');
const { promisify } = require('util');

const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

function normalizeRelativePath(fullPath, rootDir) {
    // Always use forward slashes for consistency
    return path.relative(rootDir, fullPath).replace(/\\/g, '/');
}

function makePathRelative(pathToCheck) {
    // Remove leading slashes and normalize separators
    return pathToCheck.replace(/^[/\\]+/, '').replace(/\\/g, '/');
}

function normalizeExcludePattern(pattern, rootPath) {
    // Normalize to forward slashes
    pattern = pattern.trim().replace(/\\/g, '/');
    
    // Remove ./ prefix if present
    pattern = pattern.replace(/^\.\//, '');
    
    try {
        const fullPath = path.join(rootPath, pattern);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
            // For directories, create both patterns
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
    if (fs.existsSync(gitignorePath)) {
        return fs.readFileSync(gitignorePath, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(line => line.replace(/\\/g, '/')); // Normalize separators
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
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return `Error reading file: ${error.message}`;
    }
}

function shouldInclude(relativePath, includePatterns) {
    if (!includePatterns) return true;
    
    // Normalize path separators
    relativePath = relativePath.replace(/\\/g, '/');
    
    const patterns = includePatterns.split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(pattern => {
            // Escape special regex characters except * and ?
            const regexPattern = pattern
                .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');
            return new RegExp(`^${regexPattern}$`);
        });
    
    return patterns.length === 0 || patterns.some(regex => regex.test(relativePath));
}

module.exports = {
    isTextFile,
    readGitignore,
    normalizePattern,
    normalizeExcludePattern,
    getFileContent,
    readdirAsync,
    statAsync,
    normalizeRelativePath,
    makePathRelative,
    shouldInclude
};