const { ipcMain } = require('electron');

class ProjectSettings {
    constructor(db) {
        this.db = db;
    }

    register() {
        ipcMain.handle('project:getSettings', (_, projectId) => this.getProjectSettings(projectId));
        ipcMain.handle('project:getPatterns', (_, projectId) => this.getProjectPatterns(projectId));
        ipcMain.handle('project:updatePatterns', (_, args) => this.updateProjectPatterns(args));
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
                    COALESCE(exclude_patterns, '') as exclude_patterns
                FROM projects 
                WHERE id = ?
            `, [projectId]);

            return {
                exclude_patterns: result?.exclude_patterns || ''
            };
        } catch (error) {
            console.error('Error getting project patterns:', error);
            throw error;
        }
    }

    async updateProjectPatterns({ projectId, excludePatterns }) {
        try {
            const sanitizedExclude = excludePatterns || '';

            await this.db.runAsync(`
                UPDATE projects 
                SET exclude_patterns = ? 
                WHERE id = ?
            `, [sanitizedExclude, projectId]);

            const updated = await this.db.getAsync(
                'SELECT exclude_patterns FROM projects WHERE id = ?',
                [projectId]
            );

            return {
                exclude_patterns: updated?.exclude_patterns || ''
            };
        } catch (error) {
            console.error('Error updating patterns:', error);
            throw error;
        }
    }
}

module.exports = { ProjectSettings };