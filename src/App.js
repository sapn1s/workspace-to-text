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
      const mainProject = await window.electron.getProjects()
        .then(projects => projects.find(p => p.id === projectId));
      const projectVersions = await window.electron.getProjectVersions(projectId);
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
    await loadVersions(project.parent_id || project.id);
  };

  const handleVersionSelect = async (version) => {
    if (!version) return;
    setSelectedProject(version);
    setProjectPath(version.path || '');
    await loadProjectPatterns(version.id);
  };

  const loadProjectPatterns = async (projectId) => {
    const patterns = await window.electron.getProjectPatterns(projectId);
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
    const allProjects = await window.electron.getProjects();
    const newVersion = allProjects.find(p => p.id === newVersionId);
    if (newVersion) {
      setSelectedProject(newVersion);
      setProjectPath(newVersion.path);
      await loadProjectPatterns(newVersion.id);
    }
  };

  const handleExcludePatternAdd = async (newPatterns) => {
    const patternsString = typeof newPatterns === 'object' && newPatterns.target
      ? newPatterns.target.value
      : newPatterns;

    setExcludePatterns(patternsString);

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

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="min-h-screen bg-gray-900 text-gray-100 p-6 overflow-auto">
        <div className="max-w-7xl w-full mx-auto">
          {!selectedProject ? renderProjectList() : (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between sticky top-0 bg-gray-900 py-2 z-10">
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

              {/* Version Selector */}
              <ProjectVersionSelector
                project={selectedProject}
                versions={versions}
                onVersionSelect={handleVersionSelect}
              />

              {/* Main Content */}
              <div className="flex gap-6 flex-col lg:flex-row">
                {/* Left Sidebar */}
                <div className="w-full lg:w-80 flex-shrink-0 h-[calc(100vh-12rem)]"> 
                  <ProjectExplorer
                    path={projectPath}
                    includePatterns={includePatterns}
                    excludePatterns={excludePatterns}
                    onRefresh={handleAnalyze}
                    onExcludePatternAdd={handleExcludePatternAdd}
                  />
                </div>

                {/* Right Content */}
                <div className="flex-grow space-y-4">
                  {/* Controls */}
                  <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={projectPath}
                        readOnly
                        className="flex-grow px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Select project folder"
                      />
                      <button
                        onClick={handleFolderSelect}
                        className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                  {/* Analysis Result */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Analysis Result:</h3>
                      <button
                        onClick={() => window.electron.copyToClipboard(result)}
                        className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!result}
                      >
                        <ClipboardIcon className="h-5 w-5 text-blue-500" />
                      </button>
                    </div>
                    <div className="h-[500px]">
                      <AnalysisResultContainer result={result} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;