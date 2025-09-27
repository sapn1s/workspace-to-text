const { ipcRenderer, contextBridge } = require('electron');

const ipcApi = {
    // Project operations
    createProject: (name) => ipcRenderer.invoke('project:create', name),
    getProjects: () => ipcRenderer.invoke('project:list'),
    setProjectPath: (id, path) => ipcRenderer.invoke('project:setPath', { id, path }),
    deleteProject: (id) => ipcRenderer.invoke('project:delete', id),
    deleteVersion: (id) => ipcRenderer.invoke('project:deleteVersion', id),
    renameProject: (id, name) => ipcRenderer.invoke('project:rename', { id, name }),
    getProjectSettings: (projectId) => ipcRenderer.invoke('project:getSettings', projectId),
    getProjectPatterns: (projectId) => ipcRenderer.invoke('project:getPatterns', projectId),
    updateProjectPatterns: (projectId, excludePatterns) =>
        ipcRenderer.invoke('project:updatePatterns', { projectId, excludePatterns }),
    createProjectVersion: (projectId, versionName, copyFromMain = false) =>
        ipcRenderer.invoke('project:createVersion', { projectId, versionName, copyFromMain }),
    getProjectVersions: (mainProjectId) => ipcRenderer.invoke('project:getVersions', mainProjectId),
    // Version management operations
    renameVersion: (versionId, newName) =>
        ipcRenderer.invoke('project:renameVersion', { versionId, newName }),
    moveVersion: (versionId, newParentId) =>
        ipcRenderer.invoke('project:moveVersion', { versionId, newParentId }),
    getAvailableParents: (versionId) =>
        ipcRenderer.invoke('project:getAvailableParents', { versionId }),
    // Analysis operations
    analyzeProject: (projectId, path) =>
        ipcRenderer.invoke('analysis:analyze', { projectId, path }),
    checkFolderSize: (projectId, path) =>
        ipcRenderer.invoke('analysis:checkSize', { projectId, folderPath: path }),
    analyzeProjectWithTempExclusions: (projectId, path, tempExclusions) =>
        ipcRenderer.invoke('analysis:analyzeWithTempExclusions', { projectId, path, tempExclusions }),

    // File system operations
    openDirectory: () => ipcRenderer.invoke('fs:openDirectory'),
    getFileStructure: (path, projectRoot) =>
        ipcRenderer.invoke('fs:getProjectFileStructure', { path, projectRoot }),
    updateFileExclusions: (projectPath, structure, excludePatterns, changedPattern) =>
        ipcRenderer.invoke('fs:updateExclusions', { projectPath, structure, excludePatterns, changedPattern }),

    // System operations
    copyToClipboard: (text) => ipcRenderer.invoke('system:copyToClipboard', text),

    // Settings operations
    getAppSetting: (key) => ipcRenderer.invoke('settings:get', key),
    setAppSetting: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
    updateProjectSettings: (projectId, settings) =>
        ipcRenderer.invoke('settings:updateProject', { projectId, settings }),

    // Pattern resolution operations
    patterns: {
        resolve: (projectId) => ipcRenderer.invoke('patterns:resolve', { projectId }),
        clearCache: (projectId) => ipcRenderer.invoke('patterns:clearCache', { projectId })
    },

    // Module operations
    modules: {
        create: (data) => ipcRenderer.invoke('modules:create', data),
        update: (data) => ipcRenderer.invoke('modules:update', data),
        delete: (moduleId) => ipcRenderer.invoke('modules:delete', moduleId),
        get: (moduleId) => ipcRenderer.invoke('modules:get', moduleId),
        list: (projectId) => ipcRenderer.invoke('modules:list', projectId),

        // Pattern management
        removePattern: (data) => ipcRenderer.invoke('modules:removePattern', data),
        getPatterns: (moduleId) => ipcRenderer.invoke('modules:getPatterns', moduleId),

        // Dependencies management
        removeDependency: (data) => ipcRenderer.invoke('modules:removeDependency', data),
        getDependencies: (moduleId) => ipcRenderer.invoke('modules:getDependencies', moduleId),

        // Version module management
        setVersionInclusion: (data) => ipcRenderer.invoke('modules:setVersionInclusion', data),
        getVersionModules: (versionId) => ipcRenderer.invoke('modules:getVersionModules', versionId)
    },

    contextAnalysis: {
        analyze: (projectId, path, relativePath) =>
            ipcRenderer.invoke('analysis:contextAnalyze', { projectId, path, relativePath }),
        // SIMPLIFIED: Back to simple call
        addToCurrent: (projectId, path, relativePath) =>
            ipcRenderer.invoke('analysis:addToCurrent', { projectId, path, relativePath })
    },

    // Dependency analysis operations
    analyzeDependencies: (projectId, path, excludePatterns) =>
        ipcRenderer.invoke('dependencies:analyze', { projectId, path, excludePatterns }),
    checkDependencyAnalysisSize: (projectId, folderPath) =>
        ipcRenderer.invoke('dependencies:checkSize', { projectId, folderPath }),
};

contextBridge.exposeInMainWorld('electron', ipcApi);