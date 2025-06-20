// public/electron/ipc/handlers/dependencies.js

const { ipcMain } = require('electron');
const { analyzeDependencies } = require('../../dependencyAnalyzer');
const { getFolderStats } = require('../../utils/sizeUtils');
const { PatternResolutionService } = require('../../services/PatternResolutionService');

class DependencyHandlers {
  constructor(db) {
    this.db = db;
    this.patternService = new PatternResolutionService(db);
  }

  register() {
    ipcMain.handle('dependencies:analyze', this.analyzeDependencies.bind(this));
    ipcMain.handle('dependencies:checkSize', this.checkDependencyAnalysisSize.bind(this));
  }

  async analyzeDependencies(_, { projectId, path, excludePatterns }) {
    try {
      // Get project settings (reuse same logic as main analyzer)
      const settings = await this.db.getAsync(
        'SELECT respect_gitignore, ignore_dotfiles FROM projects WHERE id = ?',
        [projectId]
      );

      // Get resolved patterns from the service (includes modules)
      const resolvedPatterns = await this.patternService.resolveProjectPatterns(projectId);

      // Combine resolved patterns with any additional patterns passed in
      const finalExcludePatterns = this.combinePatterns(
        resolvedPatterns.excludePatterns, 
        excludePatterns
      );

      const result = await analyzeDependencies(path, finalExcludePatterns, {
        respectGitignore: Boolean(settings?.respect_gitignore),
        ignoreDotfiles: Boolean(settings?.ignore_dotfiles)
      });

      return result;
    } catch (error) {
      console.error('Error analyzing dependencies:', error);
      throw error;
    }
  }

  async checkDependencyAnalysisSize(_, { projectId, folderPath }) {
    try {
      // Reuse the existing size checking logic
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

      // Get resolved patterns that include modules
      const resolvedPatterns = await this.patternService.resolveProjectPatterns(projectId);
      
      return await getFolderStats(
        folderPath,
        resolvedPatterns.excludePatterns || '',
        {
          respectGitignore: Boolean(project.respect_gitignore),
          ignoreDotfiles: Boolean(project.ignore_dotfiles)
        }
      );
    } catch (error) {
      console.error('Error checking dependency analysis size:', error);
      throw error;
    }
  }

  combinePatterns(resolved, additional) {
    const resolvedPatterns = resolved ? resolved.split(',').map(p => p.trim()).filter(p => p) : [];
    const additionalPatterns = additional ? additional.split(',').map(p => p.trim()).filter(p => p) : [];
    
    const combined = [...new Set([...resolvedPatterns, ...additionalPatterns])];
    return combined.join(',');
  }
}

module.exports = { DependencyHandlers };