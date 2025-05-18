const path = require('path');
const { exec } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const ignore = require('ignore');
const { SIZE_LIMITS, COMMON_LARGE_DIRECTORIES } = require('../constants');

/**
 * Gets the size of a directory quickly using OS-optimized methods
 * @param {string} dirPath - Path to the directory
 * @param {Function|null} ignoreFn - Optional function to check if a path should be ignored
 * @returns {Promise<number>} - Size in bytes
 */
async function getDirSize(dirPath, ignoreFn = null) {
    // If we need to apply ignore patterns, we have to use the slower method
    if (ignoreFn) {
        return getDetailedDirSize(dirPath, ignoreFn);
    }

    // Fast path for when no ignore function is provided
    if (process.platform === 'win32') {
        try {
            // Use Windows Script Host for fastest folder size calculation
            const vbsScript = `
                Set fso = CreateObject("Scripting.FileSystemObject")
                Set folder = fso.GetFolder("${dirPath.replace(/\\/g, '\\\\')}")
                WScript.Echo folder.Size
            `;

            const tempFile = path.join(os.tmpdir(), `get-size-${Date.now()}.vbs`);

            try {
                await fs.writeFile(tempFile, vbsScript);
                const { stdout } = await new Promise((resolve, reject) => {
                    exec(`cscript //NoLogo "${tempFile}"`, (error, stdout, stderr) => {
                        if (error) reject(error);
                        else resolve({ stdout, stderr });
                    });
                });

                await fs.unlink(tempFile); // Clean up temp file
                return parseInt(stdout.trim()) || 0;
            } catch (error) {
                console.warn(`Error getting folder size with VBS: ${error.message}`);
                try { await fs.unlink(tempFile); } catch { } // Try to clean up

                // Fallback to PowerShell if VBS fails
                return getPowerShellDirSize(dirPath);
            }
        } catch (error) {
            console.warn(`Error getting directory size for ${dirPath}:`, error);
            return 0;
        }
    } else {
        // For Unix systems, use du which is already optimized
        return new Promise((resolve, reject) => {
            // du -sb gives the total size in bytes
            exec(`du -sb "${dirPath}"`, (error, stdout) => {
                if (error) {
                    console.warn(`Error getting directory size with du: ${error.message}`);
                    reject(error);
                } else {
                    resolve(parseInt(stdout.split('\t')[0]) || 0);
                }
            });
        });
    }
}

/**
 * Gets directory size using PowerShell (fallback method for Windows)
 * @param {string} dirPath - Path to the directory
 * @returns {Promise<number>} - Size in bytes
 */
async function getPowerShellDirSize(dirPath) {
    try {
        // More efficient PowerShell command that calculates size directly
        // Using -File to only get files (not directories)
        // Using -Force to include hidden files
        // Using | Measure-Object directly on the output of Get-ChildItem
        const command = `powershell -command "Get-ChildItem -Path '${dirPath}' -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum | Select-Object -ExpandProperty Sum"`;

        const { stdout } = await new Promise((resolve, reject) => {
            exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve({ stdout, stderr });
            });
        });

        return parseInt(stdout.trim()) || 0;
    } catch (error) {
        console.warn(`Error getting folder size with PowerShell: ${error.message}`);
        return 0;
    }
}

/**
 * Original detailed scan method (only used when ignore patterns are needed)
 * @param {string} dirPath - Path to the directory
 * @param {Function} ignoreFn - Function to check if a path should be ignored
 * @returns {Promise<number>} - Size in bytes
 */
async function getDetailedDirSize(dirPath, ignoreFn) {
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
                if (!ignoreFn(relativePath)) {
                    totalSize += file.Length;
                }
            }

            return totalSize;
        } catch (error) {
            console.warn(`Error getting directory size for ${dirPath}:`, error);
            return 0;
        }
    } else {
        // For Unix systems with ignore patterns, we need a more complex approach
        try {
            // Create a temporary file to store find results
            const tempFile = path.join(os.tmpdir(), `find-results-${Date.now()}.txt`);

            // First get all files
            await new Promise((resolve, reject) => {
                exec(`find "${dirPath}" -type f -printf "%P\\t%s\\n" > "${tempFile}"`, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });

            // Read and process the results
            const fileContent = await fs.readFile(tempFile, 'utf8');
            await fs.unlink(tempFile); // Clean up

            let totalSize = 0;
            const lines = fileContent.split('\n');

            for (const line of lines) {
                if (!line.trim()) continue;

                const [relativePath, sizeStr] = line.split('\t');
                if (!ignoreFn(relativePath)) {
                    totalSize += parseInt(sizeStr) || 0;
                }
            }

            return totalSize;
        } catch (error) {
            console.warn(`Error getting directory size with find: ${error.message}`);

            // Fallback to du if find fails, but this won't respect ignore patterns
            return new Promise((resolve, reject) => {
                exec(`du -sb "${dirPath}"`, (error, stdout) => {
                    if (error) reject(error);
                    else resolve(parseInt(stdout.split('\t')[0]) || 0);
                });
            });
        }
    }
}

/**
 * Gets the approximate file count in a directory
 * @param {string} dirPath - Path to the directory
 * @param {Function|null} ignoreFn - Optional function to check if a path should be ignored
 * @returns {Promise<number>} - Number of files
 */
async function getApproxFileCount(dirPath, ignoreFn = null) {
    // Fast path when no ignore function is provided
    if (!ignoreFn) {
        if (process.platform === 'win32') {
            try {
                const command = `powershell -command "(Get-ChildItem '${dirPath}' -Recurse -File | Measure-Object).Count"`;
                const { stdout } = await new Promise((resolve, reject) => {
                    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                        if (error) reject(error);
                        else resolve({ stdout, stderr });
                    });
                });

                return parseInt(stdout.trim()) || 0;
            } catch (error) {
                console.warn(`Error getting file count: ${error.message}`);
                return 0;
            }
        } else {
            // For Unix systems, use find | wc -l which is already efficient
            return new Promise((resolve, reject) => {
                exec(`find "${dirPath}" -type f | wc -l`, (error, stdout) => {
                    if (error) reject(error);
                    else resolve(parseInt(stdout.trim()) || 0);
                });
            });
        }
    }

    // If we need to respect ignore patterns, use the original method
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
                return !ignoreFn(relativePath);
            }).length;

            return count;
        } catch (error) {
            console.warn(`Error getting file count for ${dirPath}:`, error);
            return 0;
        }
    } else {
        // For Unix with ignore patterns, similar approach as getDirSize
        try {
            const tempFile = path.join(os.tmpdir(), `find-paths-${Date.now()}.txt`);

            await new Promise((resolve, reject) => {
                exec(`find "${dirPath}" -type f -printf "%P\\n" > "${tempFile}"`, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });

            const fileContent = await fs.readFile(tempFile, 'utf8');
            await fs.unlink(tempFile);

            const lines = fileContent.split('\n');
            let count = 0;

            for (const line of lines) {
                if (line.trim() && !ignoreFn(line)) {
                    count++;
                }
            }

            return count;
        } catch (error) {
            console.warn(`Error getting file count with find: ${error.message}`);
            return new Promise((resolve, reject) => {
                exec(`find "${dirPath}" -type f | wc -l`, (error, stdout) => {
                    if (error) reject(error);
                    else resolve(parseInt(stdout.trim()) || 0);
                });
            });
        }
    }
}

/**
 * Finds all directories with a specific name under the given root path
 * Uses OS-specific commands for better performance
 * 
 * @param {string} rootPath - The path to start searching from
 * @param {string} dirName - The directory name to look for
 * @returns {Promise<string[]>} - Array of full paths to matching directories
 */
async function findDirectoriesByName(rootPath, dirName, shouldIgnore) {
    if (process.platform === 'win32') {
        return findDirectoriesWindows(rootPath, dirName, shouldIgnore);
    } else {
        return findDirectoriesUnix(rootPath, dirName);
    }
}

/**
 * Find directories with a specific name on Windows using PowerShell
 * 
 * @param {string} rootPath - The path to start searching from
 * @param {string} dirName - The directory name to look for
 * @returns {Promise<string[]>} - Array of full paths to matching directories
 */
async function findDirectoriesWindows(rootPath, dirName, shouldIgnore) {
    // Start with a queue containing just the root path
    let queue = [rootPath];
    let results = [];

    while (queue.length > 0) {
        const currentPath = queue.shift();
        const relativePath = path.relative(rootPath, currentPath).replace(/\\/g, '/');

        // Skip this directory if it should be ignored
        if (relativePath && shouldIgnore(relativePath)) {
            continue;
        }

        try {
            // Check if the current directory matches what we're looking for
            if (path.basename(currentPath) === dirName) {
                results.push(currentPath);
            }

            // Get subdirectories
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    queue.push(path.join(currentPath, entry.name));
                }
            }
        } catch (error) {
            // Silently skip directories we can't access
            continue;
        }
    }

    return results;
}

/**
 * Find directories with a specific name on Unix systems
 * 
 * @param {string} rootPath - The path to start searching from
 * @param {string} dirName - The directory name to look for
 * @returns {Promise<string[]>} - Array of full paths to matching directories
 */
async function findDirectoriesUnix(rootPath, dirName) {
    return new Promise((resolve, reject) => {
        // Use find to locate directories with the exact name
        // -type d finds directories only, -name matches the name exactly
        const command = `find "${rootPath}" -type d -name "${dirName}" 2>/dev/null`;

        exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                console.warn(`Error searching for ${dirName} directories: ${error.message}`);
                resolve([]); // Return empty array on error to continue processing
                return;
            }

            const paths = stdout.trim().split('\n').filter(Boolean);
            resolve(paths);
        });
    });
}

async function getFolderStats(folderPath, excludePatterns = '', settings = {}) {
    let patterneee = [];
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
        patterneee.push(patterns)
        ig.add(patterns);
    }

    if (settings.respectGitignore) {
        try {
            const gitignorePath = path.join(folderPath, '.gitignore');
            if (fsSync.existsSync(gitignorePath)) {
                const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
                patterneee.push(gitignoreContent.split('\n').filter(line => line.trim() && !line.startsWith('#')))

                ig.add(gitignoreContent.split('\n').filter(line => line.trim() && !line.startsWith('#')));
            }
        } catch (error) {
            console.warn('Error reading .gitignore:', error);
        }
    }

    if (settings.ignoreDotfiles) {
        ig.add(['.*', '.*/**']);

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
        const ignoredCommonDirs = COMMON_LARGE_DIRECTORIES.filter(dirName =>
            // Check if this common directory is in ignore patterns
            ig.ignores(dirName) || ig.ignores(`${dirName}/`)
        );

        // Only search for directories that aren't already ignored
        const dirsToCheck = COMMON_LARGE_DIRECTORIES.filter(
            dir => !ignoredCommonDirs.includes(dir)
        );

        // Instead of checking only direct subdirectories, find all matching directories at any depth
        for (const dirName of dirsToCheck) {
            try {
                // Find all directories with this name in the folder hierarchy
                const matchingDirPaths = await findDirectoriesByName(folderPath, dirName, shouldIgnore);
                for (const dirPath of matchingDirPaths) {
                    // Skip if the directory should be ignored
                    const relativeDirPath = path.relative(folderPath, dirPath).replace(/\\/g, '/');
                    if (shouldIgnore(relativeDirPath)) {
                        continue;
                    }

                    try {
                        // Check if it's actually a directory and get its size
                        const stats = await fs.stat(dirPath);
                        if (stats.isDirectory()) {
                            const size = await getDirSize(dirPath, shouldIgnore);

                            let fileCount = await getApproxFileCount(dirPath, shouldIgnore);
                            if (size > SIZE_LIMITS.TOTAL_SIZE_MB * 1024 * 1024 || fileCount > SIZE_LIMITS.FOLDER_FILE_COUNT) {
                                // Use the relative path for better display
                                largeDirectories.push({
                                    path: relativeDirPath,
                                    sizeMB: size / (1024 * 1024),
                                    fileCount: await getApproxFileCount(dirPath, shouldIgnore)
                                });
                            }
                        }
                    } catch (error) {
                        console.warn(`Error checking ${dirPath}:`, error);
                    }
                }
            } catch (error) {
                console.warn(`Error finding ${dirName} directories:`, error);
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