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
            console.log(`Creating version from project id: ${projectId} with name: ${versionName}`);

            // Get the source project to copy settings from (this is the currently selected version)
            const sourceProject = await this.db.getAsync(
                'SELECT * FROM projects WHERE id = ?',
                [projectId]
            );

            if (!sourceProject) {
                throw new Error(`Source project with ID ${projectId} not found`);
            }

            // Determine the main project ID (to set as parent)
            let mainProjectId;
            if (sourceProject.parent_id) {
                // If source is a version, use its parent as the main project
                mainProjectId = sourceProject.parent_id;
            } else {
                // If source is already the main project, use its ID
                mainProjectId = sourceProject.id;
            }

            // Get the main project details for the name
            const mainProject = await this.db.getAsync(
                'SELECT name FROM projects WHERE id = ?',
                [mainProjectId]
            );

            if (!mainProject) {
                throw new Error(`Main project with ID ${mainProjectId} not found`);
            }

            console.log(`Creating new version with settings from source project ${sourceProject.id} (${sourceProject.version_name || 'main'}) 
                      and linking to main project ${mainProjectId}`);

            // Create the new version
            const newVersionId = await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO projects (
                name, path, include_patterns, exclude_patterns, 
                parent_id, version_name, respect_gitignore, ignore_dotfiles
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        mainProject.name,
                        sourceProject.path,
                        sourceProject.include_patterns,
                        sourceProject.exclude_patterns,
                        mainProjectId, // Always link to the main project
                        versionName,
                        sourceProject.respect_gitignore,
                        sourceProject.ignore_dotfiles
                    ],
                    function (err) {
                        if (err) reject(err);
                        resolve(this.lastID);
                    }
                );
            });

            // Copy module associations and their enabled/disabled states
            await this.copyModuleAssociations(sourceProject.id, newVersionId);

            return newVersionId;
        } catch (error) {
            console.error('Error creating project version:', error);
            throw error;
        }
    }

    async copyModuleAssociations(sourceVersionId, newVersionId) {
        try {
            // Get all modules associated with the main project
            const mainProjectId = await this.getMainProjectId(sourceVersionId);
            const modules = await this.db.allAsync(
                'SELECT id FROM modules WHERE project_id = ?',
                [mainProjectId]
            );

            // Get the module inclusion states from the source version
            const sourceInclusions = await this.db.allAsync(`
            SELECT module_id, is_included 
            FROM version_modules 
            WHERE version_id = ?
          `, [sourceVersionId]);

            // Create a map of module states from the source version
            const moduleStates = new Map();
            sourceInclusions.forEach(inc => {
                moduleStates.set(inc.module_id, inc.is_included);
            });

            // Copy all module states to the new version
            for (const module of modules) {
                // Default to included (true) if not found in the source version
                const isIncluded = moduleStates.has(module.id)
                    ? moduleStates.get(module.id)
                    : 1;

                await this.db.runAsync(`
              INSERT INTO version_modules (version_id, module_id, is_included)
              VALUES (?, ?, ?)
            `, [newVersionId, module.id, isIncluded]);
            }

            console.log(`Copied module associations from version ${sourceVersionId} to version ${newVersionId}`);
        } catch (error) {
            console.error('Error copying module associations:', error);
            throw error;
        }
    }

    async getMainProjectId(projectId) {
        const project = await this.db.getAsync(
            'SELECT id, parent_id FROM projects WHERE id = ?',
            [projectId]
        );

        if (!project) {
            throw new Error(`Project with ID ${projectId} not found`);
        }

        return project.parent_id || project.id;
    }

    async getProjectVersions(projectId) {
        try {
            // First, ensure we're getting the main project ID
            const project = await this.db.getAsync(
                'SELECT id, parent_id FROM projects WHERE id = ?',
                [projectId]
            );

            if (!project) {
                return [];
            }

            // If this is a version, use its parent_id to find all versions
            const mainProjectId = project.parent_id || project.id;

            return await this.db.allAsync(
                'SELECT * FROM projects WHERE parent_id = ? ORDER BY id DESC',
                [mainProjectId]
            );
        } catch (error) {
            console.error('Error getting project versions:', error);
            throw error;
        }
    }
}

module.exports = { ProjectHandlers };