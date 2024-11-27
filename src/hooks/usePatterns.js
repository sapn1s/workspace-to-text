import { useState } from 'react';

export function usePatterns() {
  const [includePatterns, setIncludePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');

  const loadProjectPatterns = async (projectId) => {
    const patterns = await window.electron.getProjectPatterns(projectId);
    setIncludePatterns(patterns.include_patterns || '');
    setExcludePatterns(patterns.exclude_patterns || '');
  };

  const handleIncludeChange = async (e, projectId) => {
    const newPatterns = e.target.value;
    setIncludePatterns(newPatterns);
    if (projectId) {
      await window.electron.updateProjectPatterns(
        projectId,
        newPatterns,
        excludePatterns
      );
    }
  };

  const handleExcludePatternAdd = async (newPatterns, projectId) => {
    const patternsString = typeof newPatterns === 'object' && newPatterns.target
      ? newPatterns.target.value
      : newPatterns;
    setExcludePatterns(patternsString);
    if (projectId) {
      await window.electron.updateProjectPatterns(
        projectId,
        includePatterns,
        patternsString
      );
    }
  };

  return {
    includePatterns,
    excludePatterns,
    loadProjectPatterns,
    handleIncludeChange,
    handleExcludePatternAdd
  };
}