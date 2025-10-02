import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NewProject } from './components/NewProject/NewProject';
import ProjectList from './ProjectList';

export default function ProjectListPage({ projects, onCreateProject, onSelectProject, onDeleteProject, onRenameProject  }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const searchInputRef = useRef(null);

  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) {
      return projects;
    }
    
    const lowercaseSearchTerm = searchTerm.toLowerCase();
    return projects.filter(project => 
      project.name.toLowerCase().includes(lowercaseSearchTerm) ||
      (project.path && project.path.toLowerCase().includes(lowercaseSearchTerm))
    );
  }, [projects, searchTerm]);

  // Get only main projects for keyboard navigation (no versions)
  const mainProjects = useMemo(() => {
    return filteredProjects.filter(project => !project.parent_id);
  }, [filteredProjects]);

  // Reset selected index when filtered projects change
  useEffect(() => {
    setSelectedIndex(null);
  }, [mainProjects.length]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (mainProjects.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          if (prev === null) return 0;
          return prev < mainProjects.length - 1 ? prev + 1 : prev;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          if (prev === null) return 0;
          return prev > 0 ? prev - 1 : prev;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex !== null && mainProjects[selectedIndex]) {
          onSelectProject(mainProjects[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSearchTerm('');
        setSelectedIndex(null);
        searchInputRef.current?.focus();
        break;
      default:
        break;
    }
  };

  return (
    <div onKeyDown={handleKeyDown} tabIndex={-1}>
      <NewProject onCreateProject={onCreateProject} />
      
      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search projects..."
          autoFocus
          className="block w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <ProjectList
        projects={filteredProjects}
        onSelectProject={onSelectProject}
        onDeleteProject={onDeleteProject}
        onRenameProject={onRenameProject}
        selectedIndex={selectedIndex}
        mainProjects={mainProjects}
      />
    </div>
  );
}