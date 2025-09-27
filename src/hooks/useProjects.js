// src/hooks/useProjects.js - Updated with version deletion support

import { useState, useEffect, useRef } from 'react';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [versions, setVersions] = useState([]);
  const [projectPath, setProjectPath] = useState('');
  const [mainProjectId, setMainProjectId] = useState(null);
  const isVersionSwitching = useRef(false);

  const loadProjects = async () => {
    const loadedProjects = await window.electron.getProjects();
    setProjects(loadedProjects);
    return loadedProjects.reduce((acc, project) => {
      if (project.parent_id) acc.add(project.parent_id);
      return acc;
    }, new Set());
  };

  const loadVersions = async (mainProjectId) => {
    if (!mainProjectId) return [];
    try {
      console.log("Loading versions for main project ID:", mainProjectId);

      // Pass the main project ID directly - no calculation needed
      const allVersions = await window.electron.getProjectVersions(mainProjectId);
      console.log(`Found ${allVersions.length} total items for main project ${mainProjectId}`);

      setVersions(allVersions);
      return allVersions;
    } catch (error) {
      console.error('Error loading versions:', error);
      setVersions([]);
      return [];
    }
  };

  const handleSelectProject = async (project) => {
    if (!project) return;
    try {
      const allProjects = await window.electron.getProjects();
      const freshProject = allProjects.find(p => p.id === project.id);
      if (freshProject) {
        setSelectedProject(freshProject);
        setProjectPath(freshProject.path || '');

        // Calculate and store main project ID
        const calculatedMainProjectId = freshProject.parent_id || freshProject.id;
        setMainProjectId(calculatedMainProjectId);

        await loadVersions(calculatedMainProjectId);
        return freshProject;
      }
    } catch (error) {
      console.error('Error selecting project:', error);
    }
  };

  const handleVersionSelect = async (version) => {
    if (!version) return;
    try {
      isVersionSwitching.current = true;

      const allProjects = await window.electron.getProjects();
      const freshVersion = allProjects.find(p => p.id === version.id);

      if (freshVersion) {
        setProjectPath(freshVersion.path || '');
        setSelectedProject(freshVersion);

        // Calculate and store main project ID
        const calculatedMainProjectId = freshVersion.parent_id || freshVersion.id;
        setMainProjectId(calculatedMainProjectId);

        await loadVersions(calculatedMainProjectId);
      }

      isVersionSwitching.current = false;
    } catch (error) {
      console.error('Error selecting version:', error);
      isVersionSwitching.current = false;
    }
  };

  const handleVersionUpdated = async () => {
    try {
      // Reload all projects to get updated data
      await loadProjects();

      // If we have a selected project, refresh its data
      if (selectedProject) {
        const allProjects = await window.electron.getProjects();
        const updatedProject = allProjects.find(p => p.id === selectedProject.id);

        if (updatedProject) {
          setSelectedProject(updatedProject);
          setProjectPath(updatedProject.path || '');
        }

        // Reload versions for the project family
        const mainProjectId = selectedProject.parent_id || selectedProject.id;
        await loadVersions(mainProjectId);
      }

      console.log('Version updated successfully');
      return true;
    } catch (error) {
      console.error('Error handling version update:', error);
      throw error;
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await window.electron.deleteProject(projectId);
      await loadProjects();
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setProjectPath('');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error; // Re-throw so UI can show the error
    }
  };

  // NEW: Handle version deletion
  const handleDeleteVersion = async (mainProjectId) => {
    try {
      // Reload projects to get updated data
      await loadProjects();

      // Reload versions for the main project
      await loadVersions(mainProjectId);

      // If the deleted version was the currently selected one, switch to main project
      if (selectedProject && selectedProject.parent_id === mainProjectId) {
        const allProjects = await window.electron.getProjects();
        const mainProject = allProjects.find(p => p.id === mainProjectId);

        if (mainProject) {
          setSelectedProject(mainProject);
          setProjectPath(mainProject.path || '');
        }
      }

      return true;
    } catch (error) {
      console.error('Error handling version deletion:', error);
      throw error;
    }
  };

  const handleRenameProject = async (projectId, newName) => {
    try {
      await window.electron.renameProject(projectId, newName);
      await loadProjects();

      // If the renamed project is the currently selected one, update it
      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => ({ ...prev, name: newName }));
      }
    } catch (error) {
      console.error('Error renaming project:', error);
    }
  };

  const handleVersionCreated = async (mainProjectId, newVersionId) => {
    try {
      // Set flag to indicate we're switching versions
      isVersionSwitching.current = true;

      // Reload all projects to get the latest data
      await loadProjects();

      // Get the full list of projects
      const allProjects = await window.electron.getProjects();

      // Find the newly created version directly
      const newVersion = allProjects.find(p => p.id === newVersionId);

      if (newVersion) {
        console.log("Switching to newly created version:", newVersion);

        // Update project path first
        setProjectPath(newVersion.path || '');
        // Then update the selected project
        setSelectedProject(newVersion);

        // Then load all versions of this project family
        await loadVersions(mainProjectId);
      } else {
        console.error("Could not find newly created version with ID:", newVersionId);
        // Reload the versions list as a fallback
        await loadVersions(mainProjectId);
      }

      // Reset switching flag when done
      isVersionSwitching.current = false;
    } catch (error) {
      console.error('Error handling version creation:', error);
      isVersionSwitching.current = false;
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return {
    projects,
    selectedProject,
    versions,
    projectPath,
    mainProjectId,
    isVersionSwitching: isVersionSwitching.current,
    setProjectPath,
    setSelectedProject,
    loadProjects,
    loadVersions,
    handleSelectProject,
    handleDeleteProject,
    handleDeleteVersion,
    handleRenameProject,
    handleVersionSelect,
    handleVersionCreated,
    handleVersionUpdated
  };
}