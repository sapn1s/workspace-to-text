const { ipcRenderer, contextBridge } = require('electron');

const ipcApi = {
    // Project operations
    createProject: (name) => ipcRenderer.invoke('project:create', name),
    getProjects: () => ipcRenderer.invoke('project:list'),
    setProjectPath: (id, path) => ipcRenderer.invoke('project:setPath', { id, path }),
    deleteProject: (id) => ipcRenderer.invoke('project:delete', id),
    renameProject: (id, name) => ipcRenderer.invoke('project:rename', { id, name }),
    getProjectSettings: (projectId) => ipcRenderer.invoke('project:getSettings', projectId),
    getProjectPatterns: (projectId) => ipcRenderer.invoke('project:getPatterns', projectId),
    updateProjectPatterns: (projectId, includePatterns, excludePatterns) =>
        ipcRenderer.invoke('project:updatePatterns', { projectId, includePatterns, excludePatterns }),
    createProjectVersion: (projectId, versionName) =>
        ipcRenderer.invoke('project:createVersion', { projectId, versionName }),
    getProjectVersions: (projectId) => ipcRenderer.invoke('project:getVersions', projectId),

    // Analysis operations
    analyzeProject: (projectId, path, includePatterns, excludePatterns) =>
        ipcRenderer.invoke('analysis:analyze', { projectId, path, includePatterns, excludePatterns }),
    checkFolderSize: (projectId, path) =>
        ipcRenderer.invoke('analysis:checkSize', { projectId, folderPath: path }),
    // File system operations
    openDirectory: () => ipcRenderer.invoke('fs:openDirectory'),
    getFileStructure: (path, includePatterns, excludePatterns, projectRoot) =>
        ipcRenderer.invoke('fs:getStructure', { path, includePatterns, excludePatterns, projectRoot }),
    updateFileExclusions: (projectPath, structure, includePatterns, excludePatterns, changedPattern) =>
        ipcRenderer.invoke('fs:updateExclusions', { projectPath, structure, includePatterns, excludePatterns, changedPattern }),

    // System operations
    copyToClipboard: (text) => ipcRenderer.invoke('system:copyToClipboard', text),

    // Settings operations
    getAppSetting: (key) => ipcRenderer.invoke('settings:get', key),
    setAppSetting: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
    updateProjectSettings: (projectId, settings) =>
        ipcRenderer.invoke('settings:updateProject', { projectId, settings }),

    // Module operations
    modules: {
        create: (data) => ipcRenderer.invoke('modules:create', data),
        update: (data) => ipcRenderer.invoke('modules:update', data),
        delete: (moduleId) => ipcRenderer.invoke('modules:delete', moduleId),
        get: (moduleId) => ipcRenderer.invoke('modules:get', moduleId),
        list: (projectId) => ipcRenderer.invoke('modules:list', projectId),

        // Pattern management
        addPattern: (data) => ipcRenderer.invoke('modules:addPattern', data),
        removePattern: (data) => ipcRenderer.invoke('modules:removePattern', data),
        getPatterns: (moduleId) => ipcRenderer.invoke('modules:getPatterns', moduleId),

        // Dependencies management
        addDependency: (data) => ipcRenderer.invoke('modules:addDependency', data),
        removeDependency: (data) => ipcRenderer.invoke('modules:removeDependency', data),
        getDependencies: (moduleId) => ipcRenderer.invoke('modules:getDependencies', moduleId),

        // Version module management
        setVersionInclusion: (data) => ipcRenderer.invoke('modules:setVersionInclusion', data),
        getVersionModules: (versionId) => ipcRenderer.invoke('modules:getVersionModules', versionId)
    }
};

contextBridge.exposeInMainWorld('electron', ipcApi);