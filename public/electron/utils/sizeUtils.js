const path = require('path');
const { exec } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const ignore = require('ignore');
const { SIZE_LIMITS, COMMON_LARGE_DIRECTORIES } = require('../constants');

async function getDirSize(dirPath, ignoreFn = null) {
    // For Windows, we need to handle ignored files in PowerShell
    if (process.platform === 'win32') {
        let totalSize = 0;
        try {
            // Get all files recursively
            const { stdout } = await new Promise((resolve, reject) => {
                exec(
                    `powershell -command "Get-ChildItem '${dirPath}' -Recurse -File | Select-Object FullName, Length | ConvertTo-Json"`,
                    { maxBuffer: 1024 * 1024 * 10 }, // Increase buffer size for large directories
                    (error, stdout, stderr) => {
                        if (error) reject(error);
                        else resolve({ stdout, stderr });
                    }
                );
            });

            // Parse JSON output
            let files = JSON.parse(stdout);
            // Handle single file case where PowerShell doesn't return an array
            if (!Array.isArray(files) && files) {
                files = [files];
            }

            // Sum up sizes of non-ignored files
            for (const file of files) {
                const relativePath = path.relative(dirPath, file.FullName).replace(/\\/g, '/');
                if (!ignoreFn || !ignoreFn(relativePath)) {
                    totalSize += file.Length;
                }
            }

            return totalSize;
        } catch (error) {
            console.warn(`Error getting directory size for ${dirPath}:`, error);
            return 0;
        }
    } else {
        // For Unix systems, we can use find with ignore patterns
        return new Promise((resolve, reject) => {
            let command = `du -sb "${dirPath}"`;
            if (ignoreFn) {
                // TODO: Implement ignore patterns for Unix systems if needed
                // This would require converting ignore patterns to find exclusions
            }

            exec(command, (error, stdout) => {
                if (error) reject(error);
                else resolve(parseInt(stdout.split('\t')[0]) || 0);
            });
        });
    }
}

async function getApproxFileCount(dirPath, ignoreFn = null) {
    if (process.platform === 'win32') {
        try {
            const { stdout } = await new Promise((resolve, reject) => {
                exec(
                    `powershell -command "Get-ChildItem '${dirPath}' -Recurse -File | Select-Object FullName | ConvertTo-Json"`,
                    { maxBuffer: 1024 * 1024 * 10 },
                    (error, stdout, stderr) => {
                        if (error) reject(error);
                        else resolve({ stdout, stderr });
                    }
                );
            });

            let files = JSON.parse(stdout);
            if (!Array.isArray(files) && files) {
                files = [files];
            }

            // Filter ignored files
            const count = files.filter(file => {
                const relativePath = path.relative(dirPath, file.FullName).replace(/\\/g, '/');
                return !ignoreFn || !ignoreFn(relativePath);
            }).length;

            return count;
        } catch (error) {
            console.warn(`Error getting file count for ${dirPath}:`, error);
            return 0;
        }
    } else {
        return new Promise((resolve, reject) => {
            let command = `find "${dirPath}" -type f | wc -l`;
            if (ignoreFn) {
                // TODO: Implement ignore patterns for Unix systems if needed
            }

            exec(command, (error, stdout) => {
                if (error) reject(error);
                else resolve(parseInt(stdout.trim()) || 0);
            });
        });
    }
}

async function getFolderStats(folderPath, excludePatterns = '', settings = {}) {
    // Initialize ignore patterns
    const ig = ignore();
    if (excludePatterns) {
        const patterns = excludePatterns.split(',')
            .map(p => p.trim())
            .filter(Boolean)
            .map(p => {
                // Ensure patterns like "./dist" match "dist"
                return p.startsWith('./') ? p.slice(2) : p;
            });
        ig.add(patterns);
    }

    if (settings.respectGitignore) {
        try {
            const gitignorePath = path.join(folderPath, '.gitignore');
            if (fsSync.existsSync(gitignorePath)) {
                const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
                ig.add(gitignoreContent.split('\n').filter(line => line.trim() && !line.startsWith('#')));
            }
        } catch (error) {
            console.warn('Error reading .gitignore:', error);
        }
    }

    if (settings.ignoreDotfiles) {
        ig.add(['.*', '.*/**']);
    }

    // Create a function to check if a path should be ignored
    const shouldIgnore = (relativePath) => {
        // Normalize the path for consistent matching
        const normalizedPath = relativePath.replace(/^\.[\\/]+/, '').replace(/\\/g, '/');
        return ig.ignores(normalizedPath);
    };

    // Quick check for common large directories first
    const quickCheck = async () => {
        const largeDirectories = [];

        for (const dir of COMMON_LARGE_DIRECTORIES) {
            const dirPath = path.join(folderPath, dir);
            try {
                if (fsSync.existsSync(dirPath)) {
                    // Check if the directory itself should be ignored
                    const relativeDirPath = path.relative(folderPath, dirPath).replace(/\\/g, '/');

                    if (shouldIgnore(relativeDirPath)) {
                        continue;
                    }

                    const stats = await fs.stat(dirPath);
                    if (stats.isDirectory()) {
                        const size = await getDirSize(dirPath, shouldIgnore);
                        if (size > SIZE_LIMITS.TOTAL_SIZE_MB * 1024 * 1024) {
                            largeDirectories.push({
                                path: dir,
                                sizeMB: size / (1024 * 1024),
                                fileCount: await getApproxFileCount(dirPath, shouldIgnore)
                            });
                        }
                    }
                }
            } catch (error) {
                console.warn(`Error checking ${dir}:`, error);
            }
        }

        if (largeDirectories.length > 0) {
            return {
                exceedsLimits: true,
                totalFiles: largeDirectories.reduce((acc, dir) => acc + dir.fileCount, 0),
                totalSizeMB: largeDirectories.reduce((acc, dir) => acc + dir.sizeMB, 0),
                largeDirectories,
                largeFiles: []
            };
        }

        return null;
    };

    // Try quick check first
    const quickResult = await quickCheck();
    if (quickResult) {
        return quickResult;
    }

    // If quick check passes, do a sampling-based scan
    let totalSize = 0;
    let fileCount = 0;
    const largeFiles = [];
    const largeDirectories = new Map();

    async function scanWithSampling(dir, depth = 0) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        // Sample entries if there are too many
        let samplesToProcess = entries;
        if (entries.length > 100 && depth > 0) {
            const sampleSize = Math.min(50, Math.floor(entries.length / 2));
            samplesToProcess = entries
                .sort(() => 0.5 - Math.random())
                .slice(0, sampleSize);
        }

        let dirSize = 0;
        let dirFileCount = 0;

        for (const entry of samplesToProcess) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(folderPath, fullPath).replace(/\\/g, '/');

            if (ig.ignores(relativePath)) continue;

            try {
                const stats = await fs.stat(fullPath);

                if (stats.isDirectory()) {
                    const subDirStats = await scanWithSampling(fullPath, depth + 1);
                    dirSize += subDirStats.size;
                    dirFileCount += subDirStats.fileCount;
                } else if (stats.size > SIZE_LIMITS.FILE_SIZE_MB * 1024 * 1024) {
                    largeFiles.push({
                        path: relativePath,
                        size: stats.size / (1024 * 1024)
                    });
                    dirSize += stats.size;
                    dirFileCount++;
                }
            } catch (error) {
                console.warn(`Error processing ${fullPath}:`, error);
            }
        }

        // Extrapolate if we sampled
        if (entries.length > samplesToProcess.length) {
            const ratio = entries.length / samplesToProcess.length;
            dirSize *= ratio;
            dirFileCount *= ratio;
        }

        totalSize += dirSize;
        fileCount += dirFileCount;

        return { size: dirSize, fileCount: dirFileCount };
    }

    await scanWithSampling(folderPath);

    const totalSizeMB = totalSize / (1024 * 1024);

    return {
        exceedsLimits:
            fileCount > SIZE_LIMITS.FOLDER_FILE_COUNT ||
            totalSizeMB > SIZE_LIMITS.TOTAL_SIZE_MB ||
            largeFiles.length > 0 ||
            largeDirectories.size > 0,
        totalFiles: Math.round(fileCount),
        totalSizeMB,
        largeDirectories: Array.from(largeDirectories.entries())
            .map(([dirPath, stats]) => ({
                path: dirPath === '.' ? 'Root Directory' : dirPath,
                fileCount: Math.round(stats.fileCount),
                sizeMB: stats.sizeMB
            }))
            .sort((a, b) => b.sizeMB - a.sizeMB),
        largeFiles: largeFiles.sort((a, b) => b.size - a.size)
    };
}

module.exports = {
    getFolderStats,
    getDirSize,
    getApproxFileCount
};
