// src/hooks/useModules.js
import { useState, useEffect } from 'react';

export function useModules(projectId, mainProjectId) {
  const [modules, setModules] = useState([]);

  const loadModules = async () => {
    if (!mainProjectId) return;

    try {
      const modulesList = await window.electron.modules.list(mainProjectId);

      // Load patterns for each module
      const modulesWithPatterns = await Promise.all(
        modulesList.map(async (module) => {
          const patterns = await window.electron.modules.getPatterns(module.id);
          return { ...module, patterns };
        })
      );

      setModules(modulesWithPatterns);
    } catch (error) {
      console.error('Error loading modules:', error);
      setModules([]);
    }
  };

  const refreshModules = async () => {
    await loadModules(projectId);
  };

  const createModule = async (moduleData) => {
    if (!mainProjectId) {
      console.error('No main project ID available for module creation');
      return;
    }
    try {
      const newModule = await window.electron.modules.create({
        ...moduleData,
        mainProjectId: mainProjectId
      });
      await loadModules(projectId);
      return newModule;
    } catch (error) {
      console.error('Error creating module:', error);
      throw error;
    }
  };

  const updateModule = async (moduleData) => {
    try {
      console.log("trying to update the module hyh", moduleData)
      await window.electron.modules.update(moduleData);

      await loadModules(projectId);
    } catch (error) {
      console.error('Error updating module:', error);
      throw error;
    }
  };

  const deleteModule = async (moduleId) => {
    try {
      await window.electron.modules.delete(moduleId);
      await loadModules(projectId);
    } catch (error) {
      console.error('Error deleting module:', error);
      throw error;
    }
  };

  // Load modules when projectId changes
  useEffect(() => {
    loadModules(projectId);
  }, [projectId]);

  return {
    modules,
    mainProjectId,
    createModule,
    updateModule,
    deleteModule,
    refreshModules
  };
}