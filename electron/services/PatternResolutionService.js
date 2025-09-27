class PatternResolutionService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Resolve all patterns for a project/version including gitignore and dotfiles
     * This is the single source of truth for all patterns
     */
    async resolveProjectPatterns(projectId) {
        try {
            // 1. Get project's settings and patterns
            const project = await this.db.getAsync(
                'SELECT exclude_patterns, respect_gitignore, ignore_dotfiles FROM projects WHERE id = ?',
                [projectId]
            );

            if (!project) {
                throw new Error(`Project with ID ${projectId} not found`);
            }

            // 2. Get enabled modules and their patterns (using main project ID)
            const enabledModules = await this.getEnabledModules(projectId);

            // 3. Resolve module patterns (including dependencies)
            const modulePatterns = await this.resolveModulePatterns(enabledModules);

            // 4. Combine all patterns including system patterns
            const combinedPatterns = this.combineAllPatterns(project, modulePatterns);

            return combinedPatterns;
        } catch (error) {
            console.error('Error resolving project patterns:', error);
            // Return fallback patterns
            return {
                excludePatterns: '',
                includeGitignore: true,
                includeDotfiles: true,
                moduleInfo: new Map(),
                excludeArray: [],
                systemPatterns: {
                    gitignore: [],
                    dotfiles: []
                }
            };
        }
    }

    async getEnabledModules(projectId) {
        try {
            // Use recursive CTE to find the TRUE main project
            const mainProjectResult = await this.db.getAsync(`
            WITH RECURSIVE find_main_project AS (
                -- Base case: start with the given project
                SELECT id, parent_id, name FROM projects WHERE id = ?
                
                UNION ALL
                
                -- Recursive case: traverse up the hierarchy
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
                console.warn(`Could not find main project for project ${projectId}`);
                return [];
            }

            const mainProjectId = mainProjectResult.main_project_id;
            console.log(`PatternService: Found main project ${mainProjectResult.name} (ID: ${mainProjectId}) for project ${projectId}`);

            // Get enabled modules using the TRUE main project ID
            const enabledModules = await this.db.allAsync(`
            SELECT m.id, m.name, m.description,
                   COALESCE(vm.is_included, 0) as is_included
            FROM modules m
            LEFT JOIN version_modules vm ON m.id = vm.module_id AND vm.version_id = ?
            WHERE m.project_id = ?
            AND COALESCE(vm.is_included, 0) = 1
        `, [projectId, mainProjectId]);

            console.log(`PatternService: Found ${enabledModules.length} enabled modules for version ${projectId}`);
            return enabledModules;

        } catch (error) {
            console.error('Error getting enabled modules:', error);
            return [];
        }
    }


    async resolveModulePatterns(enabledModules) {
        const allPatterns = {
            exclude: new Set()
        };
        const moduleInfo = new Map(); // Track which patterns belong to which modules

        for (const module of enabledModules) {
            // Get module's direct patterns
            const patterns = await this.getModulePatterns(module.id);

            // Add to sets and track module info
            patterns.forEach(pattern => {
                // Module patterns are exclusion patterns
                allPatterns.exclude.add(pattern);
                moduleInfo.set(pattern, {
                    moduleId: module.id,
                    moduleName: module.name,
                    moduleDescription: module.description
                });
            });

            // Get dependency patterns recursively
            await this.addDependencyPatterns(module.id, allPatterns, moduleInfo);
        }

        return {
            exclude: Array.from(allPatterns.exclude),
            moduleInfo
        };
    }

    async getModulePatterns(moduleId) {
        const patterns = await this.db.allAsync(
            'SELECT pattern FROM module_patterns WHERE module_id = ?',
            [moduleId]
        );
        return patterns.map(p => p.pattern);
    }

    async addDependencyPatterns(moduleId, allPatterns, moduleInfo) {
        const dependencies = await this.db.allAsync(`
            SELECT m.id, m.name, m.description
            FROM modules m
            JOIN module_dependencies md ON m.id = md.child_module_id
            WHERE md.parent_module_id = ?
        `, [moduleId]);

        for (const dep of dependencies) {
            const patterns = await this.getModulePatterns(dep.id);
            patterns.forEach(pattern => {
                allPatterns.exclude.add(pattern);
                moduleInfo.set(pattern, {
                    moduleId: dep.id,
                    moduleName: dep.name,
                    moduleDescription: dep.description
                });
            });

            // Recursively add sub-dependencies
            await this.addDependencyPatterns(dep.id, allPatterns, moduleInfo);
        }
    }

    combineAllPatterns(project, modulePatterns) {
        const globalExclude = this.parsePatterns(project?.exclude_patterns);

        // Start with global exclude patterns and add module patterns
        const combinedExclude = [...new Set([
            ...globalExclude,
            ...modulePatterns.exclude
        ])];

        // Prepare system patterns (these will be handled by the ignore library in fileUtils)
        const systemPatterns = {
            gitignore: [], // Will be populated by readGitignore in fileUtils
            dotfiles: Boolean(project?.ignore_dotfiles) ? ['.*', '.*/**'] : []
        };

        return {
            excludePatterns: combinedExclude.join(','),
            includeGitignore: Boolean(project?.respect_gitignore),
            includeDotfiles: Boolean(project?.ignore_dotfiles),
            moduleInfo: modulePatterns.moduleInfo,
            // Also provide separate arrays for different use cases
            excludeArray: combinedExclude,
            systemPatterns
        };
    }

    parsePatterns(patternString) {
        if (!patternString) return [];
        return patternString.split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0);
    }

    /**
     * Check if a file path matches any exclude pattern
     */
    isPathExcluded(filePath, resolvedPatterns) {
        const ignore = require('ignore');
        const ig = ignore();

        // Add user-defined exclude patterns
        if (resolvedPatterns.excludeArray && resolvedPatterns.excludeArray.length > 0) {
            ig.add(resolvedPatterns.excludeArray);
        }

        // Add dotfile patterns if enabled
        if (resolvedPatterns.includeDotfiles && resolvedPatterns.systemPatterns.dotfiles.length > 0) {
            ig.add(resolvedPatterns.systemPatterns.dotfiles);
        }

        const normalizedPath = filePath
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/^\/+/, '');

        return ig.ignores(normalizedPath);
    }

    /**
     * Get a formatted summary of resolved patterns for debugging
     */
    getPatternSummary(resolvedPatterns) {
        const summary = {
            totalExcludePatterns: resolvedPatterns.excludeArray.length,
            modulePatterns: Array.from(resolvedPatterns.moduleInfo.keys()),
            systemSettings: {
                respectGitignore: resolvedPatterns.includeGitignore,
                ignoreDotfiles: resolvedPatterns.includeDotfiles
            },
            moduleInfo: Object.fromEntries(resolvedPatterns.moduleInfo)
        };

        return summary;
    }
}

module.exports = { PatternResolutionService };