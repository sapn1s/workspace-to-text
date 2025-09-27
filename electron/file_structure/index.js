const path = require('path');
const { DirectoryScanner } = require('./DirectoryScanner');

async function getFileStructure(dirPath, excludePatterns, projectRoot = null, settings = {}, resolvedPatterns = null) {
    try {
        let absolutePath = dirPath;
        if (!path.isAbsolute(dirPath) && projectRoot) {
            absolutePath = path.resolve(projectRoot, dirPath);
        }

        const normalizedPath = path.normalize(absolutePath);
        
        // Create scanner with resolved patterns if available
        const scanner = new DirectoryScanner(
            normalizedPath, 
            excludePatterns,
            settings,
            resolvedPatterns // Pass resolved patterns to scanner
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

async function handleUpdateFileExclusions(projectPath, structure, excludePatterns, changedPattern) {
    try {
        const scanner = new DirectoryScanner(projectPath, excludePatterns);
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