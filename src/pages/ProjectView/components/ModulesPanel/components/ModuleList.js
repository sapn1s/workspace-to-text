import { useState } from "react";
import { ModuleItem } from "./ModuleItem";

export function ModuleList({ 
    modules, 
    onEdit, 
    onDelete, 
    moduleVersions = new Map(),
    onModuleToggle
  }) {
    const [expandedModules, setExpandedModules] = useState(new Set());
  
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
  
    return (
      <div className="space-y-2">
        {modules.map(module => (
          <ModuleItem
            key={module.id}
            module={module}
            isExpanded={expandedModules.has(module.id)}
            onToggleExpand={() => toggleExpand(module.id)}
            onEdit={() => onEdit(module)}
            onDelete={() => onDelete(module)} // Pass full module object instead of just ID
            isIncluded={moduleVersions.get(module.id) ?? false}
            onToggleInclude={() => onModuleToggle(module.id)}
          />
        ))}
      </div>
    );
  }

export default ModuleList;