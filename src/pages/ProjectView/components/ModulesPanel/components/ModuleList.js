import { useState, useMemo, useEffect } from "react";
import { ModuleItem } from "./ModuleItem";
import { ModuleFilter } from "./ModuleFilter";

export function ModuleList({ 
    modules, 
    onEdit, 
    onDelete, 
    moduleVersions = new Map(),
    onModuleToggle
}) {
    const [expandedModules, setExpandedModules] = useState(new Set());
    const [sortBy, setSortBy] = useState('name');

    // Load saved sort preference on mount
    useEffect(() => {
        const loadSortPreference = async () => {
            try {
                const savedSortBy = await window.electron.getAppSetting('modulesSortBy');
                if (savedSortBy && ['name', 'created_at', 'usage_status'].includes(savedSortBy)) {
                    setSortBy(savedSortBy);
                }
            } catch (error) {
                console.error('Error loading module sort preference:', error);
            }
        };
        loadSortPreference();
    }, []);

    // Save sort preference when it changes
    const handleSortChange = async (newSortBy) => {
        setSortBy(newSortBy);
        try {
            await window.electron.setAppSetting('modulesSortBy', newSortBy);
        } catch (error) {
            console.error('Error saving module sort preference:', error);
        }
    };

    const toggleExpand = (moduleId) => {
        setExpandedModules(prev => {
            const next = new Set(prev);
            if (next.has(moduleId)) {
                next.delete(moduleId);
            } else {
                next.add(moduleId);
            }
            return next;
        });
    };

    const sortedModules = useMemo(() => {
        return [...modules].sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name, undefined, { 
                        sensitivity: 'base',
                        numeric: true 
                    });

                case 'created_at':
                    const dateA = new Date(a.created_at || 0);
                    const dateB = new Date(b.created_at || 0);
                    return dateB - dateA; // Newest first

                case 'usage_status':
                    const aEnabled = moduleVersions.get(a.id) || false;
                    const bEnabled = moduleVersions.get(b.id) || false;
                    if (aEnabled !== bEnabled) {
                        return aEnabled ? -1 : 1; // Enabled first
                    }
                    return a.name.localeCompare(b.name); // Then by name

                default:
                    return 0;
            }
        });
    }, [modules, moduleVersions, sortBy]);

    return (
        <div className="space-y-2">
            {/* Simple filter - only show if there are modules */}
            {modules.length > 0 && (
                <ModuleFilter
                    sortBy={sortBy}
                    onSortChange={handleSortChange}
                    moduleCount={modules.length}
                    className="mb-3 border-b border-gray-600 pb-2"
                />
            )}

            {/* Module list */}
            {sortedModules.map(module => (
                <ModuleItem
                    key={module.id}
                    module={module}
                    isExpanded={expandedModules.has(module.id)}
                    onToggleExpand={() => toggleExpand(module.id)}
                    onEdit={() => onEdit(module)}
                    onDelete={() => onDelete(module)}
                    isIncluded={moduleVersions.get(module.id) ?? false}
                    onToggleInclude={() => onModuleToggle(module.id)}
                />
            ))}
        </div>
    );
}