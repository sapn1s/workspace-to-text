// src/pages/ProjectView/components/DependencyGraph/hooks/useDependencyAnalysis.js
import { useState } from 'react';

export function useDependencyAnalysis(projectId) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCheckingSize, setIsCheckingSize] = useState(false);
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [sizeScanResult, setSizeScanResult] = useState(null);

  const analyzeDependencies = async (projectPath, includePatterns, excludePatterns) => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.electron.analyzeDependencies(
        projectId,
        projectPath,
        includePatterns,
        excludePatterns
      );
      setGraphData(result);
    } catch (err) {
      setError(err.message || 'Failed to analyze dependencies');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (projectPath, includePatterns, excludePatterns) => {
    if (!projectPath) {
      setError('Please select a project folder first.');
      return;
    }

    try {
      setIsCheckingSize(true);

      // Check folder size first
      const sizeStats = await window.electron.checkDependencyAnalysisSize(projectId, projectPath);

      setIsCheckingSize(false);

      if (sizeStats.exceedsLimits) {
        setSizeScanResult(sizeStats);
        setShowSizeWarning(true);
        return;
      }

      await analyzeDependencies(projectPath, includePatterns, excludePatterns);
    } catch (err) {
      setIsCheckingSize(false);
      setError(err.message || 'Failed to check folder size');
    }
  };

  return {
    graphData,
    loading,
    error,
    isCheckingSize,
    showSizeWarning,
    sizeScanResult,
    setShowSizeWarning,
    handleAnalyze,
    analyzeDependencies
  };
}