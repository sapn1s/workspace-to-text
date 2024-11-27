const { ipcMain } = require('electron');
const { projectState } = require('../../state/ProjectState');

class ProjectHandlers {
    constructor(db) {
        this.db = db;
    }

    register() {
        ipcMain.handle('project:create', this.createProject.bind(this));
        ipcMain.handle('project:list', this.getProjects.bind(this));
        ipcMain.handle('project:setPath', this.setProjectPath.bind(this));
        ipcMain.handle('project:delete', this.deleteProject.bind(this));
        ipcMain.handle('project:getSettings', (_, projectId) => this.getProjectSettings(projectId));
        ipcMain.handle('project:getPatterns', (_, projectId) => this.getProjectPatterns(projectId));
        ipcMain.handle('project:updatePatterns', (_, args) => this.updateProjectPatterns(args));
        ipcMain.handle('project:createVersion', (_, args) => this.createProjectVersion(args));
        ipcMain.handle('project:getVersions', (_, projectId) => this.getProjectVersions(projectId));
    }

    async createProject(_, name) {
        try {
            return await new Promise((resolve, reject) => {
                this.db.run('INSERT INTO projects (name) VALUES (?)', [name], function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                });
            });
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    }

    async getProjects() {
        try {
            return await this.db.allAsync(`
                SELECT * FROM projects 
                ORDER BY CASE 
                    WHEN parent_id IS NULL THEN 0 
                    ELSE 1 
                END, 
                id ASC
            `);
        } catch (error) {
            console.error('Error getting projects:', error);
            throw error;
        }
    }

    async setProjectPath(_, { id, path }) {
        try {
            projectState.setCurrentPath(path);
            await this.db.runAsync('UPDATE projects SET path = ? WHERE id = ?', [path, id]);
            return true;
        } catch (error) {
            console.error('Error setting project path:', error);
            throw error;
        }
    }

    async deleteProject(_, projectId) {
        try {
            const project = await this.db.getAsync('SELECT path FROM projects WHERE id = ?', [projectId]);
            
            await this.db.runAsync(
                'DELETE FROM projects WHERE id = ? OR parent_id = ?',
                [projectId, projectId]
            );

            if (project?.path === projectState.getCurrentPath()) {
                projectState.clearCurrentPath();
            }
            
            return true;
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    }

    async getProjectSettings(projectId) {
        try {
            const settings = await this.db.getAsync(
                'SELECT respect_gitignore, ignore_dotfiles FROM projects WHERE id = ?',
                [projectId]
            );
            return {
                respectGitignore: Boolean(settings?.respect_gitignore),
                ignoreDotfiles: Boolean(settings?.ignore_dotfiles)
            };
        } catch (error) {
            console.error('Error getting project settings:', error);
            throw error;
        }
    }

    async getProjectPatterns(projectId) {
        try {
            const result = await this.db.getAsync(`
                SELECT 
                    COALESCE(include_patterns, '') as include_patterns,
                    COALESCE(exclude_patterns, '') as exclude_patterns
                FROM projects 
                WHERE id = ?
            `, [projectId]);

            return {
                include_patterns: result?.include_patterns || '',
                exclude_patterns: result?.exclude_patterns || ''
            };
        } catch (error) {
            console.error('Error getting project patterns:', error);
            throw error;
        }
    }

    async updateProjectPatterns({ projectId, includePatterns, excludePatterns }) {
        try {
            const sanitizedInclude = includePatterns || '';
            const sanitizedExclude = excludePatterns || '';

            await this.db.runAsync(`
                UPDATE projects 
                SET include_patterns = ?,
                    exclude_patterns = ? 
                WHERE id = ?
            `, [sanitizedInclude, sanitizedExclude, projectId]);

            const updated = await this.db.getAsync(
                'SELECT include_patterns, exclude_patterns FROM projects WHERE id = ?',
                [projectId]
            );

            return {
                include_patterns: updated?.include_patterns || '',
                exclude_patterns: updated?.exclude_patterns || ''
            };
        } catch (error) {
            console.error('Error updating patterns:', error);
            throw error;
        }
    }

    async createProjectVersion({ projectId, versionName }) {
        try {
            const parentProject = await this.db.getAsync(
                'SELECT * FROM projects WHERE id = ?',
                [projectId]
            );

            if (!parentProject) {
                throw new Error(`Parent project with ID ${projectId} not found`);
            }

            if (parentProject.parent_id) {
                throw new Error('Cannot create a version of a version');
            }

            return new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO projects (
                        name, path, include_patterns, exclude_patterns, 
                        parent_id, version_name
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        parentProject.name,
                        parentProject.path,
                        parentProject.include_patterns,
                        parentProject.exclude_patterns,
                        projectId,
                        versionName
                    ],
                    function(err) {
                        if (err) reject(err);
                        resolve(this.lastID);
                    }
                );
            });
        } catch (error) {
            console.error('Error creating project version:', error);
            throw error;
        }
    }

    async getProjectVersions(projectId) {
        try {
            return await this.db.allAsync(
                'SELECT * FROM projects WHERE parent_id = ? ORDER BY id DESC',
                [projectId]
            );
        } catch (error) {
            console.error('Error getting project versions:', error);
            throw error;
        }
    }
}

module.exports = { ProjectHandlers };
