import React, { useState, useEffect } from 'react';
import {
  FolderIcon,
  MagnifyingGlassIcon,
  ClipboardIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import ProjectExplorer from './components/ProjectExplorer';
import PatternInputs from './components/PatternInputs';
import AnalysisResultContainer from './components/AnalysisResultContainer';
import ProjectMenu from './components/ProjectMenu';
import ProjectVersionSelector from './components/ProjectVersionSelector';
import ProjectList from './components/ProjectList';

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectPath, setProjectPath] = useState('');
  const [result, setResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [includePatterns, setIncludePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const loadedProjects = await window.electron.getProjects();
    setProjects(loadedProjects);
  };

  const loadVersions = async (projectId) => {
    if (!projectId) return;
    try {
      // Get the main project first
      const mainProject = await window.electron.getProjects()
        .then(projects => projects.find(p => p.id === projectId));

      // Get all versions
      const projectVersions = await window.electron.getProjectVersions(projectId);

      // Include main project in versions if it exists
      setVersions(mainProject ? [mainProject, ...projectVersions] : projectVersions);
    } catch (error) {
      console.error('Error loading versions:', error);
      setVersions([]);
    }
  };


  const handleCreateProject = async (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      if (newProjectName.trim()) {
        const newProjectId = await window.electron.createProject(newProjectName);
        await loadProjects();
        setNewProjectName('');
        const newProject = (await window.electron.getProjects()).find(p => p.id === newProjectId);
        setSelectedProject(newProject);
        setProjectPath(newProject.path || '');
        await loadProjectPatterns(newProjectId);
      }
    }
  };

  const handleDeleteProject = async (projectId) => {
    await window.electron.deleteProject(projectId);
    await loadProjects();
    if (selectedProject && selectedProject.id === projectId) {
      setSelectedProject(null);
      setProjectPath('');
    }
  };

  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    setProjectPath(project.path || '');
    await loadProjectPatterns(project.id);
    await loadVersions(project.parent_id || project.id); // Load versions for the main project
  };

  const handleVersionSelect = async (version) => {
    if (!version) return;

    setSelectedProject(version);
    setProjectPath(version.path || '');
    await loadProjectPatterns(version.id);
  };
  const loadProjectPatterns = async (projectId) => {
    const patterns = await window.electron.getProjectPatterns(projectId);
    console.log("main process returned", patterns, typeof (patterns))
    setIncludePatterns(patterns.include_patterns || '');
    setExcludePatterns(patterns.exclude_patterns || '');
  };

  const handleFolderSelect = async () => {
    try {
      const path = await window.electron.openDirectory();
      if (path) {
        setProjectPath(path);
        if (selectedProject) {
          await window.electron.setProjectPath(selectedProject.id, path);
          await loadProjects();
          setSelectedProject(prev => ({ ...prev, path }));
        }
      }
    } catch (error) {
      console.error('Failed to open directory:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!projectPath) {
      setResult('Please select a project folder first.');
      return;
    }
    setIsAnalyzing(true);
    setResult('Analyzing...');
    try {
      const analysis = await window.electron.analyzeProject(
        selectedProject.id,
        projectPath,
        includePatterns,
        excludePatterns
      );
      setResult(analysis);
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVersionCreated = async (newVersionId) => {
    await loadVersions(selectedProject.parent_id || selectedProject.id);
    // Find and select the newly created version
    const allProjects = await window.electron.getProjects();
    const newVersion = allProjects.find(p => p.id === newVersionId);
    if (newVersion) {
      setSelectedProject(newVersion);
      setProjectPath(newVersion.path);
      await loadProjectPatterns(newVersion.id);
    }
  };

  const handleExcludePatternAdd = async (newPatterns) => {
    // If we receive an event object, extract the value
    const patternsString = typeof newPatterns === 'object' && newPatterns.target
      ? newPatterns.target.value
      : newPatterns;

    setExcludePatterns(patternsString);

    // Save patterns immediately when they change
    if (selectedProject) {
      await window.electron.updateProjectPatterns(
        selectedProject.id,
        includePatterns,
        patternsString
      );
    }
  };
  const handleIncludeChange = async (e) => {
    const newPatterns = e.target.value;
    setIncludePatterns(newPatterns);

    // Save patterns immediately when they change
    if (selectedProject) {
      await window.electron.updateProjectPatterns(
        selectedProject.id,
        newPatterns,
        excludePatterns
      );
    }
  };

  const renderProjectList = () => (
    <>
      <div className="space-y-4 mb-6">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyPress={handleCreateProject}
            className="flex-grow px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="New project name"
          />
          <button
            onClick={handleCreateProject}
            className="p-2 bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 text-blue-500" />
          </button>
        </div>
      </div>
      <ProjectList
        projects={projects}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
      />
    </>
  );

  const renderProjectView = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <button
            onClick={() => setSelectedProject(null)}
            className="mr-4 p-2 bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="h-5 w-5 text-blue-500" />
          </button>
          <h2 className="text-xl font-semibold">{selectedProject.name}</h2>
        </div>
        <ProjectMenu
          project={selectedProject}
          onVersionCreated={handleVersionCreated}
        />
      </div>

      <ProjectVersionSelector
        project={selectedProject}
        versions={versions}
        onVersionSelect={handleVersionSelect}
      />

      <div className="flex-grow flex gap-6">
        <div className="w-80">
          <ProjectExplorer
            path={projectPath}
            includePatterns={includePatterns}
            excludePatterns={excludePatterns}
            onRefresh={handleAnalyze}
            onExcludePatternAdd={handleExcludePatternAdd}
          />
        </div>

        <div className="flex-grow flex flex-col min-w-0">
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={projectPath}
                readOnly
                className="flex-grow px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Select project folder"
              />
              <button
                onClick={handleFolderSelect}
                className="p-2 bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isAnalyzing}
              >
                <FolderIcon className="h-5 w-5 text-blue-500" />
              </button>
            </div>

            <PatternInputs
              includePatterns={includePatterns}
              excludePatterns={excludePatterns}
              onIncludeChange={handleIncludeChange}
              onExcludeChange={handleExcludePatternAdd}
            />

            <button
              onClick={handleAnalyze}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm font-medium"
              disabled={isAnalyzing || !projectPath}
            >
              {isAnalyzing ? (
                'Analyzing...'
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                  Analyze
                </>
              )}
            </button>
          </div>

          <div className="min-w-0">
            <h3 className="text-lg font-medium mb-2">Analysis Result:</h3>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => window.electron.copyToClipboard(result)}
                className="p-2 bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!result}
              >
                <ClipboardIcon className="h-5 w-5 text-blue-500" />
              </button>
            </div>
            <AnalysisResultContainer result={result} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex-grow flex flex-col max-w-6xl w-full mx-auto">
        {!selectedProject ? renderProjectList() : renderProjectView()}
      </div>
    </div>
  );
}

export default App;