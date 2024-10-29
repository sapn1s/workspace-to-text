import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

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

export default ProjectList;