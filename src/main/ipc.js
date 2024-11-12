const { ipcMain, dialog, clipboard } = require('electron');
const { getDatabase } = require('./database');
const {
    getFileStructure,
    handleUpdateFileExclusions
} = require('./fileStructure');
const { analyzeProject } = require('./analyzer');
const path = require('path');

// Global state to track current project context
let currentProjectPath = null;

async function updateProjectPatterns(projectId, includePatterns, excludePatterns) {
    const db = getDatabase();
    try {
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
}

function registerIpcHandlers(mainWindow) {
    const db = getDatabase();

    ipcMain.handle('open-directory', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle('get-file-structure', async (event, dirPath, includePatterns, excludePatterns) => {
        try {
            // If dirPath is relative, resolve it against currentProjectPath
            const isRelative = /^\.[\\/]/.test(dirPath) || !path.isAbsolute(dirPath);
            const absolutePath = isRelative && currentProjectPath
                ? path.resolve(currentProjectPath, dirPath)
                : dirPath;

            return await getFileStructure(absolutePath, includePatterns, excludePatterns, currentProjectPath);
        } catch (error) {
            console.error('Error getting file structure:', error);
            throw error;
        }
    });

    ipcMain.handle('analyze-project', async (event, projectId, projectPath, includePatterns, excludePatterns) => {
        try {
            // Update current project context
            currentProjectPath = projectPath;

            // Save the current patterns for this specific version
            await updateProjectPatterns(projectId, includePatterns, excludePatterns);

            // Update project path
            await db.runAsync(
                'UPDATE projects SET path = ? WHERE id = ?',
                [projectPath, projectId]
            );

            return analyzeProject(projectPath, includePatterns, excludePatterns);
        } catch (error) {
            console.error('Error analyzing project:', error);
            throw error;
        }
    });

    ipcMain.handle('create-project', async (event, name) => {
        return new Promise((resolve, reject) => {
            db.run('INSERT INTO projects (name) VALUES (?)', [name], function (err) {
                if (err) reject(err);
                resolve(this.lastID);
            });
        });
    });

    ipcMain.handle('get-projects', async () => {
        return await db.allAsync('SELECT * FROM projects WHERE parent_id IS NULL');
    });

    ipcMain.handle('set-project-path', async (event, id, path) => {
        currentProjectPath = path; // Update current project context
        await db.runAsync('UPDATE projects SET path = ? WHERE id = ?', [path, id]);
    });

    ipcMain.handle('get-project-patterns', async (event, projectId) => {
        try {
            const result = await db.getAsync(
                'SELECT include_patterns, exclude_patterns FROM projects WHERE id = ?',
                [projectId]
            );
            return {
                include_patterns: result?.include_patterns || '',
                exclude_patterns: result?.exclude_patterns || ''
            };
        } catch (error) {
            console.error('Error getting patterns:', error);
            return { include_patterns: '', exclude_patterns: '' };
        }
    });

    ipcMain.handle('deleteProject', async (event, projectId) => {
        try {
            // Get the project's path before deletion to compare with currentProjectPath
            const project = await db.getAsync('SELECT path FROM projects WHERE id = ?', [projectId]);
            
            // Delete the main project and all its versions
            await db.runAsync('DELETE FROM projects WHERE id = ? OR parent_id = ?', [projectId, projectId]);
            
            // Reset currentProjectPath if we're deleting the current project
            if (currentProjectPath && project && project.path === currentProjectPath) {
                currentProjectPath = null;
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
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
        await updateProjectPatterns(projectId, includePatterns, excludePatterns);
    });

    ipcMain.handle('updateFileExclusions', async (event, projectPath, structure, includePatterns, excludePatterns, changedPattern) => {
        try {
            console.log('IPC: updateFileExclusions called with pattern:', changedPattern);
            return await handleUpdateFileExclusions(
                projectPath,
                structure,
                includePatterns,
                excludePatterns,
                changedPattern
            );
        } catch (error) {
            console.error('Error occurred in handler for updateFileExclusions:', error);
            throw error;
        }
    });
}

exports.registerIpcHandlers = registerIpcHandlers;