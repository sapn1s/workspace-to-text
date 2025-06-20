// src/hooks/usePatternResolution.js

import { useState, useEffect, useCallback } from 'react';

export function usePatternResolution(projectId) {
    const [resolvedPatterns, setResolvedPatterns] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const resolvePatterns = useCallback(async () => {
        if (!projectId) {
            setResolvedPatterns(null);
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const patterns = await window.electron.patterns.resolve(projectId);
            setResolvedPatterns(patterns);
        } catch (err) {
            console.error('Error resolving patterns:', err);
            setError(err.message || 'Failed to resolve patterns');
            setResolvedPatterns(null);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        resolvePatterns();
    }, [resolvePatterns]);

    return {
        resolvedPatterns,
        loading,
        error,
        resolvePatterns
    };
}