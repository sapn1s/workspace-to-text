import React, { useEffect, useState } from 'react';
import ProjectListPage from './pages/ProjectList/ProjectListPage';
import ProjectView from './pages/ProjectView/ProjectView';
import DependencyGraphApp from './DependencyGraphApp';
import { SizeWarningDialog } from './pages/ProjectView/components/SizeWarningDialog/SizeWarningDialog';
import { useProjects } from './hooks/useProjects';
import { useAnalysis } from './hooks/useAnalysis';

function App() {
  // Check if this is a dependency graph window immediately
  const isDependencyGraphWindow = window.location.hash.startsWith('#dependency-graph');
  
  // If it's a dependency graph window, render it directly without initializing other hooks, because .electron methods wont be available
  if (isDependencyGraphWindow) {
    return <DependencyGraphApp />;
  }

  const [currentView, setCurrentView] = useState('main');

  const {
    projects,
    selectedProject,
    versions,
    projectPath,
    setProjectPath,
    setSelectedProject,
    loadProjects,
    handleSelectProject,
    handleDeleteProject,
    handleDeleteVersion, // NEW: Add version deletion handler
    handleRenameProject,
    handleVersionSelect,
    handleVersionCreated
  } = useProjects();

  const {
    result,
    fileSizeData,
    isAnalyzing,
    isCheckingSize,
    showSizeWarning,
    sizeScanResult,
    setShowSizeWarning,
    handleAnalyze,
    performAnalysis
  } = useAnalysis();

  // Simple URL-based routing (this is now redundant but kept for consistency)
  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#dependency-graph')) {
        setCurrentView('dependency-graph');
      } else {
        setCurrentView('main');
      }
    };

    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, []);

  const handleCreateProject = async (name) => {
    const newProjectId = await window.electron.createProject(name);
    await loadProjects();
    const newProject = (await window.electron.getProjects()).find(p => p.id === newProjectId);
    await handleSelectProject(newProject);
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

  // NEW: Handle version deletion with proper error handling
  const handleVersionDeletedWithErrorHandling = async (mainProjectId) => {
    try {
      await handleDeleteVersion(mainProjectId);
    } catch (error) {
      console.error('Failed to delete version:', error);
      alert('Failed to delete version: ' + error.message);
    }
  };

  // Enhanced delete handler with proper error handling
  const handleDeleteProjectWithErrorHandling = async (projectId) => {
    try {
      await handleDeleteProject(projectId);
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project: ' + error.message);
    }
  };

  // Main application view
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="min-h-screen bg-gray-900 text-gray-100 p-6 overflow-auto">
        <div className="w-full mx-auto">
          {!selectedProject ? (
            <ProjectListPage
              projects={projects}
              onCreateProject={handleCreateProject}
              onSelectProject={handleSelectProject}
              onDeleteProject={handleDeleteProjectWithErrorHandling}
              onRenameProject={handleRenameProject}
            />
          ) : (
            <ProjectView
              key={`project-view-${selectedProject.id}`}
              project={selectedProject}
              versions={versions}
              projectPath={projectPath}
              isAnalyzing={isAnalyzing}
              isCheckingSize={isCheckingSize}
              result={result}
              fileSizeData={fileSizeData}
              onBack={() => setSelectedProject(null)}
              onFolderSelect={handleFolderSelect}
              onAnalyze={(projectId, path, patterns) => handleAnalyze(projectId, path, patterns)}
              onVersionSelect={handleVersionSelect}
              onVersionCreated={handleVersionCreated}
              onVersionDeleted={handleVersionDeletedWithErrorHandling} // NEW: Pass version deletion handler
            />
          )}
        </div>
      </div>

      {showSizeWarning && (
        <SizeWarningDialog
          sizeStats={sizeScanResult}
          onClose={() => setShowSizeWarning(false)}
          onProceed={() => {
            setShowSizeWarning(false);
            performAnalysis(
              selectedProject.id,
              projectPath,
              '' // Patterns will be resolved in the analysis handler
            );
          }}
        />
      )}
    </div>
  );
}

export default App;