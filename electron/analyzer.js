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
 * Analyze a single file
 * @param {string} filePath - Path to the file
 * @param {string} rootDir - Root directory for relative path calculation
 * @returns {Object} Analysis result with text and file size data
 */
function analyzeSingleFile(filePath, rootDir) {
    const fileSizeData = [];
    
    if (!fsSync.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
    }

    const stats = fsSync.statSync(filePath);
    if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
    }

    if (!isTextFile(filePath)) {
        throw new Error(`File is not a text file: ${filePath}`);
    }

    const relativePath = normalizeRelativePath(filePath, rootDir);
    const content = getFileContent(filePath);
    
    let output = `Project path: ${rootDir}\n\n`;
    output += 'File Analysis:\n';
    output += `📄 ${path.basename(filePath)}\n\n`;
    output += 'File Contents:\n';
    output += `\n--- ${relativePath} ---\n`;
    output += content;
    output += '\n';
    
    // Store file size data
    fileSizeData.push({
        path: relativePath,
        name: path.basename(filePath),
        directory: path.dirname(relativePath),
        charCount: content.length
    });

    return {
        text: output,
        fileSizeData
    };
}

/**
 * Analyze project using resolved patterns or basic settings
 * @param {string} rootDir - Root directory or file path to analyze
 * @param {Object} resolvedPatterns - Resolved patterns from PatternResolutionService
 * @param {string} fallbackExcludePatterns - Fallback exclude patterns (legacy)
 * @param {Object} settings - Basic settings for fallback
 * @returns {Object} Analysis result with text and file size data
 */
function analyzeProject(rootDir, resolvedPatterns = null, fallbackExcludePatterns = '', settings = {}) {
    // Check if the path is a file or directory
    if (!fsSync.existsSync(rootDir)) {
        throw new Error(`Path does not exist: ${rootDir}`);
    }

    const stats = fsSync.statSync(rootDir);
    
    // If it's a single file, handle it differently
    if (stats.isFile()) {
        console.log('Analyzing single file:', rootDir);
        // For single file analysis, use the directory containing the file as root
        const fileDir = path.dirname(rootDir);
        return analyzeSingleFile(rootDir, fileDir);
    }

    // Original directory analysis logic
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