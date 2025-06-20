// src/hooks/useProjects.js - Updated with version deletion support

import { useState, useEffect, useRef } from 'react';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [versions, setVersions] = useState([]);
  const [projectPath, setProjectPath] = useState('');
  const isVersionSwitching = useRef(false);

  const loadProjects = async () => {
    console.log("Loading projects");
    const loadedProjects = await window.electron.getProjects();
    setProjects(loadedProjects);
    return loadedProjects.reduce((acc, project) => {
      if (project.parent_id) acc.add(project.parent_id);
      return acc;
    }, new Set());
  };

  const loadVersions = async (projectId) => {
    if (!projectId) return [];
    try {
      console.log("Loading versions for project ID:", projectId);

      // First, determine if this is a version or main project
      const allProjects = await window.electron.getProjects();
      const project = allProjects.find(p => p.id === projectId);

      if (!project) {
        console.warn("Project not found:", projectId);
        return [];
      }

      // Get the main project ID (either the current ID or its parent)
      const mainProjectId = project.parent_id || project.id;
      console.log("Main project ID:", mainProjectId);

      // Get the main project
      const mainProject = allProjects.find(p => p.id === mainProjectId);

      // Get all versions of this project
      const projectVersions = await window.electron.getProjectVersions(mainProjectId);
      console.log(`Found ${projectVersions.length} versions for project ${mainProjectId}`);

      if (mainProject) {
        const allVersions = [mainProject, ...projectVersions];
        setVersions(allVersions);
        return allVersions;
      } else {
        setVersions(projectVersions);
        return projectVersions;
      }
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
        // Set the project directly without clearing first
        setSelectedProject(freshProject);
        setProjectPath(freshProject.path || '');

        // Load versions based on parent_id if this is a version, or on the project's id if it's a main project
        await loadVersions(freshProject.parent_id || freshProject.id);
        return freshProject;
      }
    } catch (error) {
      console.error('Error selecting project:', error);
    }
  };

  const handleVersionSelect = async (version) => {
    if (!version) return;
    try {
      // Set flag to indicate we're switching versions
      isVersionSwitching.current = true;
      
      const allProjects = await window.electron.getProjects();
      const freshVersion = allProjects.find(p => p.id === version.id);

      if (freshVersion) {
        // Update project path first 
        setProjectPath(freshVersion.path || '');
        // Then update the selected project
        setSelectedProject(freshVersion);
        
        console.log('Version switched to:', freshVersion.id, 'with path:', freshVersion.path);

        // Load all versions of this project family
        const parentId = freshVersion.parent_id || freshVersion.id;
        await loadVersions(parentId);
      }
      
      // Reset switching flag when done
      isVersionSwitching.current = false;
    } catch (error) {
      console.error('Error selecting version:', error);
      isVersionSwitching.current = false;
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
    isVersionSwitching: isVersionSwitching.current,
    setProjectPath,
    setSelectedProject,
    loadProjects,
    loadVersions,
    handleSelectProject,
    handleDeleteProject,
    handleDeleteVersion, // NEW: Export the version deletion handler
    handleRenameProject,
    handleVersionSelect,
    handleVersionCreated
  };
}