const path = require('path');
const fsSync = require('fs');
const mime = require('mime-types');
const { TEXT_EXTENSIONS, BINARY_EXTENSIONS } = require('./constants');
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

function shouldInclude(relativePath, includePatterns) {
    if (!includePatterns) return true;
    
    relativePath = relativePath.replace(/\\/g, '/');
    
    const patterns = includePatterns.split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(pattern => {
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
    normalizeRelativePath,
    makePathRelative,
    shouldInclude,
    getFolderStats // Re-exported from sizeUtils
};