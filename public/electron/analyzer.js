const path = require('path');
const fsSync = require('fs');
const {
    getFileContent,
    isTextFile,
    normalizeRelativePath,
    makePathRelative,
    createBasicIgnoreInstance
} = require('./fileUtils');

function traverseDirectory(dir, level = 0, rootDir, ig) {
    let output = '';
    const files = fsSync.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fsSync.statSync(filePath);
        const relativePath = normalizeRelativePath(filePath, rootDir);
        const pathForIgnore = makePathRelative(relativePath);

        if (!ig.ignores(pathForIgnore)) {
            if (stats.isDirectory()) {
                output += `${'  '.repeat(level)}📁 ${file}\n`;
                output += traverseDirectory(filePath, level + 1, rootDir, ig);
            } else if (isTextFile(filePath)) {
                output += `${'  '.repeat(level)}📄 ${file}\n`;
            }
        }
    });

    return output;
}

function getAllFilePaths(dir, rootDir, ig) {
    const results = [];
    const files = fsSync.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fsSync.statSync(filePath);
        const relativePath = normalizeRelativePath(filePath, rootDir);
        const pathForIgnore = makePathRelative(relativePath);

        if (!ig.ignores(pathForIgnore)) {
            if (stats.isDirectory()) {
                results.push(...getAllFilePaths(filePath, rootDir, ig));
            } else if (isTextFile(filePath)) {
                results.push(relativePath);
            }
        }
    });

    return results;
}

/**
 * Analyze project using resolved patterns or basic settings
 * @param {string} rootDir - Root directory to analyze
 * @param {Object} resolvedPatterns - Resolved patterns from PatternResolutionService
 * @param {string} fallbackExcludePatterns - Fallback exclude patterns (legacy)
 * @param {Object} settings - Basic settings for fallback
 * @returns {Object} Analysis result with text and file size data
 */
function analyzeProject(rootDir, resolvedPatterns = null, fallbackExcludePatterns = '', settings = {}) {
    const fileSizeData = []; // Array to store file size data
    let ig;

    // Use resolved patterns if available, otherwise fall back to basic pattern handling
    if (resolvedPatterns && resolvedPatterns.excludeArray) {
        console.log('Using resolved patterns for analysis:', {
            excludeCount: resolvedPatterns.excludeArray.length,
            includeGitignore: resolvedPatterns.includeGitignore,
            includeDotfiles: resolvedPatterns.includeDotfiles,
            moduleCount: resolvedPatterns.moduleInfo?.size || 0
        });

        // Create ignore instance using resolved patterns
        const { createIgnoreInstance } = require('./fileUtils');
        ig = createIgnoreInstance(resolvedPatterns, rootDir);
    } else {
        console.log('Using fallback pattern handling for analysis');
        // Fall back to basic pattern handling
        ig = createBasicIgnoreInstance(
            fallbackExcludePatterns, 
            {
                respectGitignore: settings.respectGitignore !== false,
                ignoreDotfiles: settings.ignoreDotfiles !== false
            }, 
            rootDir
        );
    }
    
    let output = `Project path: ${rootDir}\n\n`;
    output += 'Directory Structure:\n';
    output += traverseDirectory(rootDir, 0, rootDir, ig);
    output += '\nFile Contents:\n';

    const allFilePaths = getAllFilePaths(rootDir, rootDir, ig);
    allFilePaths.forEach(filePath => {
        output += `\n--- ${filePath} ---\n`;
        const content = getFileContent(path.join(rootDir, filePath));
        output += content;
        output += '\n';
        
        // Store file size data
        fileSizeData.push({
            path: filePath,
            name: path.basename(filePath),
            directory: path.dirname(filePath),
            charCount: content.length
        });
    });

    return {
        text: output,
        fileSizeData
    };
}

exports.analyzeProject = analyzeProject;