// src/App.js - Updated with tab management
import React, { useEffect, useState } from 'react';
import ProjectListPage from './pages/ProjectList/ProjectListPage';
import ProjectView from './pages/ProjectView/ProjectView';
import DependencyGraphApp from './DependencyGraphApp';
import { SizeWarningDialog } from './pages/ProjectView/components/SizeWarningDialog/SizeWarningDialog';
import { TabBar } from './components/common/TabBar';
import { useProjects } from './hooks/useProjects';
import { useAnalysis } from './hooks/useAnalysis';
import { useTabManagement } from './hooks/useTabManagement';

function App() {
  // Check if this is a dependency graph window immediately
  const isDependencyGraphWindow = window.location.hash.startsWith('#dependency-graph');

  // If it's a dependency graph window, render it directly without initializing other hooks
  if (isDependencyGraphWindow) {
    return <DependencyGraphApp />;
  }

  const [showProjectList, setShowProjectList] = useState(false);
  const [isLoadingTabProject, setIsLoadingTabProject] = useState(false);

  const {
    tabs,
    activeTabId,
    activeTab,
    createOrUpdateTab,
    updateTabVersion,
    closeTab,
    switchToTab,
    closeAllTabs
  } = useTabManagement();

  const {
    projects,
    selectedProject,
    versions,
    projectPath,
    mainProjectId,
    setProjectPath,
    setSelectedProject,
    loadProjects,
    handleSelectProject,
    handleDeleteProject,
    handleDeleteVersion,
    handleRenameProject,
    handleVersionSelect,
    handleVersionCreated,
    handleVersionUpdated
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

  // Load project when switching tabs
  useEffect(() => {
    const loadTabProject = async () => {
      if (!activeTab || !projects.length) return;

      setIsLoadingTabProject(true);

      try {
        // Find the project/version to load
        const projectToLoad = projects.find(p => p.id === activeTab.versionId);

        if (projectToLoad) {
          console.log(`Loading tab project: ${projectToLoad.name} (ID: ${projectToLoad.id})`);
          await handleSelectProject(projectToLoad);
        } else {
          console.warn(`Project with ID ${activeTab.versionId} not found in projects list`);
          // Remove this tab as the project no longer exists
          closeTab(activeTab.id);
        }
      } catch (error) {
        console.error('Error loading tab project:', error);
        closeTab(activeTab.id);
      } finally {
        setIsLoadingTabProject(false);
      }
    };

    loadTabProject();
  }, [activeTab?.versionId, projects.length]);

  // Handle project selection from project list
  const handleCreateProject = async (name) => {
    const newProjectId = await window.electron.createProject(name);
    await loadProjects();
    const newProject = (await window.electron.getProjects()).find(p => p.id === newProjectId);

    if (newProject) {
      await handleSelectProject(newProject);
      createOrUpdateTab(newProject);
      setShowProjectList(false);
    }
  };

  const handleSelectProjectFromList = async (project) => {
    await handleSelectProject(project);
    createOrUpdateTab(project);
    setShowProjectList(false);
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

  const handleVersionSelectWithTab = async (version) => {
    await handleVersionSelect(version);
    updateTabVersion(version.id, version.version_name || 'Main');
  };

  const handleVersionUpdatedWithTab = async () => {
    try {
      // Use the existing handleVersionUpdated from useProjects hook
      await handleVersionUpdated();

      // Update the tab title if needed (the project name or version might have changed)
      if (activeTab && selectedProject) {
        const allProjects = await window.electron.getProjects();
        const updatedProject = allProjects.find(p => p.id === selectedProject.id);

        if (updatedProject) {
          updateTabVersion(
            updatedProject.id,
            updatedProject.version_name || 'Main'
          );
        }
      }
    } catch (error) {
      console.error('Failed to handle version update:', error);
      alert('Failed to update version: ' + error.message);
    }
  };

  const handleVersionCreatedWithTab = async (mainProjectId, newVersionId) => {
    await handleVersionCreated(mainProjectId, newVersionId);

    // Update the tab to point to the new version
    if (activeTab) {
      const allProjects = await window.electron.getProjects();
      const newVersion = allProjects.find(p => p.id === newVersionId);
      if (newVersion) {
        updateTabVersion(newVersionId, newVersion.version_name || 'Main');
      }
    }
  };

  const handleVersionDeletedWithTab = async (mainProjectId) => {
    try {
      await handleDeleteVersion(mainProjectId);

      // If the deleted version was in the current tab, update tab to main project
      if (activeTab && selectedProject?.parent_id === mainProjectId) {
        const allProjects = await window.electron.getProjects();
        const mainProject = allProjects.find(p => p.id === mainProjectId);
        if (mainProject) {
          updateTabVersion(mainProjectId, 'Main');
        }
      }
    } catch (error) {
      console.error('Failed to delete version:', error);
      alert('Failed to delete version: ' + error.message);
    }
  };

  const handleDeleteProjectWithErrorHandling = async (projectId) => {
    try {
      await handleDeleteProject(projectId);

      // Close any tabs for this project or its versions
      const projectTabs = tabs.filter(tab =>
        tab.projectId === projectId ||
        projects.find(p => p.id === tab.versionId)?.parent_id === projectId
      );

      projectTabs.forEach(tab => closeTab(tab.id));
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project: ' + error.message);
    }
  };

  const handleTabClick = async (tabId) => {
    if (tabId === activeTabId) return;
    switchToTab(tabId);
  };

  const handleNewTab = () => {
    setShowProjectList(true);
  };

  const handleBackToProjectList = () => {
    setShowProjectList(true);
  };

  // Determine what to show
  const hasActiveTabs = tabs.length > 0;
  const shouldShowProjectView = !showProjectList && selectedProject && !isLoadingTabProject;
  const shouldShowProjectList = showProjectList || (!hasActiveTabs && !selectedProject);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Tab Bar - only show if we have tabs */}
      {hasActiveTabs && (
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabClick={handleTabClick}
          onTabClose={closeTab}
          onNewTab={handleNewTab}
        />
      )}

      <div className="min-h-screen bg-gray-900 text-gray-100 p-6 overflow-auto">
        <div className="w-full mx-auto">
          {/* Loading state for tab switching */}
          {isLoadingTabProject && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading project...</p>
              </div>
            </div>
          )}

          {/* Project List */}
          {shouldShowProjectList && !isLoadingTabProject && (
            <ProjectListPage
              projects={projects}
              onCreateProject={handleCreateProject}
              onSelectProject={handleSelectProjectFromList}
              onDeleteProject={handleDeleteProjectWithErrorHandling}
              onRenameProject={handleRenameProject}
            />
          )}

          {/* Project View */}
          {shouldShowProjectView && (
            <ProjectView
              key={`project-view-${selectedProject.id}`}
              project={selectedProject}
              versions={versions}
              projectPath={projectPath}
              mainProjectId={mainProjectId}
              isAnalyzing={isAnalyzing}
              isCheckingSize={isCheckingSize}
              result={result}
              fileSizeData={fileSizeData}
              onBack={handleBackToProjectList}
              onFolderSelect={handleFolderSelect}
              onAnalyze={(projectId, path, patterns) => handleAnalyze(projectId, path, patterns)}
              onVersionSelect={handleVersionSelectWithTab}
              onVersionCreated={handleVersionCreatedWithTab}
              onVersionDeleted={handleVersionDeletedWithTab}
              onVersionUpdated={handleVersionUpdatedWithTab}
            />
          )}
        </div>
      </div>

      {/* Size Warning Dialog */}
      {showSizeWarning && (
        <SizeWarningDialog
          sizeStats={sizeScanResult}
          onClose={() => setShowSizeWarning(false)}
          onProceed={() => {
            setShowSizeWarning(false);
            performAnalysis(
              selectedProject.id,
              projectPath,
              ''
            );
          }}
        />
      )}
    </div>
  );
}

export default App;