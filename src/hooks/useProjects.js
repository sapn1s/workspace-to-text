import { useState, useEffect } from 'react';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [versions, setVersions] = useState([]);
  const [projectPath, setProjectPath] = useState('');

  const loadProjects = async () => {
    const loadedProjects = await window.electron.getProjects();
    setProjects(loadedProjects);
    return loadedProjects.reduce((acc, project) => {
      if (project.parent_id) acc.add(project.parent_id);
      return acc;
    }, new Set());
  };

  const loadVersions = async (projectId) => {
    if (!projectId) return;
    try {
      const mainProject = await window.electron.getProjects()
        .then(projects => projects.find(p => p.id === projectId));
      const projectVersions = await window.electron.getProjectVersions(projectId);
      setVersions(mainProject ? [mainProject, ...projectVersions] : projectVersions);
      return projectVersions;
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
      const allProjects = await window.electron.getProjects();
      const freshVersion = allProjects.find(p => p.id === version.id);
      
      if (freshVersion) {
        setSelectedProject(freshVersion);
        setProjectPath(freshVersion.path || '');
        const parentId = freshVersion.parent_id || freshVersion.id;
        await loadVersions(parentId);
      }
    } catch (error) {
      console.error('Error selecting version:', error);
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
    }
  };

  const handleVersionCreated = async (parentId, newVersionId) => {
    try {
      await loadProjects();
      const projectVersions = await loadVersions(parentId);
      
      // Find and select the newly created version
      const newVersion = projectVersions.find(v => v.id === newVersionId);
      if (newVersion) {
        await handleVersionSelect(newVersion);
      }
    } catch (error) {
      console.error('Error handling version creation:', error);
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
    setProjectPath,
    setSelectedProject,
    loadProjects,
    loadVersions,
    handleSelectProject,
    handleDeleteProject,
    handleVersionSelect,
    handleVersionCreated
  };
}