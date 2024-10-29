const electron = require('electron');
const { app, BrowserWindow, ipcMain, dialog, clipboard } = electron;
const path = require('path');
const fs = require('fs');
const ignore = require('ignore');
const mime = require('mime-types');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

let mainWindow;
let db;

const DEFAULT_EXCLUDES = [
    '.git/**',
    '.git',
    'node_modules/**',
    'node_modules',
    '.next/**',
    '.next',
    'build/**',
    'build',
    'dist/**',
    'dist',
    '.vscode/**',
    '.vscode',
    '.idea/**',
    '.idea'
];


// Promisify database methods outside the initialization
function promisifyDB(db) {
    // Promisify specific methods we need
    db.getAsync = promisify(db.get).bind(db);
    db.allAsync = promisify(db.all).bind(db);
    db.runAsync = promisify(db.run).bind(db);
    return db;
}

function initDatabase() {
    return new Promise((resolve, reject) => {
        const dbPath = path.join(app.getPath('userData'), 'projects.sqlite');
        const database = new sqlite3.Database(dbPath, async (err) => {
            if (err) return reject(err);

            try {
                // Promisify the database methods
                db = promisifyDB(database);

                // Now we can use async/await with the database
                const tableInfo = await db.allAsync("PRAGMA table_info(projects)");
                console.log('Current table schema:', tableInfo);

                await db.runAsync(`
                    CREATE TABLE IF NOT EXISTS projects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT,
                        path TEXT,
                        include_patterns TEXT,
                        exclude_patterns TEXT,
                        parent_id INTEGER NULL,
                        version_name TEXT NULL,
                        FOREIGN KEY(parent_id) REFERENCES projects(id)
                    )
                `);

                resolve();
            } catch (error) {
                console.error('Database initialization error:', error);
                reject(error);
            }
        });
    });
}

function registerIpcHandlers() {
    ipcMain.handle('open-directory', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle('analyze-project', async (event, projectId, projectPath, includePatterns, excludePatterns) => {
        // Save the current patterns for this specific version
        await updateProjectPatterns(projectId, includePatterns, excludePatterns);

        // If this is a version, also update its path
        await db.runAsync('UPDATE projects SET path = ? WHERE id = ?', [projectPath, projectId]);

        return analyzeProject(projectPath, includePatterns, excludePatterns);
    });

    ipcMain.handle('create-project', async (event, name) => {
        return new Promise((resolve, reject) => {
            db.run('INSERT INTO projects (name) VALUES (?)', [name], function (err) {
                if (err) reject(err);
                resolve(this.lastID); // 'this' contains the lastID
            });
        });
    });
    ipcMain.handle('get-projects', async () => {
        // Only return projects that don't have a parent_id (main projects), so we dont add copies of versions
        return await db.allAsync('SELECT * FROM projects WHERE parent_id IS NULL');
    });

    ipcMain.handle('set-project-path', async (event, id, path) => {
        await db.runAsync('UPDATE projects SET path = ? WHERE id = ?', [path, id]);
    });

    ipcMain.handle('get-project-patterns', async (event, projectId) => {
        try {
            const result = await db.getAsync(
                'SELECT include_patterns, exclude_patterns FROM projects WHERE id = ?',
                [projectId]
            );
            console.log('Raw database result:', result);
            console.log('exclude_patterns type:', typeof result.exclude_patterns);
            console.log('exclude_patterns value:', result.exclude_patterns);
    
            return {
                include_patterns: result.include_patterns || '',
                exclude_patterns: result.exclude_patterns ? String(result.exclude_patterns) : ''
            };
        } catch (error) {
            console.error('Error getting patterns:', error);
            return { include_patterns: '', exclude_patterns: '' };
        }
    });

    ipcMain.handle('deleteProject', async (event, projectId) => {
        await db.runAsync('DELETE FROM projects WHERE id = ?', [projectId]);
    });

    ipcMain.handle('copy-to-clipboard', (event, text) => {
        clipboard.writeText(text);
    });

    ipcMain.handle('create-project-version', async (event, projectId, versionName) => {
        try {
            const project = await db.getAsync('SELECT * FROM projects WHERE id = ?', [projectId]);
            if (!project) {
                throw new Error('Project not found');
            }

            // For versions, use parent_id if it exists, otherwise use the current project's id
            const mainProjectId = project.parent_id || project.id;

            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO projects (name, path, include_patterns, exclude_patterns, parent_id, version_name) VALUES (?, ?, ?, ?, ?, ?)',
                    [project.name, project.path, project.include_patterns, project.exclude_patterns, mainProjectId, versionName],
                    function (err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(this.lastID);
                    }
                );
            });
        } catch (error) {
            console.error('Error creating project version:', error);
            throw error;
        }
    });

    ipcMain.handle('get-project-versions', async (event, projectId) => {
        return await db.allAsync(
            'SELECT * FROM projects WHERE parent_id = ? ORDER BY id DESC',
            [projectId]
        );
    });


    ipcMain.handle('update-project-patterns', async (event, projectId, includePatterns, excludePatterns) => {
        try {
            // Debug what we're trying to store
            console.log('Storing patterns:', {
                projectId,
                includePatterns: String(includePatterns || ''),
                excludePatterns: String(excludePatterns || '')
            });

            await db.runAsync(
                'UPDATE projects SET include_patterns = ?, exclude_patterns = ? WHERE id = ?',
                [
                    String(includePatterns || ''),
                    String(excludePatterns || ''),
                    projectId
                ]
            );
        } catch (error) {
            console.error('Error updating patterns:', error);
            throw error;
        }
    });
}

async function getFileStructure(dirPath, includePatterns, excludePatterns) {
    // Create ignore instance with defaults
    const ig = ignore().add(DEFAULT_EXCLUDES);

    // Add .gitignore rules if available
    const gitignoreRules = readGitignore(dirPath);
    if (gitignoreRules.length > 0) {
        ig.add(gitignoreRules);
    }

    // Add exclude patterns if they exist
    if (excludePatterns) {
        const patterns = typeof excludePatterns === 'string'
            ? excludePatterns.split(',').map(p => p.trim())
            : [];
        ig.add(patterns);
    }

    // Normalize include patterns
    const includeRegexes = includePatterns && typeof includePatterns === 'string'
        ? includePatterns.split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(pattern => new RegExp(pattern.replace(/\*/g, '.*')))
        : null;

    async function processDirectory(dir) {
        try {
            const items = [];
            const files = await readdirAsync(dir);

            // Process all stat operations in parallel
            const statsPromises = files.map(async file => {
                const fullPath = path.join(dir, file);
                const relativePath = path.relative(dirPath, fullPath);

                try {
                    const stats = await statAsync(fullPath);
                    return { file, fullPath, relativePath, stats };
                } catch (error) {
                    console.warn(`Error accessing ${fullPath}:`, error);
                    return null;
                }
            });

            const results = await Promise.all(statsPromises);

            const processPromises = results
                .filter(result => result !== null)
                .map(async ({ file, fullPath, relativePath, stats }) => {
                    const isExcluded = ig.ignores(relativePath);

                    // Check if path should be included based on include patterns
                    const shouldInclude = !includeRegexes ||
                        includeRegexes.some(regex => regex.test(relativePath));

                    if (stats.isDirectory()) {
                        // If directory is excluded, return it as an excluded folder without scanning contents
                        if (isExcluded) {
                            return {
                                type: 'folder',
                                name: file,
                                path: fullPath,
                                excluded: true,
                                children: [] // Empty children array for excluded directories
                            };
                        }

                        // Only process non-excluded directories
                        const children = await processDirectory(fullPath);
                        // Include directory if it matches patterns or has matching children
                        if (shouldInclude || children.length > 0) {
                            return {
                                type: 'folder',
                                name: file,
                                path: fullPath,
                                excluded: isExcluded,
                                children: children
                            };
                        }
                    } else if (shouldInclude && isTextFile(fullPath)) {
                        return {
                            type: 'file',
                            name: file,
                            path: fullPath,
                            excluded: isExcluded
                        };
                    }
                    return null;
                });

            const processedItems = (await Promise.all(processPromises))
                .filter(item => item !== null)
                .sort((a, b) => {
                    if (a.type === b.type) {
                        return a.name.localeCompare(b.name);
                    }
                    return a.type === 'folder' ? -1 : 1;
                });

            return processedItems;
        } catch (error) {
            console.error('Error processing directory:', dir, error);
            return [];
        }
    }

    try {
        await statAsync(dirPath);
        return await processDirectory(dirPath);
    } catch (error) {
        console.error('Error accessing root directory:', error);
        return [];
    }
}

function getFileContent(filePath) {
    try {
        if (!isTextFile(filePath)) {
            return '[Binary file - content not displayed]';
        }
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return `Error reading file: ${error.message}`;
    }
}

// Add this to your existing IPC handlers in electron.js:
ipcMain.handle('get-file-structure', async (event, dirPath, includePatterns, excludePatterns) => {
    try {
        return await getFileStructure(dirPath, includePatterns, excludePatterns);
    } catch (error) {
        console.error('Error getting file structure:', error);
        throw error;
    }
});

async function createWindow() {
    try {
        await initDatabase();

        mainWindow = new BrowserWindow({
            width: 900,
            height: 680,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: true,
                preload: path.join(__dirname, 'preload.js')
            }
        });

        mainWindow.loadURL(
            !app.isPackaged
                ? 'http://localhost:4000'
                : `file://${path.join(__dirname, '../build/index.html')}`
        );

        if (app.isPackaged) {
            mainWindow.setMenu(null);
        }

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

        registerIpcHandlers();
    } catch (error) {
        console.error('Error creating window:', error);
        app.quit();
    }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

function shouldInclude(filePath, includePatterns) {
    if (!includePatterns) return true;
    const patterns = includePatterns.split(',').map(pattern => pattern.trim());
    return patterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filePath);
    });
}

function readGitignore(rootDir) {
    const gitignorePath = path.join(rootDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        return fs.readFileSync(gitignorePath, 'utf8').split('\n').filter(line => line.trim() !== '');
    }
    return [];
}

function traverseDirectory(dir, level = 0, rootDir, ig, includePatterns) {
    let output = '';
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const relativePath = path.relative(rootDir, filePath);

        if (!ig.ignores(relativePath) && shouldInclude(relativePath, includePatterns)) {
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

function getFileContent(filePath) {
    if (!isTextFile(filePath)) {
        return '[Binary file not displayed]';
    }
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return `Error reading file: ${error.message}`;
    }
}
function getAllFilePaths(dir, rootDir, ig, includePatterns, result = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const relativePath = path.relative(rootDir, filePath);

        if (!ig.ignores(relativePath) && shouldInclude(relativePath, includePatterns)) {
            if (stats.isDirectory()) {
                getAllFilePaths(filePath, rootDir, ig, includePatterns, result);
            } else if (isTextFile(filePath)) {
                result.push(relativePath);
            }
        }
    });

    return result;
}

function analyzeProject(rootDir, includePatterns, excludePatterns) {
    const gitignoreRules = readGitignore(rootDir);
    const ig = ignore().add(gitignoreRules);

    if (excludePatterns) {
        ig.add(excludePatterns.split(',').map(pattern => pattern.trim()));
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

async function updateProjectPatterns(projectId, includePatterns, excludePatterns) {
    await db.runAsync(
        'UPDATE projects SET include_patterns = ?, exclude_patterns = ? WHERE id = ?',
        [includePatterns, excludePatterns, projectId]
    );
}

function isTextFile(filePath) {
    try {
        const mimeType = mime.lookup(filePath) || '';
        const ext = path.extname(filePath).toLowerCase();

        // List of known text file extensions
        const textExtensions = [
            '.txt', '.js', '.jsx', '.ts', '.tsx', '.md', '.json', '.yml',
            '.yaml', '.css', '.scss', '.less', '.html', '.xml', '.svg',
            '.env', '.config', '.lock', '.map', '.vue', '.php', '.py',
            '.rb', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go',
            '.rs', '.sql', '.sh', '.bash', '.conf', '.ini', '.gitignore',
            '.dockerignore', '.editorconfig', '.eslintrc', '.prettierrc'
        ];

        // Skip binary and media files
        const binaryExtensions = [
            '.woff', '.woff2', '.ttf', '.eot', '.otf', // Fonts
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp', // Images
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', // Documents
            '.zip', '.rar', '.7z', '.tar', '.gz', // Archives
            '.mp3', '.wav', '.ogg', '.mp4', '.avi', '.mov', // Media
            '.dll', '.exe', '.so', '.dylib', // Binaries
        ];

        if (binaryExtensions.includes(ext)) {
            return false;
        }

        return textExtensions.includes(ext) ||
            mimeType.startsWith('text/') ||
            mimeType === 'application/json';
    } catch (error) {
        console.error('Error checking file type:', error);
        return false;
    }
}

const textExtensionsSet = new Set([
    'txt', 'js', 'jsx', 'ts', 'tsx', 'md', 'json', 'yml',
    'yaml', 'css', 'scss', 'less', 'html', 'xml', 'svg',
    'env', 'config', 'lock', 'map', 'vue', 'php', 'py',
    'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go',
    'rs', 'sql', 'sh', 'bash', 'conf', 'ini', 'gitignore',
    'dockerignore', 'editorconfig', 'eslintrc', 'prettierrc'
]);

const binaryExtensionsSet = new Set([
    'woff', 'woff2', 'ttf', 'eot', 'otf',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'webp',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'rar', '7z', 'tar', 'gz',
    'mp3', 'wav', 'ogg', 'mp4', 'avi', 'mov',
    'dll', 'exe', 'so', 'dylib'
]);

function isTextFile(filePath) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    if (binaryExtensionsSet.has(ext)) return false;
    if (textExtensionsSet.has(ext)) return true;

    // Fallback to mime type check only if necessary
    try {
        const mimeType = mime.lookup(filePath) || '';
        return mimeType.startsWith('text/') || mimeType === 'application/json';
    } catch {
        return false;
    }
}