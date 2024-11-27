const path = require('path');

class PathUtils {
    static normalizePath(filePath) {
        if (!filePath) return '';
        
        return filePath
            .replace(/^\.[\\/]/, '')  // remove leading ./ or .\
            .replace(/\\/g, '/');     // convert backslashes to forward slashes
    }

    static isRootPath(relativePath) {
        return !relativePath || 
               relativePath === '.' || 
               relativePath === './' || 
               relativePath === '/';
    }

    static getRelativePath(filePath, rootDir) {
        if (!filePath || !rootDir) return '';
        
        // Ensure paths are absolute before calculating relative path
        const absoluteFilePath = path.isAbsolute(filePath) ? 
            filePath : 
            path.resolve(rootDir, filePath);
            
        const absoluteRootDir = path.isAbsolute(rootDir) ? 
            rootDir : 
            path.resolve(process.cwd(), rootDir);

        const relativePath = path.relative(absoluteRootDir, absoluteFilePath);
        return this.normalizePath(relativePath);
    }

    static normalizeExcludePattern(pattern, rootDir) {
        const normalizedPattern = this.normalizePath(pattern);
        
        // If pattern already includes '**', return as is
        if (normalizedPattern.includes('**')) {
            return [normalizedPattern];
        }
        
        // Otherwise, add pattern for the directory itself and its contents
        return [
            normalizedPattern,
            `${normalizedPattern}/**`
        ];
    }

    static joinPaths(...paths) {
        const joined = path.join(...paths);
        return this.normalizePath(joined);
    }
}

module.exports = { PathUtils };
