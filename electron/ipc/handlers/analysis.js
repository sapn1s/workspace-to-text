const { ipcMain } = require('electron');
const { analyzeProject } = require('../../analyzer');
const { getFolderStats } = require('../../utils/sizeUtils');
const { projectState } = require('../../state/ProjectState');
const { PatternResolutionService } = require('../../services/PatternResolutionService');
const path = require('path');
const fs = require('fs');

class AnalysisHandlers {
  constructor(db) {
    this.db = db;
    this.patternService = new PatternResolutionService(db);
  }

  register() {
    ipcMain.handle('analysis:analyze', this.analyzeProject.bind(this));
    ipcMain.handle('analysis:checkSize', this.checkFolderSize.bind(this));
    ipcMain.handle('analysis:contextAnalyze', this.analyzeContext.bind(this));
    ipcMain.handle('analysis:addToCurrent', this.addToCurrentAnalysis.bind(this));
    ipcMain.handle('analysis:analyzeWithTempExclusions', this.analyzeProjectWithTempExclusions.bind(this));
  }

  // Regular project analysis with full patterns
  async analyzeProject(_, { projectId, path }) {
    try {
      projectState.setCurrentPath(path);
      console.log('Regular Analysis: Resolving patterns for project', projectId);

      const resolvedPatterns = await this.patternService.resolveProjectPatterns(projectId);

      const result = await analyzeProject(
        path,
        resolvedPatterns,
        null,
        {}
      );

      // Cache as latest analysis with single path
      await this.cacheAnalysisResult(projectId, {
        result: result.text,
        fileSizeData: result.fileSizeData,
        projectId,
        analyzedPaths: [path], // Store as array of paths
        timestamp: Date.now(),
        type: 'regular',
        isFile: false
      });

      return result;
    } catch (error) {
      console.error('Error analyzing project:', error);
      throw error;
    }
  }

  async checkFolderSize(_, { projectId, folderPath }) {
    try {
      const resolvedPatterns = await this.patternService.resolveProjectPatterns(projectId);

      return await getFolderStats(
        folderPath,
        resolvedPatterns.excludePatterns || '',
        {
          respectGitignore: resolvedPatterns.includeGitignore,
          ignoreDotfiles: resolvedPatterns.includeDotfiles
        }
      );
    } catch (error) {
      console.error('Error checking folder size:', error);
      try {
        return await getFolderStats(folderPath, '', {
          respectGitignore: true,
          ignoreDotfiles: true
        });
      } catch (fallbackError) {
        throw error;
      }
    }
  }

  // Context analysis - analyze specific file/folder without patterns
  async analyzeContext(_, { projectId, path: targetPath, relativePath }) {
    try {
      console.log('Context Analysis: Analyzing single path', relativePath, 'at', targetPath);

      if (!fs.existsSync(targetPath)) {
        throw new Error(`Path does not exist: ${targetPath}`);
      }

      const stats = fs.statSync(targetPath);

      // SIMPLIFIED: Use the same core analysis function
      const result = await this.performContextAnalysis([targetPath]);

      // Cache as latest analysis with single path
      await this.cacheAnalysisResult(projectId, {
        result: result.text,
        fileSizeData: result.fileSizeData,
        projectId,
        analyzedPaths: [targetPath], // Store as array of paths
        timestamp: Date.now(),
        type: 'context',
        isFile: stats.isFile()
      });

      return result;
    } catch (error) {
      console.error('Error in context analysis:', error);
      throw error;
    }
  }

  // SIMPLIFIED: Add to current analysis - get previous paths + add new path, then analyze all together
  async addToCurrentAnalysis(_, { projectId, path: targetPath, relativePath }) {
    try {
      console.log('Add to Current Analysis: Adding', relativePath, 'to existing analysis');

      if (!fs.existsSync(targetPath)) {
        throw new Error(`Path does not exist: ${targetPath}`);
      }

      // Get the previous analysis to get the list of analyzed paths
      const lastAnalysis = await this.getLastAnalysisResult(projectId);
      if (!lastAnalysis || !lastAnalysis.analyzedPaths) {
        throw new Error('No previous analysis found. Please run an analysis first.');
      }

      console.log('Previous analysis paths:', lastAnalysis.analyzedPaths);

      // Combine previous paths with new path
      const allPaths = [...lastAnalysis.analyzedPaths, targetPath];
      console.log('Combined paths for analysis:', allPaths);

      // SIMPLIFIED: Use the same core analysis function with all paths
      const result = await this.performContextAnalysis(allPaths);

      const stats = fs.statSync(targetPath);

      // Cache the combined result
      await this.cacheAnalysisResult(projectId, {
        result: result.text,
        fileSizeData: result.fileSizeData,
        projectId,
        analyzedPaths: allPaths, // Store all paths
        timestamp: Date.now(),
        type: 'combined',
        isFile: stats.isFile(),
        addedPath: targetPath
      });

      console.log('Successfully analyzed all paths. Total paths:', allPaths.length);

      return result;
    } catch (error) {
      console.error('Error adding to current analysis:', error);
      throw error;
    }
  }

  // New method for temporary exclusions analysis
  async analyzeProjectWithTempExclusions(_, { projectId, path, tempExclusions }) {
    try {
      console.log('Analysis with temporary exclusions for project', projectId);
      console.log('Temporary exclusions:', tempExclusions);

      // Get the base resolved patterns
      const baseResolvedPatterns = await this.patternService.resolveProjectPatterns(projectId);
      
      // Create modified patterns that include temporary exclusions
      const tempExclusionsArray = tempExclusions ? tempExclusions.split(',').map(p => p.trim()).filter(p => p) : [];
      
      const modifiedPatterns = {
        ...baseResolvedPatterns,
        excludePatterns: [...baseResolvedPatterns.excludeArray, ...tempExclusionsArray].join(','),
        excludeArray: [...baseResolvedPatterns.excludeArray, ...tempExclusionsArray]
      };

      console.log('Modified patterns:', {
        originalCount: baseResolvedPatterns.excludeArray.length,
        tempCount: tempExclusionsArray.length,
        totalCount: modifiedPatterns.excludeArray.length
      });

      const result = await analyzeProject(
        path,
        modifiedPatterns,
        null,
        {}
      );

      // Cache as a temporary analysis (don't override the regular analysis cache)
      await this.cacheAnalysisResult(`${projectId}_temp`, {
        result: result.text,
        fileSizeData: result.fileSizeData,
        projectId,
        analyzedPaths: [path],
        timestamp: Date.now(),
        type: 'temp-exclusions',
        tempExclusions: tempExclusions,
        isFile: false
      });

      return result;
    } catch (error) {
      console.error('Error analyzing project with temp exclusions:', error);
      throw error;
    }
  }

  // Core analysis function that handles multiple paths
  async performContextAnalysis(paths) {
    console.log('DEBUG: Starting performContextAnalysis with paths:', paths);

    let combinedText = '';
    let combinedFileSizeData = [];
    let allDirectoryStructures = [];
    let allFileContents = [];

    // Process each path and collect structures and contents separately
    for (let i = 0; i < paths.length; i++) {
      const targetPath = paths[i];

      console.log(`DEBUG: Analyzing path ${i + 1}/${paths.length}: ${targetPath}`);

      // Use the same analyzeProject function for each path
      const result = await analyzeProject(
        targetPath,
        null, // No patterns for context analysis
        '',
        {}
      );

      console.log(`DEBUG: Analysis result for ${targetPath}:`);
      console.log(`DEBUG: - Text length: ${result.text?.length || 0}`);
      console.log(`DEBUG: - File size data count: ${result.fileSizeData?.length || 0}`);

      const lines = result.text.split('\n');
      console.log(`DEBUG: - Total lines in result: ${lines.length}`);

      // Find the key sections
      const projectPathIndex = lines.findIndex(line => line.startsWith('Project path:'));
      const directoryStructureIndex = lines.findIndex(line => line.trim() === 'Directory Structure:');
      const fileContentsIndex = lines.findIndex(line => line.trim() === 'File Contents:');

      console.log(`DEBUG: Section indices for ${targetPath}:`);
      console.log(`DEBUG: - Project path: ${projectPathIndex}`);
      console.log(`DEBUG: - Directory structure: ${directoryStructureIndex}`);
      console.log(`DEBUG: - File contents: ${fileContentsIndex}`);

      // Extract directory structure section
      if (directoryStructureIndex !== -1 && fileContentsIndex !== -1) {
        const structureLines = lines.slice(directoryStructureIndex + 1, fileContentsIndex);
        const structureText = structureLines.join('\n').trim();
        console.log(`DEBUG: Extracted structure for ${targetPath} (${structureLines.length} lines):`);
        console.log(`DEBUG: Structure text: "${structureText.substring(0, 200)}..."`);

        if (structureText) {
          allDirectoryStructures.push({
            path: targetPath,
            structure: structureText
          });
          console.log(`DEBUG: Added structure for ${targetPath} to allDirectoryStructures`);
        } else {
          console.log(`DEBUG: No structure text found for ${targetPath}`);
        }
      } else {
        console.log(`DEBUG: Missing section indices for ${targetPath} - cannot extract structure`);
        if (directoryStructureIndex === -1) {
          console.log(`DEBUG: - Missing "Directory Structure:" section - checking if this is a single file`);

          // Handle single file case - create a synthetic structure entry
          if (fs.existsSync(targetPath)) {
            const stats = fs.statSync(targetPath);
            if (stats.isFile()) {
              const fileName = path.basename(targetPath);
              const syntheticStructure = `📄 ${fileName}`;
              console.log(`DEBUG: Creating synthetic structure for single file: "${syntheticStructure}"`);

              allDirectoryStructures.push({
                path: targetPath,
                structure: syntheticStructure,
                isSingleFile: true
              });
              console.log(`DEBUG: Added synthetic structure for single file ${targetPath}`);
            }
          }
        }
        if (fileContentsIndex === -1) console.log(`DEBUG: - Missing "File Contents:" section`);
      }

      // Extract file contents section
      if (fileContentsIndex !== -1) {
        const contentLines = lines.slice(fileContentsIndex + 1);
        const contentText = contentLines.join('\n').trim();
        console.log(`DEBUG: Extracted content for ${targetPath} (${contentLines.length} lines)`);

        if (contentText) {
          allFileContents.push(contentText);
          console.log(`DEBUG: Added content for ${targetPath} to allFileContents`);
        } else {
          console.log(`DEBUG: No content text found for ${targetPath}`);
        }
      } else {
        console.log(`DEBUG: No "File Contents:" section found for ${targetPath}`);
      }

      // Combine file size data
      combinedFileSizeData = [...combinedFileSizeData, ...(result.fileSizeData || [])];
    }

    console.log(`DEBUG: Final combination phase:`);
    console.log(`DEBUG: - Total directory structures: ${allDirectoryStructures.length}`);
    console.log(`DEBUG: - Total file contents: ${allFileContents.length}`);
    console.log(`DEBUG: - Total file size data: ${combinedFileSizeData.length}`);

    // Build the combined output
    if (paths.length > 0) {
      // Use the first path as the base project path, but indicate it's a combined analysis
      combinedText = `Project path: Multiple paths analyzed\n\n`;

      // Combine all directory structures
      combinedText += 'Directory Structure:\n';
      console.log(`DEBUG: Building combined directory structure...`);

      for (let i = 0; i < allDirectoryStructures.length; i++) {
        const { path: structurePath, structure, isSingleFile } = allDirectoryStructures[i];
        console.log(`DEBUG: Processing structure ${i + 1}/${allDirectoryStructures.length} for ${structurePath} (isSingleFile: ${isSingleFile})`);

        if (i > 0) {
          combinedText += '\n';
        }

        // Add a header for each path
        if (isSingleFile) {
          // For single files, just show the file name without extra folder structure
          const fileName = path.basename(structurePath);
          const header = `📄 ${fileName} (${structurePath})\n`;
          console.log(`DEBUG: Adding single file header: "${header.trim()}"`);
          combinedText += header;
        } else {
          // For directories, show as folder
          const pathName = path.basename(structurePath);
          const header = `📁 ${pathName}${structurePath !== paths[0] ? ` (${structurePath})` : ''}\n`;
          console.log(`DEBUG: Adding directory header: "${header.trim()}"`);
          combinedText += header;

          // Add the structure with proper indentation
          const indentedStructure = structure.split('\n')
            .map(line => line ? `  ${line}` : line)
            .join('\n');
          console.log(`DEBUG: Adding indented structure (${indentedStructure.split('\n').length} lines)`);
          combinedText += indentedStructure;
        }

        if (i < allDirectoryStructures.length - 1) {
          combinedText += '\n';
        }
      }

      // Add all file contents
      combinedText += '\n\nFile Contents:\n';
      console.log(`DEBUG: Adding ${allFileContents.length} file content sections`);
      combinedText += allFileContents.join('\n');
    }

    console.log(`DEBUG: Final combined text length: ${combinedText.length}`);
    console.log(`DEBUG: First 500 chars of combined text:`, combinedText.substring(0, 500));

    return {
      text: combinedText,
      fileSizeData: combinedFileSizeData
    };
  }

  async cacheAnalysisResult(projectId, analysisData) {
    try {
      const cacheKey = `analysis_cache_${projectId}`;
      await this.db.runAsync(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        [cacheKey, JSON.stringify(analysisData)]
      );

      console.log('Cached analysis result:', {
        type: analysisData.type,
        pathCount: analysisData.analyzedPaths?.length || 0,
        paths: analysisData.analyzedPaths,
        textLength: analysisData.result?.length || 0
      });
    } catch (error) {
      console.error('Error caching analysis result:', error);
    }
  }

  async getLastAnalysisResult(projectId) {
    try {
      const cacheKey = `analysis_cache_${projectId}`;
      const result = await this.db.getAsync(
        'SELECT value FROM app_settings WHERE key = ?',
        [cacheKey]
      );

      return result ? JSON.parse(result.value) : null;
    } catch (error) {
      console.error('Error getting cached analysis result:', error);
      return null;
    }
  }
}

module.exports = { AnalysisHandlers };