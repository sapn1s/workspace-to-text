const path = require('path');
const { DirectoryScanner } = require('./DirectoryScanner');
const { PathUtils } = require('./PathUtils');

async function getFileStructure(dirPath, includePatterns, excludePatterns, projectRoot = null, settings = {}) {
    try {
        let absolutePath = dirPath;
        if (!path.isAbsolute(dirPath) && projectRoot) {
            absolutePath = path.resolve(projectRoot, dirPath);
        }

        const normalizedPath = path.normalize(absolutePath);
        const scanner = new DirectoryScanner(
            normalizedPath, 
            includePatterns, 
            excludePatterns,
            settings
        );

        return await scanner.scanDirectory(normalizedPath, projectRoot);
    } catch (error) {
        console.error('Error in getFileStructure:', error);
        return {
            type: 'folder',
            name: path.basename(dirPath),
            path: dirPath,
            excluded: false,
            children: [],
            hasChildren: false,
            error: `Error accessing directory: ${error.message}`
        };
    }
}

async function handleUpdateFileExclusions(projectPath, structure, includePatterns, excludePatterns, changedPattern) {
    try {
        const scanner = new DirectoryScanner(projectPath, includePatterns, excludePatterns);
        return scanner.updateExclusionStates(structure, changedPattern);
    } catch (error) {
        console.error('Error updating file exclusions:', error);
        throw error;
    }
}

module.exports = {
    getFileStructure,
    handleUpdateFileExclusions
};
