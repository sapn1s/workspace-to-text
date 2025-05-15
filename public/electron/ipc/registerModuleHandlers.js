const { ipcMain } = require('electron');

class ModuleHandlers {
    constructor(db) {
        this.db = db;
    }

    register() {
        // Module operations
        this.registerHandler('create', this.createModule.bind(this));
        this.registerHandler('update', this.updateModule.bind(this));
        this.registerHandler('delete', this.deleteModule.bind(this));
        this.registerHandler('get', this.getModule.bind(this));
        this.registerHandler('list', this.listModules.bind(this));
        
        // Pattern management
        this.registerHandler('addPattern', this.addPattern.bind(this));
        this.registerHandler('removePattern', this.removePattern.bind(this));
        this.registerHandler('getPatterns', this.getPatterns.bind(this));
        
        // Dependencies management
        this.registerHandler('addDependency', this.addDependency.bind(this));
        this.registerHandler('removeDependency', this.removeDependency.bind(this));
        this.registerHandler('getDependencies', this.getDependencies.bind(this));
        
        // Version module management
        this.registerHandler('setVersionInclusion', this.setVersionInclusion.bind(this));
        this.registerHandler('getVersionModules', this.getVersionModules.bind(this));
    }

    registerHandler(method, handler) {
        ipcMain.handle(`modules:${method}`, (event, ...args) => handler(...args));
    }

    async createModule(data) {
        try {
            return await new Promise((resolve, reject) => {
                this.db.run(
                    'INSERT INTO modules (project_id, name, description) VALUES (?, ?, ?)',
                    [data.projectId, data.name, data.description],
                    function(err) {
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

    async updateModule(data) {
        try {
            await this.db.runAsync(
                'UPDATE modules SET name = ?, description = ? WHERE id = ?',
                [data.name, data.description, data.moduleId]
            );
            return true;
        } catch (error) {
            console.error('Error updating module:', error);
            throw error;
        }
    }

    async deleteModule(moduleId) {
        try {
            await this.db.runAsync('DELETE FROM modules WHERE id = ?', [moduleId]);
            return true;
        } catch (error) {
            console.error('Error deleting module:', error);
            throw error;
        }
    }

    async getModule(moduleId) {
        try {
            const module = await this.db.getAsync(
                'SELECT * FROM modules WHERE id = ?',
                [moduleId]
            );
            
            if (!module) return null;

            // Get patterns
            const patterns = await this.getPatterns(moduleId);
            
            // Get dependencies
            const dependencies = await this.getDependencies(moduleId);

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

    async listModules(projectId) {
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

    async addPattern(data) {
        try {
            await this.db.runAsync(
                'INSERT INTO module_patterns (module_id, pattern) VALUES (?, ?)',
                [data.moduleId, data.pattern]
            );
            return true;
        } catch (error) {
            console.error('Error adding pattern:', error);
            throw error;
        }
    }

    async removePattern(data) {
        try {
            await this.db.runAsync(
                'DELETE FROM module_patterns WHERE module_id = ? AND pattern = ?',
                [data.moduleId, data.pattern]
            );
            return true;
        } catch (error) {
            console.error('Error removing pattern:', error);
            throw error;
        }
    }

    async getPatterns(moduleId) {
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

    async addDependency(data) {
        try {
            await this.db.runAsync(
                'INSERT INTO module_dependencies (parent_module_id, child_module_id) VALUES (?, ?)',
                [data.parentModuleId, data.childModuleId]
            );
            return true;
        } catch (error) {
            console.error('Error adding dependency:', error);
            throw error;
        }
    }

    async removeDependency(data) {
        try {
            await this.db.runAsync(
                'DELETE FROM module_dependencies WHERE parent_module_id = ? AND child_module_id = ?',
                [data.parentModuleId, data.childModuleId]
            );
            return true;
        } catch (error) {
            console.error('Error removing dependency:', error);
            throw error;
        }
    }

    async getDependencies(moduleId) {
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

    async setVersionInclusion(data) {
        try {
            await this.db.runAsync(`
                INSERT INTO version_modules (version_id, module_id, is_included)
                VALUES (?, ?, ?)
                ON CONFLICT(version_id, module_id) 
                DO UPDATE SET is_included = ?
            `, [data.versionId, data.moduleId, data.isIncluded, data.isIncluded]);
            return true;
        } catch (error) {
            console.error('Error setting version inclusion:', error);
            throw error;
        }
    }

    async getVersionModules(versionId) {
        try {
            return await this.db.allAsync(`
                SELECT m.*, vm.is_included
                FROM modules m
                LEFT JOIN version_modules vm ON m.id = vm.module_id AND vm.version_id = ?
                WHERE m.project_id = (
                    SELECT COALESCE(parent_id, id) 
                    FROM projects 
                    WHERE id = ?
                )
            `, [versionId, versionId]);
        } catch (error) {
            console.error('Error getting version modules:', error);
            throw error;
        }
    }
}

module.exports = function registerModuleHandlers(db) {
    const { ipcMain } = require('electron');
    const handlers = new ModuleHandlers(db);
    handlers.register();
    return handlers;
};