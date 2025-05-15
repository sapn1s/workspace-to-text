const { ipcMain } = require('electron');

class ModuleHandlers {
    constructor(db) {
        this.db = db;
    }

    async initModulesDB() {
        try {
            // Create modules table
            await this.db.runAsync(`
                CREATE TABLE IF NOT EXISTS modules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
                )
            `);

            // Create module patterns table
            await this.db.runAsync(`
                CREATE TABLE IF NOT EXISTS module_patterns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    module_id INTEGER,
                    pattern TEXT NOT NULL,
                    FOREIGN KEY(module_id) REFERENCES modules(id) ON DELETE CASCADE
                )
            `);

            // Create module dependencies table
            await this.db.runAsync(`
                CREATE TABLE IF NOT EXISTS module_dependencies (
                    parent_module_id INTEGER,
                    child_module_id INTEGER,
                    FOREIGN KEY(parent_module_id) REFERENCES modules(id) ON DELETE CASCADE,
                    FOREIGN KEY(child_module_id) REFERENCES modules(id) ON DELETE CASCADE,
                    PRIMARY KEY(parent_module_id, child_module_id)
                )
            `);

            // Create version modules table
            await this.db.runAsync(`
                CREATE TABLE IF NOT EXISTS version_modules (
                    version_id INTEGER,
                    module_id INTEGER,
                    is_included BOOLEAN DEFAULT 1,
                    FOREIGN KEY(version_id) REFERENCES projects(id) ON DELETE CASCADE,
                    FOREIGN KEY(module_id) REFERENCES modules(id) ON DELETE CASCADE,
                    PRIMARY KEY(version_id, module_id)
                )
            `);
        } catch (error) {
            console.error('Error initializing modules database:', error);
            throw error;
        }
    }

    register() {
        // Module CRUD operations
        ipcMain.handle('modules:create', this.createModule.bind(this));
        ipcMain.handle('modules:update', this.updateModule.bind(this));
        ipcMain.handle('modules:delete', this.deleteModule.bind(this));
        ipcMain.handle('modules:get', this.getModule.bind(this));
        ipcMain.handle('modules:list', this.listModules.bind(this));

        // Pattern management
        ipcMain.handle('modules:addPattern', this.addPattern.bind(this));
        ipcMain.handle('modules:removePattern', this.removePattern.bind(this));
        ipcMain.handle('modules:getPatterns', this.getPatterns.bind(this));

        // Dependencies management
        ipcMain.handle('modules:addDependency', this.addDependency.bind(this));
        ipcMain.handle('modules:removeDependency', this.removeDependency.bind(this));
        ipcMain.handle('modules:getDependencies', this.getDependencies.bind(this));

        // Version module management
        ipcMain.handle('modules:setVersionInclusion', this.setVersionInclusion.bind(this));
        ipcMain.handle('modules:getVersionModules', this.getVersionModules.bind(this));
    }

    async createModule(_, { projectId, name, description = '' }) {
        try {
            return await new Promise((resolve, reject) => {
                this.db.run(
                    'INSERT INTO modules (project_id, name, description) VALUES (?, ?, ?)',
                    [projectId, name, description],
                    function (err) {
                        if (err) reject(err);
                        resolve(this.lastID);
                    }
                );
            });
        } catch (error) {
            console.error('Error creating module:', error);
            throw error;
        }
    }

    async updateModule(_, { moduleId, name, description }) {
        try {
            await this.db.runAsync(
                'UPDATE modules SET name = ?, description = ? WHERE id = ?',
                [name, description, moduleId]
            );
            return true;
        } catch (error) {
            console.error('Error updating module:', error);
            throw error;
        }
    }

    async deleteModule(_, moduleId) {
        try {
            await this.db.runAsync('DELETE FROM modules WHERE id = ?', [moduleId]);
            return true;
        } catch (error) {
            console.error('Error deleting module:', error);
            throw error;
        }
    }

    async getModule(_, moduleId) {
        try {
            const module = await this.db.getAsync(
                'SELECT * FROM modules WHERE id = ?',
                [moduleId]
            );

            if (!module) return null;

            // Get patterns
            const patterns = await this.getPatterns(null, moduleId);

            // Get dependencies
            const dependencies = await this.getDependencies(null, moduleId);

            return {
                ...module,
                patterns,
                dependencies
            };
        } catch (error) {
            console.error('Error getting module:', error);
            throw error;
        }
    }

    async listModules(_, projectId) {
        try {
            return await this.db.allAsync(
                'SELECT * FROM modules WHERE project_id = ? ORDER BY name',
                [projectId]
            );
        } catch (error) {
            console.error('Error listing modules:', error);
            throw error;
        }
    }

    async addPattern(_, { moduleId, pattern }) {
        try {
            await this.db.runAsync(
                'INSERT INTO module_patterns (module_id, pattern) VALUES (?, ?)',
                [moduleId, pattern]
            );
            return true;
        } catch (error) {
            console.error('Error adding pattern:', error);
            throw error;
        }
    }

    async removePattern(_, { moduleId, pattern }) {
        try {
            await this.db.runAsync(
                'DELETE FROM module_patterns WHERE module_id = ? AND pattern = ?',
                [moduleId, pattern]
            );
            return true;
        } catch (error) {
            console.error('Error removing pattern:', error);
            throw error;
        }
    }

    async getPatterns(_, moduleId) {
        try {
            const patterns = await this.db.allAsync(
                'SELECT pattern FROM module_patterns WHERE module_id = ?',
                [moduleId]
            );
            return patterns.map(p => p.pattern);
        } catch (error) {
            console.error('Error getting patterns:', error);
            throw error;
        }
    }

    async addDependency(_, { parentModuleId, childModuleId }) {
        try {
            await this.db.runAsync(
                'INSERT INTO module_dependencies (parent_module_id, child_module_id) VALUES (?, ?)',
                [parentModuleId, childModuleId]
            );
            return true;
        } catch (error) {
            console.error('Error adding dependency:', error);
            throw error;
        }
    }

    async removeDependency(_, { parentModuleId, childModuleId }) {
        try {
            await this.db.runAsync(
                'DELETE FROM module_dependencies WHERE parent_module_id = ? AND child_module_id = ?',
                [parentModuleId, childModuleId]
            );
            return true;
        } catch (error) {
            console.error('Error removing dependency:', error);
            throw error;
        }
    }

    async getDependencies(_, moduleId) {
        try {
            return await this.db.allAsync(`
                SELECT m.* 
                FROM modules m
                JOIN module_dependencies md ON m.id = md.child_module_id
                WHERE md.parent_module_id = ?
            `, [moduleId]);
        } catch (error) {
            console.error('Error getting dependencies:', error);
            throw error;
        }
    }

    async setVersionInclusion(_, data) {
        const { versionId, moduleId, isIncluded } = data;

        try {
            console.log(`Setting module ${moduleId} inclusion to ${isIncluded} for version ${versionId}`);

            // Check if a record already exists
            const existing = await this.db.getAsync(`
                SELECT * FROM version_modules 
                WHERE version_id = ? AND module_id = ?
            `, [versionId, moduleId]);

            if (existing) {
                // Update existing record
                await this.db.runAsync(`
                    UPDATE version_modules
                    SET is_included = ?
                    WHERE version_id = ? AND module_id = ?
                `, [isIncluded ? 1 : 0, versionId, moduleId]);
            } else {
                // Insert new record
                await this.db.runAsync(`
                    INSERT INTO version_modules (version_id, module_id, is_included)
                    VALUES (?, ?, ?)
                `, [versionId, moduleId, isIncluded ? 1 : 0]);
            }

            return true;
        } catch (error) {
            console.error('Error setting version inclusion:', error);
            throw error;
        }
    }

    async getVersionModules(_, versionId) {
        try {
            console.log(`Getting version modules for version ID: ${versionId}`);

            // First determine the main project ID for this version
            const project = await this.db.getAsync(
                'SELECT id, parent_id FROM projects WHERE id = ?',
                [versionId]
            );

            if (!project) {
                console.warn(`Project with ID ${versionId} not found`);
                return [];
            }

            // Get the main project ID (either the current ID if it's a main project, or its parent ID if it's a version)
            const mainProjectId = project.parent_id || project.id;
            console.log(`Main project ID for version ${versionId}: ${mainProjectId}`);

            // Get all modules for this project
            const modules = await this.db.allAsync(`
                SELECT * FROM modules WHERE project_id = ?
            `, [mainProjectId]);

            // Get the version-specific inclusion states
            const versionModuleStates = await this.db.allAsync(`
                SELECT module_id, is_included
                FROM version_modules
                WHERE version_id = ?
            `, [versionId]);

            // Create a map of module inclusion states
            const inclusionMap = new Map();
            versionModuleStates.forEach(vm => {
                inclusionMap.set(vm.module_id, vm.is_included);
            });

            // Combine module data with inclusion state
            const result = await Promise.all(modules.map(async module => {
                // Check if this module has a specific inclusion state for this version
                const hasState = inclusionMap.has(module.id);
                const isIncluded = hasState ? inclusionMap.get(module.id) : 1; // Default to included (1) if no state

                // Get patterns
                const patterns = await this.getPatterns(null, module.id);

                // Get dependencies
                const dependencies = await this.getDependencies(null, module.id);

                return {
                    ...module,
                    is_included: isIncluded,
                    patterns,
                    dependencies
                };
            }));

            console.log(`Returning ${result.length} modules for version ${versionId}`);
            return result;
        } catch (error) {
            console.error('Error getting version modules:', error);
            throw error;
        }
    }

    // Helper method to get all patterns including from dependencies
    async getAllModulePatterns(moduleId, visited = new Set()) {
        if (visited.has(moduleId)) {
            return new Set(); // Prevent circular dependency loops
        }

        visited.add(moduleId);
        const patterns = new Set();

        // Get direct patterns
        const modulePatterns = await this.getPatterns(null, moduleId);
        modulePatterns.forEach(p => patterns.add(p));

        // Get patterns from dependencies
        const dependencies = await this.getDependencies(null, moduleId);
        for (const dep of dependencies) {
            const depPatterns = await this.getAllModulePatterns(dep.id, visited);
            depPatterns.forEach(p => patterns.add(p));
        }

        return patterns;
    }
}

module.exports = { ModuleHandlers };