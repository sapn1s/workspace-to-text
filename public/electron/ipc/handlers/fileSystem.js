const { ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const { getFileStructure, handleUpdateFileExclusions } = require('../../fileStructure');
const { projectState } = require('../../state/ProjectState');

class FileSystemHandlers {
  constructor(db, mainWindow) {
    this.db = db;
    this.mainWindow = mainWindow;
  }

  register() {
    ipcMain.handle('fs:openDirectory', this.openDirectory.bind(this));
    ipcMain.handle('fs:getStructure', this.getFileStructure.bind(this));
    ipcMain.handle('fs:updateExclusions', this.updateFileExclusions.bind(this));
    ipcMain.handle('system:copyToClipboard', this.copyToClipboard.bind(this));
  }

  async openDirectory() {
    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  }

  async getFileStructure(_, { path: dirPath, includePatterns, excludePatterns, projectRoot }) {
    try {
      let settings = { respectGitignore: true, ignoreDotfiles: true };
      
      if (projectRoot) {
        try {
          const project = await this.db.getAsync(
            'SELECT id, respect_gitignore, ignore_dotfiles FROM projects WHERE path = ?',
            [projectRoot]
          );
          if (project) {
            settings = {
              respectGitignore: Boolean(project.respect_gitignore),
              ignoreDotfiles: Boolean(project.ignore_dotfiles)
            };
          }
        } catch (error) {
          console.warn('Error getting project settings:', error);
        }
      }

      const isRelative = /^\.[\\/]/.test(dirPath) || !path.isAbsolute(dirPath);
      const absolutePath = isRelative && projectState.getCurrentPath()
        ? path.resolve(projectState.getCurrentPath(), dirPath)
        : dirPath;

      return await getFileStructure(
        absolutePath,
        includePatterns,
        excludePatterns,
        projectRoot,
        settings
      );
    } catch (error) {
      console.error('Error getting file structure:', error);
      throw error;
    }
  }

  async updateFileExclusions(_, { projectPath, structure, includePatterns, excludePatterns, changedPattern }) {
    try {
      return await handleUpdateFileExclusions(
        projectPath,
        structure,
        includePatterns,
        excludePatterns,
        changedPattern
      );
    } catch (error) {
      console.error('Error updating file exclusions:', error);
      throw error;
    }
  }

  copyToClipboard(_, text) {
    clipboard.writeText(text);
  }
}

module.exports = { FileSystemHandlers };
