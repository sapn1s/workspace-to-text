// src/hooks/useDependencies.js
import { useState } from 'react';

export function useDependencies() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCheckingSize, setIsCheckingSize] = useState(false);
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [sizeScanResult, setSizeScanResult] = useState(null);

  const handleAnalyzeDependencies = async (projectId, projectPath, excludePatterns) => {
    if (!projectPath) {
      throw new Error('Please select a project folder first.');
    }

    try {
      // Check folder size first
      setIsCheckingSize(true);
      const sizeStats = await window.electron.checkDependencyAnalysisSize(projectId, projectPath);
      setIsCheckingSize(false);

      if (sizeStats.exceedsLimits) {
        setSizeScanResult(sizeStats);
        setShowSizeWarning(true);
        return null; // Return null to indicate size warning shown
      }

      return await performDependencyAnalysis(projectId, projectPath, excludePatterns);
    } catch (error) {
      setIsCheckingSize(false);
      throw error;
    }
  };

  const performDependencyAnalysis = async (projectId, projectPath, excludePatterns) => {
    setIsAnalyzing(true);

    try {
      const result = await window.electron.analyzeDependencies(
        projectId,
        projectPath,
        excludePatterns
      );
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    isAnalyzing,
    isCheckingSize,
    showSizeWarning,
    sizeScanResult,
    setShowSizeWarning,
    handleAnalyzeDependencies,
    performDependencyAnalysis
  };
}