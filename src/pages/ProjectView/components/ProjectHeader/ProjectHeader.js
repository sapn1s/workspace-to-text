import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import ProjectMenu from '../ProjectMenu/ProjectMenu';

export function ProjectHeader({ 
    project, 
    versions, 
    patternsLoading, 
    onBack, 
    onVersionCreated, 
    onVersionDeleted,
    onVersionUpdated // New prop
}) {
    return (
        <div className="flex items-center justify-between sticky top-0 bg-gray-900 py-2 z-10">
            <div className="flex items-center">
                <button
                    onClick={onBack}
                    className="mr-4 p-2 bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Back to projects"
                >
                    <ArrowLeftIcon className="h-5 w-5 text-blue-500" />
                </button>
                <div>
                    <h2 className="text-xl font-semibold text-gray-100">{project.name}</h2>
                    {project.version_name && (
                        <span className="text-sm text-gray-400">Version: {project.version_name}</span>
                    )}
                </div>
                {patternsLoading && (
                    <span className="ml-2 text-sm text-blue-400">Loading patterns...</span>
                )}
            </div>
            <ProjectMenu
                project={project}
                versions={versions}
                onVersionCreated={onVersionCreated}
                onVersionDeleted={onVersionDeleted}
                onVersionUpdated={onVersionUpdated}
                onBack={onBack}
            />
        </div>
    );
}