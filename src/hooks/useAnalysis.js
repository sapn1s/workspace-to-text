import { useState } from 'react';

export function useAnalysis() {
  const [result, setResult] = useState('');
  const [fileSizeData, setFileSizeData] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCheckingSize, setIsCheckingSize] = useState(false);
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [sizeScanResult, setSizeScanResult] = useState(null);

  const handleAnalyze = async (projectId, projectPath) => {
    console.log("Handling analysis for project", projectId);
    
    if (!projectPath) {
      setResult('Please select a project folder first.');
      return;
    }

    try {
      // Set loading state for size check
      setIsCheckingSize(true);

      // Pass the specific project/version ID to the size check
      // Note: excludePatterns parameter is not needed since the backend
      // will use the PatternResolutionService to get all resolved patterns
      const sizeStats = await window.electron.checkFolderSize(projectId, projectPath);

      setIsCheckingSize(false);

      if (sizeStats.exceedsLimits) {
        setSizeScanResult(sizeStats);
        setShowSizeWarning(true);
        return;
      }

      await performAnalysis(projectId, projectPath);
    } catch (error) {
      setIsCheckingSize(false);
      setResult(`Error: ${error.message}`);
      setFileSizeData([]);
    }
  };

  const performAnalysis = async (projectId, projectPath) => {
    setIsAnalyzing(true);
    setResult('Analyzing...');
    setFileSizeData([]);

    try {
      // The backend analysis handler will automatically resolve patterns using
      // PatternResolutionService.resolveProjectPatterns(projectId)
      // This includes user-defined patterns, module patterns, gitignore, and dotfiles
      const analysisResult = await window.electron.analyzeProject(
        projectId,
        projectPath
      );

      // Handle the new result structure
      setResult(analysisResult.text || '');
      setFileSizeData(analysisResult.fileSizeData || []);
    } catch (error) {
      setResult(`Error: ${error.message}`);
      setFileSizeData([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    result,
    fileSizeData,
    isAnalyzing,
    isCheckingSize,
    showSizeWarning,
    sizeScanResult,
    setShowSizeWarning,
    handleAnalyze,
    performAnalysis
  };
}