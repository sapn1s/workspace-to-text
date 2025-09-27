const { ipcMain } = require('electron');
const { projectState } = require('../../../state/ProjectState');

class ProjectCRUD {
    constructor(db) {
        this.db = db;
    }

    register() {
        ipcMain.handle('project:create', this.createProject.bind(this));
        ipcMain.handle('project:list', this.getProjects.bind(this));
        ipcMain.handle('project:setPath', this.setProjectPath.bind(this));
        ipcMain.handle('project:delete', this.deleteProject.bind(this));
        ipcMain.handle('project:rename', this.renameProject.bind(this));
    }

    async createProject(_, name) {
        try {
            return await new Promise((resolve, reject) => {
                this.db.run('INSERT INTO projects (name) VALUES (?)', [name], function (err) {
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
            const project = await this.db.getAsync('SELECT path, parent_id FROM projects WHERE id = ?', [projectId]);

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

    async renameProject(_, { id, name }) {
        try {
            await this.db.runAsync('UPDATE projects SET name = ? WHERE id = ?', [name, id]);
            return true;
        } catch (error) {
            console.error('Error renaming project:', error);
            throw error;
        }
    }

    // Utility method used by other handlers
    async getMainProjectId(projectId) {
        const mainProjectResult = await this.db.getAsync(`
            WITH RECURSIVE find_main_project AS (
                SELECT id, parent_id, name FROM projects WHERE id = ?
                UNION ALL
                SELECT p.id, p.parent_id, p.name
                FROM projects p
                INNER JOIN find_main_project fmp ON p.id = fmp.parent_id
            )
            SELECT id as main_project_id, name 
            FROM find_main_project 
            WHERE parent_id IS NULL
            LIMIT 1
        `, [projectId]);

        if (!mainProjectResult) {
            throw new Error(`Could not find main project for project ID ${projectId}`);
        }

        return mainProjectResult.main_project_id;
    }
}

module.exports = { ProjectCRUD };