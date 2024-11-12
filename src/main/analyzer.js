const path = require('path');
const fs = require('fs');
const ignore = require('ignore');
const { DEFAULT_EXCLUDES } = require('./constants');
const { 
    readGitignore, 
    normalizePattern, 
    getFileContent, 
    isTextFile,
    normalizeRelativePath,
    makePathRelative,
    shouldInclude
} = require('./fileUtils');

function traverseDirectory(dir, level = 0, rootDir, ig, includePatterns) {
    let output = '';
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const relativePath = normalizeRelativePath(filePath, rootDir);
        const pathForIgnore = makePathRelative(relativePath);

        if (!ig.ignores(pathForIgnore) && shouldInclude(relativePath, includePatterns)) {
            if (stats.isDirectory()) {
                output += `${'  '.repeat(level)}📁 ${file}\n`;
                output += traverseDirectory(filePath, level + 1, rootDir, ig, includePatterns);
            } else if (isTextFile(filePath)) {
                output += `${'  '.repeat(level)}📄 ${file}\n`;
            }
        }
    });

    return output;
}

function getAllFilePaths(dir, rootDir, ig, includePatterns) {
    const results = [];
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const relativePath = normalizeRelativePath(filePath, rootDir);
        const pathForIgnore = makePathRelative(relativePath);

        if (!ig.ignores(pathForIgnore) && shouldInclude(relativePath, includePatterns)) {
            if (stats.isDirectory()) {
                results.push(...getAllFilePaths(filePath, rootDir, ig, includePatterns));
            } else if (isTextFile(filePath)) {
                results.push(relativePath);
            }
        }
    });

    return results;
}

function analyzeProject(rootDir, includePatterns, excludePatterns) {
    const gitignoreRules = readGitignore(rootDir);
    const ig = ignore().add(DEFAULT_EXCLUDES).add(gitignoreRules);

    if (excludePatterns) {
        const patterns = excludePatterns.split(',').map(normalizePattern);
        ig.add(patterns);
    }

    let output = `Project path: ${rootDir}\n\n`;
    output += 'Directory Structure:\n';
    output += traverseDirectory(rootDir, 0, rootDir, ig, includePatterns);
    output += '\nFile Contents:\n';

    const allFilePaths = getAllFilePaths(rootDir, rootDir, ig, includePatterns);
    allFilePaths.forEach(filePath => {
        output += `\n--- ${filePath} ---\n`;
        output += getFileContent(path.join(rootDir, filePath));
        output += '\n';
    });

    return output;
}

exports.analyzeProject = analyzeProject;