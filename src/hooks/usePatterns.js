import { useState, useCallback } from 'react';

export function usePatterns() {
  const [excludePatterns, setExcludePatterns] = useState(''); // User-defined patterns only
  const [resolvedPatterns, setResolvedPatterns] = useState(null); // Complete resolved patterns
  const [loading, setLoading] = useState(false);

  const loadProjectPatterns = useCallback(async (projectId) => {
    if (!projectId) {
      setExcludePatterns('');
      setResolvedPatterns(null);
      return;
    }

    setLoading(true);
    try {
      // Load user-defined patterns separately for the UI input
      const rawPatterns = await window.electron.getProjectPatterns(projectId);
      setExcludePatterns(rawPatterns.exclude_patterns || '');
      
      // Load resolved patterns (includes modules, gitignore, dotfiles) for actual filtering
      const patterns = await window.electron.patterns.resolve(projectId);
      setResolvedPatterns(patterns);
      
      console.log('Loaded patterns for project', projectId, ':');
      console.log('- User patterns:', rawPatterns.exclude_patterns || '(none)');
      console.log('- Resolved patterns:', patterns);
    } catch (error) {
      console.error('Error loading project patterns:', error);
      setExcludePatterns('');
      setResolvedPatterns(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExcludePatternAdd = useCallback(async (newPatterns, projectId) => {
    const patternsString = typeof newPatterns === 'object' && newPatterns.target
      ? newPatterns.target.value
      : newPatterns;
    
    // Update the user-defined patterns in the UI immediately
    setExcludePatterns(patternsString);
    
    if (projectId) {
      try {
        // Update the basic project patterns in the database
        await window.electron.updateProjectPatterns(projectId, patternsString);
        
        // Reload the resolved patterns (no cache to clear)
        const patterns = await window.electron.patterns.resolve(projectId);
        setResolvedPatterns(patterns);
        
        console.log('Updated patterns:', {
          userPatterns: patternsString,
          resolvedPatterns: patterns
        });
      } catch (error) {
        console.error('Error updating project patterns:', error);
      }
    }
  }, []);

  return {
    excludePatterns, // User-defined patterns only (for UI input)
    resolvedPatterns, // Complete resolved patterns (for actual filtering)
    loading,
    loadProjectPatterns,
    handleExcludePatternAdd
  };
}