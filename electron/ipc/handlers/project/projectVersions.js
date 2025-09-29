const { ipcMain } = require('electron');
const { projectState } = require('../../../state/ProjectState');
const { ProjectCRUD } = require('./projectCRUD');

class ProjectVersions {
    constructor(db) {
        this.db = db;
        this.projectCRUD = new ProjectCRUD(db);
    }

    register() {
        ipcMain.handle('project:createVersion', (_, args) => this.createProjectVersion(args));
        ipcMain.handle('project:getVersions', (_, mainProjectId) => this.getProjectVersions(mainProjectId));
        ipcMain.handle('project:deleteVersion', this.deleteVersion.bind(this));
        ipcMain.handle('project:renameVersion', this.renameVersion.bind(this));
        ipcMain.handle('project:moveVersion', this.moveVersion.bind(this));
        ipcMain.handle('project:getAvailableParents', this.getAvailableParents.bind(this));
    }

    async createProjectVersion({ projectId, versionName, copyFromMain = false }) {
        try {
            console.log(`Creating version from project id: ${projectId} with name: ${versionName}, copyFromMain: ${copyFromMain}`);

            const sourceProject = await this.db.getAsync(
                'SELECT * FROM projects WHERE id = ?',
                [projectId]
            );

            if (!sourceProject) {
                throw new Error(`Source project with ID ${projectId} not found`);
            }

            // Use the utility method to get the true main project
            const mainProjectId = await this.projectCRUD.getMainProjectId(projectId);

            const mainProject = await this.db.getAsync(
                'SELECT * FROM projects WHERE id = ?',
                [mainProjectId]
            );

            if (!mainProject) {
                throw new Error(`Main project with ID ${mainProjectId} not found`);
            }

            let settingsSource;
            let parentId;

            if (copyFromMain) {
                settingsSource = mainProject;
                parentId = mainProjectId;
                console.log(`Creating fresh version from main project ${mainProjectId}`);
            } else {
                settingsSource = sourceProject;
                parentId = projectId;
                console.log(`Creating branched version from current selection ${projectId}`);
            }

            const newVersionId = await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO projects (
                        name, path, exclude_patterns, 
                        parent_id, version_name, respect_gitignore, ignore_dotfiles
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        mainProject.name,
                        settingsSource.path,
                        settingsSource.exclude_patterns,
                        parentId,
                        versionName,
                        settingsSource.respect_gitignore,
                        settingsSource.ignore_dotfiles
                    ],
                    function (err) {
                        if (err) reject(err);
                        resolve(this.lastID);
                    }
                );
            });

            await this.copyModuleAssociations(settingsSource.id, newVersionId, mainProjectId);

            console.log(`Successfully created version ${newVersionId} with parent ${parentId}`);
            return newVersionId;
        } catch (error) {
            console.error('Error creating project version:', error);
            throw error;
        }
    }

    async copyModuleAssociations(sourceVersionId, newVersionId, passedMainProjectId) {
        try {
            const actualMainProjectId = await this.projectCRUD.getMainProjectId(passedMainProjectId);

            const modules = await this.db.allAsync(
                'SELECT id FROM modules WHERE project_id = ?',
                [actualMainProjectId]
            );

            const sourceInclusions = await this.db.allAsync(`
                SELECT module_id, is_included 
                FROM version_modules 
                WHERE version_id = ?
            `, [sourceVersionId]);

            const moduleStates = new Map();
            sourceInclusions.forEach(inc => {
                moduleStates.set(inc.module_id, inc.is_included);
            });

            for (const module of modules) {
                const isIncluded = moduleStates.has(module.id)
                    ? moduleStates.get(module.id)
                    : 0;

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

    async getProjectVersions(mainProjectId) {
        try {
            // Get the main project
            const mainProject = await this.db.getAsync(`
            SELECT * FROM projects WHERE id = ? AND parent_id IS NULL
        `, [mainProjectId]);

            if (!mainProject) {
                console.error(`Main project with ID ${mainProjectId} not found or is not a main project`);
                return [];
            }

            // Get ALL versions in the tree (recursive)
            const allVersions = await this.db.allAsync(`
            WITH RECURSIVE project_tree AS (
                -- Start with direct children of main project
                SELECT id, name, path, include_patterns, exclude_patterns, 
                       parent_id, version_name, respect_gitignore, ignore_dotfiles
                FROM projects 
                WHERE parent_id = ?
                
                UNION ALL
                
                -- Recursively get children of children
                SELECT p.id, p.name, p.path, p.include_patterns, p.exclude_patterns,
                       p.parent_id, p.version_name, p.respect_gitignore, p.ignore_dotfiles
                FROM projects p
                INNER JOIN project_tree pt ON p.parent_id = pt.id
            )
            SELECT * FROM project_tree
            ORDER BY id DESC
        `, [mainProjectId]);

            // Return main project + all versions
            const result = [mainProject, ...allVersions];
            console.log(`Found main project + ${allVersions.length} versions (including nested) for main project ${mainProjectId}`);
            return result;
        } catch (error) {
            console.error('Error getting project versions:', error);
            throw error;
        }
    }

    async deleteVersion(_, versionId) {
        try {
            const version = await this.db.getAsync('SELECT path, parent_id, version_name FROM projects WHERE id = ?', [versionId]);

            if (!version) {
                throw new Error('Version not found');
            }

            await this.db.runAsync('DELETE FROM projects WHERE id = ?', [versionId]);

            if (version.path === projectState.getCurrentPath()) {
                projectState.clearCurrentPath();
            }

            console.log(`Deleted version "${version.version_name}" (ID: ${versionId})`);
            return true;
        } catch (error) {
            console.error('Error deleting version:', error);
            throw error;
        }
    }

    async renameVersion(_, { versionId, newName }) {
        try {
            const version = await this.db.getAsync(
                'SELECT id, parent_id, version_name FROM projects WHERE id = ?',
                [versionId]
            );

            if (!version) {
                throw new Error('Version not found');
            }

            if (!version.parent_id) {
                throw new Error('Cannot rename main project using this method');
            }

            await this.db.runAsync(
                'UPDATE projects SET version_name = ? WHERE id = ?',
                [newName, versionId]
            );

            console.log(`Renamed version ${versionId} to "${newName}"`);
            return true;
        } catch (error) {
            console.error('Error renaming version:', error);
            throw error;
        }
    }

    async moveVersion(_, { versionId, newParentId }) {
        try {
            const version = await this.db.getAsync(
                'SELECT id, parent_id, version_name FROM projects WHERE id = ?',
                [versionId]
            );

            if (!version) {
                throw new Error('Version not found');
            }

            if (!version.parent_id) {
                throw new Error('Cannot move main project');
            }

            const newParent = await this.db.getAsync(
                'SELECT id, parent_id FROM projects WHERE id = ?',
                [newParentId]
            );

            if (!newParent) {
                throw new Error('New parent not found');
            }

            if (await this.wouldCreateCircularDependency(versionId, newParentId)) {
                throw new Error('Cannot move version: would create circular dependency');
            }

            await this.db.runAsync(
                'UPDATE projects SET parent_id = ? WHERE id = ?',
                [newParentId, versionId]
            );

            console.log(`Moved version ${versionId} to parent ${newParentId}`);
            return true;
        } catch (error) {
            console.error('Error moving version:', error);
            throw error;
        }
    }

    async getAvailableParents(_, { versionId }) {
        try {
            const version = await this.db.getAsync(
                'SELECT id, parent_id FROM projects WHERE id = ?',
                [versionId]
            );

            if (!version) {
                throw new Error('Version not found');
            }

            const mainProjectId = await this.projectCRUD.getMainProjectId(versionId);

            const allVersions = await this.db.allAsync(`
                WITH RECURSIVE project_tree AS (
                    SELECT id, name, parent_id, version_name
                    FROM projects 
                    WHERE id = ? AND parent_id IS NULL
                    
                    UNION ALL
                    
                    SELECT p.id, p.name, p.parent_id, p.version_name
                    FROM projects p
                    INNER JOIN project_tree pt ON p.parent_id = pt.id
                )
                SELECT * FROM project_tree
            `, [mainProjectId]);

            const descendants = await this.getDescendants(versionId);
            const availableParents = allVersions.filter(v =>
                v.id !== versionId && !descendants.includes(v.id)
            );

            return availableParents;
        } catch (error) {
            console.error('Error getting available parents:', error);
            throw error;
        }
    }

    async wouldCreateCircularDependency(versionId, newParentId) {
        const descendants = await this.getDescendants(versionId);
        return descendants.includes(newParentId);
    }

    async getDescendants(parentId) {
        const descendants = [];
        const children = await this.db.allAsync(
            'SELECT id FROM projects WHERE parent_id = ?',
            [parentId]
        );

        for (const child of children) {
            descendants.push(child.id);
            const childDescendants = await this.getDescendants(child.id);
            descendants.push(...childDescendants);
        }

        return descendants;
    }
}

module.exports = { ProjectVersions };