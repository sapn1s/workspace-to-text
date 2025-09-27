import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ModuleList } from './components/ModuleList';
import { ModuleDialog } from './components/ModuleDialog';
import { ModuleDeleteDialog } from './components/ModuleDeleteDialog';

export function ModulesPanel({
    project,
    isCollapsed,
    onToggleCollapse,
    onModuleCreate,
    onModuleUpdate,
    onModuleDelete,
    onModuleChange,
    modules = [],
    mainProjectId // New prop to pass the main project ID
}) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingModule, setEditingModule] = useState(null);
    const [moduleToDelete, setModuleToDelete] = useState(null);
    const [moduleVersions, setModuleVersions] = useState(new Map());
    const [refreshKey, setRefreshKey] = useState(0); // Add refresh key for forcing updates

    useEffect(() => {
        console.log('=== MODULE DEBUG ===');
        console.log('Current project:', project);
        console.log('Modules with inclusion states:', modules);
        console.log('Module inclusion states:', modules.map(m => ({
            id: m.id,
            name: m.name,
            is_included: m.is_included,
            version_id: project.id
        })));
    }, [modules, project.id]);

    // Load version-specific module settings
    useEffect(() => {
        const loadVersionModules = async () => {
            if (!project?.id || !mainProjectId) return;

            try {
                const versionModules = await window.electron.modules.getVersionModules(project.id);
                const versionMap = new Map();
                versionModules.forEach(module => {
                    // Check is_included is not null/undefined before setting
                    if (module.is_included !== undefined && module.is_included !== null) {
                        versionMap.set(module.id, Boolean(module.is_included));
                    } else {
                        // Default to false if not explicitly set
                        versionMap.set(module.id, false);
                    }
                });
                setModuleVersions(versionMap);
            } catch (error) {
                console.error('Error loading version modules:', error);
            }
        };

        loadVersionModules();
    }, [project?.id, mainProjectId, refreshKey]);

    // Force refresh when modules change
    useEffect(() => {
        setRefreshKey(prev => prev + 1);
    }, [modules]);

    const handleModuleToggle = async (moduleId) => {
        try {
            const currentState = moduleVersions.get(moduleId) ?? true;
            const newState = !currentState;

            console.log(`Toggling module ${moduleId} from ${currentState} to ${newState} for version ${project.id}`);

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

            // Notify parent about module changes
            if (onModuleChange) {
                await onModuleChange();
            }
        } catch (error) {
            console.error('Error toggling module:', error);
        }
    };

    const handleCreateModule = async (moduleData) => {
        try {
            await onModuleCreate(moduleData);
            setShowCreateDialog(false);

            // Force refresh after creation
            setRefreshKey(prev => prev + 1);

            // Notify parent about module changes
            if (onModuleChange) {
                await onModuleChange();
            }
        } catch (error) {
            console.error('Error creating module:', error);
        }
    };

    const handleUpdateModule = async (moduleData) => {
        try {
            await onModuleUpdate(moduleData);

            // Get fresh module data for the dialog
            const updatedModule = await window.electron.modules.get(moduleData.id);
            setEditingModule(updatedModule);

            // Force refresh after update
            setRefreshKey(prev => prev + 1);

            // Notify parent about module changes
            if (onModuleChange) {
                await onModuleChange();
            }
        } catch (error) {
            console.error('Error updating module:', error);
        }
    };

    const handleEditClick = async (module) => {
        try {
            // Get fresh module data when opening for edit
            const freshModule = await window.electron.modules.get(module.id);
            console.log('Opening module for edit with fresh data:', freshModule);
            setEditingModule(freshModule);
        } catch (error) {
            console.error('Error loading fresh module data:', error);
            // Fallback to the passed module data
            setEditingModule(module);
        }
    };

    const handleDeleteClick = (module) => {
        // Now receives the full module object instead of just ID
        setModuleToDelete(module);
    };

    const confirmDelete = async () => {
        if (moduleToDelete) {
            try {
                await onModuleDelete(moduleToDelete.id);
                setModuleToDelete(null);

                // Force refresh after deletion
                setRefreshKey(prev => prev + 1);

                // Notify parent about module changes
                if (onModuleChange) {
                    await onModuleChange();
                }
            } catch (error) {
                console.error('Error deleting module:', error);
            }
        }
    };

    const cancelDelete = () => {
        setModuleToDelete(null);
    };

    const closeEditDialog = () => {
        setEditingModule(null);
    };

    return (
        <>
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
                            <div className="ml-2">
                                <h3 className="text-lg font-medium">Modules</h3>
                                {mainProjectId && (
                                    <p className="text-xs text-gray-500">
                                        Shared across all versions
                                    </p>
                                )}
                            </div>
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
                                <p className="mb-2">No modules defined yet.</p>
                                <p className="text-sm">
                                    Create modules to organize pattern collections that can be shared across all project versions.
                                </p>
                            </div>
                        ) : (
                            <ModuleList
                                modules={modules}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                moduleVersions={moduleVersions}
                                onModuleToggle={handleModuleToggle}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            {showCreateDialog && (
                <ModuleDialog
                    module={null}
                    modules={modules}
                    onSave={handleCreateModule}
                    onClose={() => setShowCreateDialog(false)}
                />
            )}

            {/* Edit Dialog */}
            {editingModule && (
                <ModuleDialog
                    module={editingModule}
                    modules={modules}
                    onSave={handleUpdateModule}
                    onClose={closeEditDialog}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {moduleToDelete && (
                <ModuleDeleteDialog
                    module={moduleToDelete}
                    onConfirm={confirmDelete}
                    onCancel={cancelDelete}
                />
            )}
        </>
    );
}