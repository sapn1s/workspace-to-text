import React, { useEffect } from 'react';
import ProjectList from './components/ProjectList';
import ProjectView from './components/ProjectView';
import { NewProject } from './components/NewProject';
import { SizeWarningDialog } from './components/SizeWarningDialog';
import { useProjects } from './hooks/useProjects';
import { usePatterns } from './hooks/usePatterns';
import { useAnalysis } from './hooks/useAnalysis';

function App() {
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
    handleVersionSelect,
    handleVersionCreated
  } = useProjects();

  const {
    includePatterns,
    excludePatterns,
    loadProjectPatterns,
    handleIncludeChange,
    handleExcludePatternAdd
  } = usePatterns();

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

  useEffect(() => {
    if (selectedProject) {
      loadProjectPatterns(selectedProject.id);
    }
  }, [selectedProject, loadProjectPatterns]);

  const handleCreateProject = async (name) => {
    const newProjectId = await window.electron.createProject(name);
    await loadProjects();
    const newProject = (await window.electron.getProjects()).find(p => p.id === newProjectId);
    await handleSelectProject(newProject);
    await loadProjectPatterns(newProjectId);
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

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="min-h-screen bg-gray-900 text-gray-100 p-6 overflow-auto">
        <div className="max-w-7xl w-full mx-auto">
          {!selectedProject ? (
            <>
              <NewProject onCreateProject={handleCreateProject} />
              <ProjectList
                projects={projects}
                onSelectProject={handleSelectProject}
                onDeleteProject={handleDeleteProject}
              />
            </>
          ) : (
            <ProjectView
              project={selectedProject}
              versions={versions}
              projectPath={projectPath}
              includePatterns={includePatterns}
              excludePatterns={excludePatterns}
              isAnalyzing={isAnalyzing}
              isCheckingSize={isCheckingSize}
              result={result}
              fileSizeData={fileSizeData}
              onBack={() => setSelectedProject(null)}
              onFolderSelect={handleFolderSelect}
              onAnalyze={() => handleAnalyze(
                selectedProject.id,
                projectPath,
                includePatterns,
                excludePatterns
              )}
              onIncludeChange={(e) => handleIncludeChange(e, selectedProject.id)}
              onExcludeChange={(patterns) => handleExcludePatternAdd(patterns, selectedProject.id)}
              onVersionSelect={handleVersionSelect}
              onVersionCreated={handleVersionCreated}
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
              includePatterns,
              excludePatterns
            );
          }}
        />
      )}
    </div>
  );
}

export default App;