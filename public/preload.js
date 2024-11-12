const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Existing handlers
  openDirectory: () => ipcRenderer.invoke('open-directory'),
  analyzeProject: (projectId, path, includePatterns, excludePatterns) => 
    ipcRenderer.invoke('analyze-project', projectId, path, includePatterns, excludePatterns),
  createProject: (name) => ipcRenderer.invoke('create-project', name),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  setProjectPath: (id, path) => ipcRenderer.invoke('set-project-path', id, path),
  getProjectPatterns: (projectId) => ipcRenderer.invoke('get-project-patterns', projectId),
  deleteProject: (projectId) => ipcRenderer.invoke('deleteProject', projectId),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  getFileStructure: (path, includePatterns, excludePatterns, projectRoot) => 
    ipcRenderer.invoke('get-file-structure', path, includePatterns, excludePatterns, projectRoot),
    
  // New handlers for version management
  createProjectVersion: (projectId, versionName) => 
    ipcRenderer.invoke('create-project-version', projectId, versionName),
  getProjectVersions: (projectId) => 
    ipcRenderer.invoke('get-project-versions', projectId),
  
  updateProjectPatterns: (projectId, includePatterns, excludePatterns) => 
    ipcRenderer.invoke('update-project-patterns', projectId, includePatterns, excludePatterns),
  updateFileExclusions: (projectPath, structure, includePatterns, excludePatterns, changedPattern) => 
    ipcRenderer.invoke('updateFileExclusions', projectPath, structure, includePatterns, excludePatterns, changedPattern),

});