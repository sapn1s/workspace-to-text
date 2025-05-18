const { ipcMain } = require('electron');
const { analyzeProject } = require('../../analyzer');
const { getFolderStats } = require('../../utils/sizeUtils');
const { projectState } = require('../../state/ProjectState');

class AnalysisHandlers {
  constructor(db) {
    this.db = db;
  }

  register() {
    ipcMain.handle('analysis:analyze', this.analyzeProject.bind(this));
    ipcMain.handle('analysis:checkSize', this.checkFolderSize.bind(this));
  }

  async analyzeProject(_, { projectId, path, includePatterns, excludePatterns }) {
    try {
      projectState.setCurrentPath(path);

      const settings = await this.db.getAsync(
        'SELECT respect_gitignore, ignore_dotfiles FROM projects WHERE id = ?',
        [projectId]
      );

      // Update project patterns and path
      await this.db.runAsync(
        'UPDATE projects SET path = ?, include_patterns = ?, exclude_patterns = ? WHERE id = ?',
        [path, includePatterns || '', excludePatterns || '', projectId]
      );

      const result = await analyzeProject(path, includePatterns, excludePatterns, {
        respectGitignore: Boolean(settings?.respect_gitignore),
        ignoreDotfiles: Boolean(settings?.ignore_dotfiles)
      });

      return result; // Now returns both text and fileSizeData
    } catch (error) {
      console.error('Error analyzing project:', error);
      throw error;
    }
  }

  async checkFolderSize(_, { projectId, folderPath }) {
    try {
      // Get settings specific to this project/version ID
      const project = await this.db.getAsync(
        'SELECT respect_gitignore, ignore_dotfiles, exclude_patterns FROM projects WHERE id = ?',
        [projectId]
      );

      if (!project) {
        console.warn('No project found with ID:', projectId);
        return await getFolderStats(folderPath, '', {
          respectGitignore: true,
          ignoreDotfiles: true
        });
      }
      
      return await getFolderStats(
        folderPath,
        project.exclude_patterns || '',
        {
          respectGitignore: Boolean(project.respect_gitignore),
          ignoreDotfiles: Boolean(project.ignore_dotfiles)
        }
      );
    } catch (error) {
      console.error('Error checking folder size:', error);
      throw error;
    }
  }
}

module.exports = { AnalysisHandlers };