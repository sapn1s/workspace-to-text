import { useState, useEffect } from 'react';

export function useModules(projectId) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadModules = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const moduleList = await window.electron.modules.list(projectId);
      
      // Load details for each module
      const detailedModules = await Promise.all(
        moduleList.map(async (module) => {
          const details = await window.electron.modules.get(module.id);
          return details;
        })
      );
      
      setModules(detailedModules);
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const createModule = async (moduleData) => {
    try {
      const moduleId = await window.electron.modules.create({
        projectId,
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
      await window.electron.modules.update({
        moduleId: moduleData.id,
        name: moduleData.name,
        description: moduleData.description
      });

      // Get current patterns
      const currentPatterns = await window.electron.modules.getPatterns(moduleData.id);
      
      // Remove patterns that are not in the new list
      for (const pattern of currentPatterns) {
        if (!moduleData.patterns.includes(pattern)) {
          await window.electron.modules.removePattern({
            moduleId: moduleData.id,
            pattern
          });
        }
      }

      // Add new patterns
      for (const pattern of moduleData.patterns) {
        if (!currentPatterns.includes(pattern)) {
          await window.electron.modules.addPattern({
            moduleId: moduleData.id,
            pattern
          });
        }
      }

      // Get current dependencies
      const currentDeps = await window.electron.modules.getDependencies(moduleData.id);
      const currentDepIds = currentDeps.map(d => d.id);

      // Remove dependencies that are not in the new list
      for (const depId of currentDepIds) {
        if (!moduleData.dependencies.includes(depId)) {
          await window.electron.modules.removeDependency({
            parentModuleId: moduleData.id,
            childModuleId: depId
          });
        }
      }

      // Add new dependencies
      for (const depId of moduleData.dependencies) {
        if (!currentDepIds.includes(depId)) {
          await window.electron.modules.addDependency({
            parentModuleId: moduleData.id,
            childModuleId: depId
          });
        }
      }

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

  useEffect(() => {
    loadModules();
  }, [projectId]);

  return {
    modules,
    loading,
    createModule,
    updateModule,
    deleteModule,
    loadModules
  };
}