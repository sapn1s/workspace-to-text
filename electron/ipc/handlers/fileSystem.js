const { ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const { projectState } = require('../../state/ProjectState');
const { PatternResolutionService } = require('../../services/PatternResolutionService');
const { getFileStructure, handleUpdateFileExclusions } = require('../../file_structure');

class FileSystemHandlers {
  constructor(db, mainWindow) {
    this.db = db;
    this.mainWindow = mainWindow;
    this.patternService = new PatternResolutionService(db);
  }

  register() {
    ipcMain.handle('fs:openDirectory', this.openDirectory.bind(this));
    ipcMain.handle('fs:getProjectFileStructure', this.getProjectFileStructure.bind(this));
    ipcMain.handle('fs:updateExclusions', this.updateFileExclusions.bind(this));
    ipcMain.handle('system:copyToClipboard', this.copyToClipboard.bind(this));
  }

  async openDirectory() {
    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  }

  async getProjectFileStructure(_, { path: dirPath, projectRoot }) {
    try {
      let resolvedPatterns = null;
      let settings = { respectGitignore: true, ignoreDotfiles: true };
      
      if (projectRoot) {
        try {
          // Find project by path to get the ID
          const project = await this.db.getAsync(
            'SELECT id, respect_gitignore, ignore_dotfiles FROM projects WHERE path = ?',
            [projectRoot]
          );
          
          if (project) {       
            // Use resolved patterns that include modules, gitignore, and dotfiles
            resolvedPatterns = await this.patternService.resolveProjectPatterns(project.id);

            settings = {
              respectGitignore: resolvedPatterns.includeGitignore,
              ignoreDotfiles: resolvedPatterns.includeDotfiles
            };
          }
        } catch (error) {
          console.warn('Error getting project settings for file structure:', error);
        }
      }

      const isRelative = /^\.[\\/]/.test(dirPath) || !path.isAbsolute(dirPath);
      const absolutePath = isRelative && projectState.getCurrentPath()
        ? path.resolve(projectState.getCurrentPath(), dirPath)
        : dirPath;

      return await getFileStructure(
        absolutePath,
        resolvedPatterns.excludePatterns, // Use resolved pattern string
        projectRoot,
        settings,
        resolvedPatterns // Pass the full resolved patterns object
      );
    } catch (error) {
      console.error('Error getting file structure:', error);
      throw error;
    }
  }

  async updateFileExclusions(_, { projectPath, structure, excludePatterns, changedPattern }) {
    try {
      return await handleUpdateFileExclusions(
        projectPath,
        structure,
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