import React from 'react';

const ProjectVersionSelector = ({ project, versions, onVersionSelect }) => {
  if (!versions?.length) return null;

  const handleVersionChange = async (e) => {
    const selectedId = parseInt(e.target.value);
    
    // If selecting main version
    if (selectedId === (project.parent_id || project.id)) {
      // Find the main project from versions array
      const mainProject = versions.find(v => v.id === selectedId) || {
        id: project.parent_id || project.id,
        name: project.name,
        path: project.path,
        include_patterns: project.include_patterns,
        exclude_patterns: project.exclude_patterns,
        version_name: null,
        parent_id: null
      };
      onVersionSelect(mainProject);
    } else {
      // Find the selected version
      const selectedVersion = versions.find(v => v.id === selectedId);
      if (selectedVersion) {
        onVersionSelect(selectedVersion);
      }
    }
  };

  return (
    <div className="mb-4 px-4 py-2 bg-gray-800 rounded-md">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-400">Version:</span>
        <select
          value={project.id}
          onChange={handleVersionChange}
          className="flex-grow bg-gray-700 text-gray-200 text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={project.parent_id || project.id}>
            Main Version
          </option>
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              {version.version_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ProjectVersionSelector;