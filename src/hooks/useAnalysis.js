import { useState } from 'react';

export function useAnalysis() {
  const [result, setResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCheckingSize, setIsCheckingSize] = useState(false);
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [sizeScanResult, setSizeScanResult] = useState(null);

  const handleAnalyze = async (projectId, projectPath, includePatterns, excludePatterns) => {
    if (!projectPath) {
      setResult('Please select a project folder first.');
      return;
    }

    try {
      // Set loading state for size check
      setIsCheckingSize(true);
      
      // Check folder size first
      const sizeStats = await window.electron.checkFolderSize(projectPath);
      
      setIsCheckingSize(false);

      if (sizeStats.exceedsLimits) {
        setSizeScanResult(sizeStats);
        setShowSizeWarning(true);
        return;
      }

      await performAnalysis(projectId, projectPath, includePatterns, excludePatterns);
    } catch (error) {
      setIsCheckingSize(false);
      setResult(`Error: ${error.message}`);
    }
  };

  const performAnalysis = async (projectId, projectPath, includePatterns, excludePatterns) => {
    setIsAnalyzing(true);
    setResult('Analyzing...');
    try {
      const analysis = await window.electron.analyzeProject(
        projectId,
        projectPath,
        includePatterns,
        excludePatterns
      );
      setResult(analysis);
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    result,
    isAnalyzing,
    isCheckingSize,
    showSizeWarning,
    sizeScanResult,
    setShowSizeWarning,
    handleAnalyze,
    performAnalysis
  };
}