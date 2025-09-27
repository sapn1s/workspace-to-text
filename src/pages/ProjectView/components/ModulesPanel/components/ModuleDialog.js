import { useState, useEffect, useRef } from 'react';
import { Dialog } from '../../../../../components/common/Dialog';
import { ChipInput } from '../../ChipInput';

export function ModuleDialog({ module, modules, onSave, onClose }) {
  const [name, setName] = useState(module?.name || '');
  const [description, setDescription] = useState(module?.description || '');
  const [patterns, setPatterns] = useState(module?.patterns?.join(',') || '');
  const [selectedDeps, setSelectedDeps] = useState(
    module?.dependencies?.map(d => d.id) || []
  );

  // FIXED: Track if user has made any changes to prevent unwanted resets
  const [hasUserChanges, setHasUserChanges] = useState(false);
  const initialLoadRef = useRef(true);
  const moduleIdRef = useRef(module?.id);

  const isEditing = Boolean(module);

  // FIXED: Only sync with module prop on initial load or when module ID changes
  useEffect(() => {
    const isNewModule = module?.id !== moduleIdRef.current;
    const isInitialLoad = initialLoadRef.current;
    
    // Only update form state if:
    // 1. It's the initial load, OR
    // 2. We're switching to a different module, OR  
    // 3. User hasn't made any changes yet
    if (isInitialLoad || isNewModule || !hasUserChanges) {
      console.log('ModuleDialog: Syncing with module prop:', {
        moduleId: module?.id,
        isNewModule,
        isInitialLoad,
        hasUserChanges,
        patterns: module?.patterns
      });

      if (module) {
        setName(module.name || '');
        setDescription(module.description || '');
        setPatterns(module.patterns?.join(',') || '');
        setSelectedDeps(module.dependencies?.map(d => d.id) || []);
      } else {
        // Reset for new module
        setName('');
        setDescription('');
        setPatterns('');
        setSelectedDeps([]);
      }

      // Reset change tracking
      setHasUserChanges(false);
      moduleIdRef.current = module?.id;
      initialLoadRef.current = false;
    }
  }, [module, hasUserChanges]);

  // FIXED: Mark that user has made changes when they edit any field
  const handleNameChange = (e) => {
    setName(e.target.value);
    setHasUserChanges(true);
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    setHasUserChanges(true);
  };

  const handlePatternsChange = (newPatterns) => {
    console.log('ModuleDialog: User changing patterns to:', newPatterns);
    setPatterns(newPatterns);
    setHasUserChanges(true);
  };

  const handleDependencyChange = (depId, checked) => {
    if (checked) {
      setSelectedDeps([...selectedDeps, depId]);
    } else {
      setSelectedDeps(selectedDeps.filter(id => id !== depId));
    }
    setHasUserChanges(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim()) {
      console.log('ModuleDialog: Submitting with patterns:', patterns);
      
      try {
        await onSave({
          id: module?.id,
          name,
          description,
          patterns: patterns.split(',').filter(p => p.trim()),
          dependencies: selectedDeps
        });
        
        // Reset change tracking after successful save
        setHasUserChanges(false);
        
        console.log('ModuleDialog: Save completed successfully');
      } catch (error) {
        console.error('ModuleDialog: Save failed:', error);
        alert(`Failed to save module: ${error.message}`);
      }
    }
  };

  // Filter out the current module from available dependencies
  const availableDeps = modules.filter(m => m.id !== module?.id);

  return (
    <Dialog
      title={isEditing ? 'Edit Module' : 'Create Module'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            className="w-full px-3 py-2 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Module name"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={handleDescriptionChange}
            className="w-full px-3 py-2 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Module description"
            rows={3}
          />
        </div>

        {/* Patterns */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Exclude Patterns
          </label>
          <ChipInput
            value={patterns}
            onChange={handlePatternsChange}
            placeholder="Add patterns (e.g., src/admin/**, *.config.js)"
          />
          <p className="text-xs text-gray-400 mt-1">
            Press Enter or comma to add patterns
          </p>
        </div>

        {/* Dependencies */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Include Sub-Modules
          </label>
          {availableDeps.length > 0 ? (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {availableDeps.map(dep => (
                <label key={dep.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDeps.includes(dep.id)}
                    onChange={(e) => handleDependencyChange(dep.id, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-300">{dep.name}</span>
                  {dep.description && (
                    <span className="text-xs text-gray-500 ml-2">
                      - {dep.description}
                    </span>
                  )}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No other modules available</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 text-sm"
            disabled={!name.trim()}
          >
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}