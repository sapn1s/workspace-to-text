import React, { useState, useEffect } from 'react';
import { FolderIcon, MagnifyingGlassIcon, ClipboardIcon, PlusIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

function ProjectList({ projects, onSelectProject, onDeleteProject }) {
  return (
    <div className="flex-grow overflow-auto">
      <h2 className="text-lg font-medium mb-2">Existing Projects:</h2>
      <ul className="space-y-2">
        {projects.map((project) => (
          <li key={project.id} className="flex items-center">
            <button
              onClick={() => onSelectProject(project)}
              className="flex-grow text-left px-3 py-2 bg-gray-800 rounded-l-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {project.name}
            </button>
            <button
              onClick={() => onDeleteProject(project.id)}
              className="p-2 bg-gray-800 rounded-r-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <TrashIcon className="h-5 w-5 text-red-500" />
            </button>
          </li>
        ))}  
      </ul>
    </div>
  );
}

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectPath, setProjectPath] = useState('');
  const [result, setResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [includePatterns, setIncludePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const loadedProjects = await window.electron.getProjects();
    setProjects(loadedProjects);
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
      const analysis = await window.electron.analyzeProject(selectedProject.id, projectPath, includePatterns, excludePatterns);
      setResult(analysis);
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyResult = () => {
    window.electron.copyToClipboard(result);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex-grow flex flex-col max-w-3xl w-full mx-auto">
        {!selectedProject ? (
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
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setSelectedProject(null)}
                className="mr-4 p-2 bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <ArrowLeftIcon className="h-5 w-5 text-blue-500" />
              </button>
              <h2 className="text-xl font-semibold">{selectedProject.name}</h2>
            </div>

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

              <div className="space-y-2">
                <input
                  type="text"
                  value={includePatterns}
                  onChange={(e) => setIncludePatterns(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Include patterns (comma-separated)"
                />
                <input
                  type="text"
                  value={excludePatterns}
                  onChange={(e) => setExcludePatterns(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Exclude patterns (comma-separated)"
                />
              </div>

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

            <div className="flex-grow flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Analysis Result:</h3>
                <button
                  onClick={handleCopyResult}
                  className="p-2 bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!result}
                >
                  <ClipboardIcon className="h-5 w-5 text-blue-500" />
                </button>
              </div>
              <div className="flex-grow bg-gray-800 p-4 rounded-md overflow-hidden flex flex-col max-h-[calc(80vh-200px)]">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words overflow-y-auto flex-grow ">
                  {result}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;