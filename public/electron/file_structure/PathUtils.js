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
        
        try {
            // Ensure paths are absolute before calculating relative path
            const absoluteFilePath = path.isAbsolute(filePath) ? 
                filePath : 
                path.resolve(rootDir, filePath);
                
            const absoluteRootDir = path.isAbsolute(rootDir) ? 
                rootDir : 
                path.resolve(process.cwd(), rootDir);

            const relativePath = path.relative(absoluteRootDir, absoluteFilePath);
            
            // Check if the relative path goes outside the root directory
            if (relativePath.startsWith('..')) {
                console.warn(`Path ${filePath} is outside root directory ${rootDir}`);
                // Return the original path if it's outside the root
                return this.normalizePath(filePath);
            }
            
            return this.normalizePath(relativePath);
        } catch (error) {
            console.warn(`Error calculating relative path for ${filePath} from ${rootDir}:`, error.message);
            return this.normalizePath(filePath);
        }
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
        try {
            const joined = path.join(...paths);
            return this.normalizePath(joined);
        } catch (error) {
            console.warn(`Error joining paths [${paths.join(', ')}]:`, error.message);
            // Fallback to manual joining
            return paths
                .filter(p => p && typeof p === 'string')
                .map(p => this.normalizePath(p))
                .filter(p => p)
                .join('/');
        }
    }

    static makePathSafe(inputPath, rootDir) {
        if (!inputPath) return '';
        
        try {
            // First normalize the input
            let safePath = this.normalizePath(inputPath);
            
            // If it's already relative and doesn't go outside, return it
            if (!path.isAbsolute(safePath) && !safePath.startsWith('../')) {
                return safePath;
            }
            
            // If it's absolute, try to make it relative to root
            if (path.isAbsolute(safePath)) {
                const relativePath = path.relative(rootDir, safePath);
                // Only return if it doesn't go outside the root
                if (!relativePath.startsWith('../')) {
                    return this.normalizePath(relativePath);
                }
            }
            
            // If we can't make it safe, return empty string
            return '';
        } catch (error) {
            console.warn(`Error making path safe: ${inputPath}`, error.message);
            return '';
        }
    }
}

module.exports = { PathUtils };