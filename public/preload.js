const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openDirectory: () => ipcRenderer.invoke('open-directory'),
  analyzeProject: (projectId, path, includePatterns, excludePatterns) => 
    ipcRenderer.invoke('analyze-project', projectId, path, includePatterns, excludePatterns),
  createProject: (name) => ipcRenderer.invoke('create-project', name),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  setProjectPath: (id, path) => ipcRenderer.invoke('set-project-path', id, path),
  getProjectPatterns: (projectId) => ipcRenderer.invoke('get-project-patterns', projectId),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  deleteProject: (projectId) => ipcRenderer.invoke('deleteProject', projectId),
});