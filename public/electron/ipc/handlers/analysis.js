const { ipcMain } = require('electron');
const { analyzeProject } = require('../../analyzer');
const { getFolderStats } = require('../../utils/sizeUtils');
const { projectState } = require('../../state/ProjectState');
const { PatternResolutionService } = require('../../services/PatternResolutionService');

class AnalysisHandlers {
  constructor(db) {
    this.db = db;
    this.patternService = new PatternResolutionService(db);
  }

  register() {
    ipcMain.handle('analysis:analyze', this.analyzeProject.bind(this));
    ipcMain.handle('analysis:checkSize', this.checkFolderSize.bind(this));
  }

  async analyzeProject(_, { projectId, path }) {
    try {
      projectState.setCurrentPath(path);

      console.log('Analysis: Resolving patterns for project', projectId);

      // Get resolved patterns from the service (includes modules, gitignore, dotfiles)
      const resolvedPatterns = await this.patternService.resolveProjectPatterns(projectId);

      console.log('Analysis: Using resolved patterns:', {
        excludeCount: resolvedPatterns.excludeArray.length,
        includeGitignore: resolvedPatterns.includeGitignore,
        includeDotfiles: resolvedPatterns.includeDotfiles,
        moduleCount: resolvedPatterns.moduleInfo?.size || 0
      });

      // We use only the resolved patterns which include everything
      const result = await analyzeProject(
        path, 
        resolvedPatterns, // Use resolved patterns (includes user + modules + system)
        null, // No fallback patterns needed
        {} // No basic settings needed (resolved patterns include system settings)
      );

      return result;
    } catch (error) {
      console.error('Error analyzing project:', error);
      throw error;
    }
  }

  async checkFolderSize(_, { projectId, folderPath }) {
    try {
      console.log('Size check: Resolving patterns for project', projectId);

      // Get resolved patterns that include modules, gitignore, and dotfiles
      const resolvedPatterns = await this.patternService.resolveProjectPatterns(projectId);
      
      console.log('Size check: Using resolved patterns:', {
        excludeCount: resolvedPatterns.excludeArray.length,
        includeGitignore: resolvedPatterns.includeGitignore,
        includeDotfiles: resolvedPatterns.includeDotfiles,
        moduleCount: resolvedPatterns.moduleInfo?.size || 0
      });

      return await getFolderStats(
        folderPath,
        resolvedPatterns.excludePatterns || '', // Use resolved exclude patterns string
        {
          respectGitignore: resolvedPatterns.includeGitignore,
          ignoreDotfiles: resolvedPatterns.includeDotfiles
        }
      );
    } catch (error) {
      console.error('Error checking folder size:', error);
      
      // Fallback to basic size check without patterns
      try {
        return await getFolderStats(folderPath, '', {
          respectGitignore: true,
          ignoreDotfiles: true
        });
      } catch (fallbackError) {
        console.error('Fallback size check also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
  }
}

module.exports = { AnalysisHandlers };