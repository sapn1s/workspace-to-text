const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

class FileUtils {
    static isTextFile(filePath) {
        const mimeType = mime.lookup(filePath);
        return mimeType && mimeType.startsWith('text/');
    }

    static readGitignore(rootDir) {
        const gitignorePath = path.join(rootDir, '.gitignore');
        try {
            if (fs.existsSync(gitignorePath)) {
                return fs.readFileSync(gitignorePath, 'utf8')
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'))
                    .map(line => line.replace(/\\/g, '/'));
            }
        } catch (error) {
            console.warn('Error reading .gitignore:', error);
        }
        return [];
    }

    static async statAsync(path) {
        return fs.promises.stat(path);
    }

    static async readdirAsync(path) {
        return fs.promises.readdir(path);
    }

    static isDirectory(path) {
        try {
            return fs.existsSync(path) && fs.statSync(path).isDirectory();
        } catch (error) {
            return false;
        }
    }

    static async pathExists(path) {
        try {
            await fs.promises.access(path, fs.constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = { FileUtils };
