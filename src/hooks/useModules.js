// src/hooks/useModules.js - Fixed version with better refresh handling
import { useState, useEffect, useCallback } from 'react';

export function useModules(projectId) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mainProjectId, setMainProjectId] = useState(null);

  // Get the main project ID (for module association)
  useEffect(() => {
    const getMainProjectId = async () => {
      if (!projectId) return;
      
      try {
        // Get all projects to determine the main project ID
        const allProjects = await window.electron.getProjects();
        const currentProject = allProjects.find(p => p.id === projectId);
        
        if (currentProject) {
          // If this project has a parent_id, use that (it's a version)
          // Otherwise, use its own id (it's already the main project)
          const mainId = currentProject.parent_id || currentProject.id;
          setMainProjectId(mainId);
        }
      } catch (error) {
        console.error('Error getting main project ID:', error);
      }
    };

    getMainProjectId();
  }, [projectId]);

  const loadModules = useCallback(async () => {
    if (!mainProjectId) return;
    
    setLoading(true);
    try {
      console.log(`Loading modules for main project ID: ${mainProjectId}`);
      const moduleList = await window.electron.modules.list(mainProjectId);
      
      // Load details for each module (including fresh patterns)
      const detailedModules = await Promise.all(
        moduleList.map(async (module) => {
          const details = await window.electron.modules.get(module.id);
          return details;
        })
      );
      
      console.log(`Loaded ${detailedModules.length} modules with patterns:`, 
        detailedModules.map(m => ({ id: m.id, name: m.name, patterns: m.patterns?.length || 0 }))
      );
      
      setModules(detailedModules);
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  }, [mainProjectId]);

  const createModule = async (moduleData) => {
    if (!mainProjectId) {
      throw new Error('Main project ID not available');
    }

    try {
      console.log(`Creating module for main project ID: ${mainProjectId}`);
      const moduleId = await window.electron.modules.create({
        projectId: mainProjectId, // Always use main project ID
        name: moduleData.name,
        description: moduleData.description
      });

      // Add patterns
      for (const pattern of moduleData.patterns) {
        await window.electron.modules.addPattern({
          moduleId,
          pattern
        });
      }

      // Add dependencies
      for (const depId of moduleData.dependencies) {
        await window.electron.modules.addDependency({
          parentModuleId: moduleId,
          childModuleId: depId
        });
      }

      await loadModules();
      return moduleId;
    } catch (error) {
      console.error('Error creating module:', error);
      throw error;
    }
  };

  const updateModule = async (moduleData) => {
    try {
      console.log(`Updating module ${moduleData.id} with patterns:`, moduleData.patterns);
      
      // FIXED: Update basic module info first
      await window.electron.modules.update({
        moduleId: moduleData.id,
        name: moduleData.name,
        description: moduleData.description
      });

      console.log('Basic module info updated, now updating patterns...');

      // FIXED: Get current patterns fresh from database 
      const currentPatterns = await window.electron.modules.getPatterns(moduleData.id);
      console.log('Current patterns from DB:', currentPatterns);
      console.log('New patterns from form:', moduleData.patterns);
      
      // FIXED: Clear ALL existing patterns first, then add new ones
      // This ensures we don't have issues with partial updates
      for (const pattern of currentPatterns) {
        console.log(`Removing existing pattern: ${pattern}`);
        await window.electron.modules.removePattern({
          moduleId: moduleData.id,
          pattern
        });
      }

      // Add all new patterns
      for (const pattern of moduleData.patterns) {
        if (pattern.trim()) { // Only add non-empty patterns
          console.log(`Adding new pattern: ${pattern}`);
          await window.electron.modules.addPattern({
            moduleId: moduleData.id,
            pattern: pattern.trim()
          });
        }
      }

      // FIXED: Update dependencies the same way - clear and re-add
      console.log('Updating dependencies...');
      
      // Get current dependencies
      const currentDeps = await window.electron.modules.getDependencies(moduleData.id);
      const currentDepIds = currentDeps.map(d => d.id);
      console.log('Current dependencies:', currentDepIds);
      console.log('New dependencies:', moduleData.dependencies);

      // Remove all current dependencies
      for (const depId of currentDepIds) {
        await window.electron.modules.removeDependency({
          parentModuleId: moduleData.id,
          childModuleId: depId
        });
      }

      // Add all new dependencies
      for (const depId of moduleData.dependencies) {
        await window.electron.modules.addDependency({
          parentModuleId: moduleData.id,
          childModuleId: depId
        });
      }

      console.log('Module update completed, reloading modules...');
      await loadModules();
    } catch (error) {
      console.error('Error updating module:', error);
      throw error;
    }
  };

  const deleteModule = async (moduleId) => {
    try {
      await window.electron.modules.delete(moduleId);
      await loadModules();
    } catch (error) {
      console.error('Error deleting module:', error);
      throw error;
    }
  };

  // Force refresh function for external calls
  const refreshModules = useCallback(async () => {
    console.log('Force refreshing modules...');
    await loadModules();
  }, [loadModules]);

  // Load modules when mainProjectId is available
  useEffect(() => {
    if (mainProjectId) {
      loadModules();
    }
  }, [mainProjectId, loadModules]);

  return {
    modules,
    loading,
    mainProjectId, // Export this so components can use it
    createModule,
    updateModule,
    deleteModule,
    loadModules,
    refreshModules // Export refresh function
  };
}