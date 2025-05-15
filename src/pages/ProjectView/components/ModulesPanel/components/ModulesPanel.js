import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ModuleList } from './ModuleList';
import { ModuleDialog } from './ModuleDialog';

export function ModulesPanel({
    project,
    isCollapsed,
    onToggleCollapse,
    onModuleCreate,
    onModuleUpdate,
    onModuleDelete,
    modules = []
}) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingModule, setEditingModule] = useState(null);
    const [moduleVersions, setModuleVersions] = useState(new Map());

    // Load version-specific module settings
    useEffect(() => {
        const loadVersionModules = async () => {
            if (!project?.id) return;
            
            try {
                console.log('Loading version modules for project ID:', project.id);
                const versionModules = await window.electron.modules.getVersionModules(project.id);
                
                console.log('Retrieved version modules:', versionModules.length);
                
                const versionMap = new Map();
                versionModules.forEach(module => {
                    // Check is_included is not null/undefined before setting
                    if (module.is_included !== undefined && module.is_included !== null) {
                        versionMap.set(module.id, Boolean(module.is_included));
                    } else {
                        // Default to true if not explicitly set
                        versionMap.set(module.id, true);
                    }
                });
                
                setModuleVersions(versionMap);
            } catch (error) {
                console.error('Error loading version modules:', error);
            }
        };

        loadVersionModules();
    }, [project?.id]);

    const handleModuleToggle = async (moduleId) => {
        try {
            const currentState = moduleVersions.get(moduleId) ?? true;
            const newState = !currentState;
            
            console.log(`Toggling module ${moduleId} from ${currentState} to ${newState}`);
            
            await window.electron.modules.setVersionInclusion({
                versionId: project.id,
                moduleId,
                isIncluded: newState
            });

            setModuleVersions(prev => {
                const next = new Map(prev);
                next.set(moduleId, newState);
                return next;
            });
        } catch (error) {
            console.error('Error toggling module:', error);
        }
    };

    const handleCreateModule = async (moduleData) => {
        await onModuleCreate(moduleData);
        setShowCreateDialog(false);
    };

    const handleUpdateModule = async (moduleData) => {
        await onModuleUpdate(moduleData);
        setEditingModule(null);
    };

    return (
        <div className={`
            bg-gray-800 rounded-lg overflow-hidden transition-all duration-300
        `}>
            {/* Header */}
            <div className={`
                flex items-center justify-between p-4 border-b border-gray-700
                ${isCollapsed ? 'justify-center' : 'justify-between'}
            `}>
                <div className={`
                    flex items-center
                    ${isCollapsed ? 'w-full justify-center' : ''}
                `}>
                    <button
                        onClick={onToggleCollapse}
                        className="p-1 hover:bg-gray-700 rounded-md"
                    >
                        {isCollapsed ? (
                            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronLeftIcon className="w-5 h-5 text-gray-400" />
                        )}
                    </button>
                    {!isCollapsed && (
                        <h3 className="ml-2 text-lg font-medium">Modules</h3>
                    )}
                </div>
                {!isCollapsed && (
                    <button
                        onClick={() => setShowCreateDialog(true)}
                        className="p-1 hover:bg-gray-700 rounded-md"
                        title="Create new module"
                    >
                        <PlusIcon className="w-5 h-5 text-blue-400" />
                    </button>
                )}
            </div>

            {/* Module List */}
            {!isCollapsed && (
                <div className="p-4">
                    {modules.length === 0 ? (
                        <div className="text-center text-gray-400 py-4">
                            No modules defined yet. Create a module to organize your project code.
                        </div>
                    ) : (
                        <ModuleList
                            modules={modules}
                            onEdit={setEditingModule}
                            onDelete={onModuleDelete}
                            moduleVersions={moduleVersions}
                            onModuleToggle={handleModuleToggle}
                        />
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            {(showCreateDialog || editingModule) && (
                <ModuleDialog
                    module={editingModule}
                    modules={modules}
                    onSave={editingModule ? handleUpdateModule : handleCreateModule}
                    onClose={() => {
                        setShowCreateDialog(false);
                        setEditingModule(null);
                    }}
                />
            )}
        </div>
    );
}