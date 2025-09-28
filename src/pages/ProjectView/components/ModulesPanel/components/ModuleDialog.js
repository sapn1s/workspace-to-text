import { useState, useEffect, useRef } from 'react';
import { Dialog } from '../../../../../components/common/Dialog';
import { ChipInput } from '../../ChipInput';
import { CheckIcon } from '@heroicons/react/24/outline';

export function ModuleDialog({ module, modules, onSave, onClose }) {
  const [name, setName] = useState(module?.name || '');
  const [description, setDescription] = useState(module?.description || '');
  const [patterns, setPatterns] = useState(module?.patterns?.join(',') || '');
  const [selectedDeps, setSelectedDeps] = useState(
    module?.dependencies?.map(d => d.id) || []
  );

  // New state for tracking changes and save status
  const [hasUserChanges, setHasUserChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  const initialLoadRef = useRef(true);
  const moduleIdRef = useRef(module?.id);
  const saveTimeoutRef = useRef(null);

  const isEditing = Boolean(module);

  // Store initial values to detect changes
  const initialValues = useRef({
    name: module?.name || '',
    description: module?.description || '',
    patterns: module?.patterns?.join(',') || '',
    selectedDeps: module?.dependencies?.map(d => d.id) || []
  });

  // Update initial values when module changes
  useEffect(() => {
    const isNewModule = module?.id !== moduleIdRef.current;
    const isInitialLoad = initialLoadRef.current;
    
    if (isInitialLoad || isNewModule || !hasUserChanges) {
      console.log('ModuleDialog: Syncing with module prop:', {
        moduleId: module?.id,
        isNewModule,
        isInitialLoad,
        hasUserChanges,
        patterns: module?.patterns
      });

      if (module) {
        const newName = module.name || '';
        const newDescription = module.description || '';
        const newPatterns = module.patterns?.join(',') || '';
        const newSelectedDeps = module.dependencies?.map(d => d.id) || [];

        setName(newName);
        setDescription(newDescription);
        setPatterns(newPatterns);
        setSelectedDeps(newSelectedDeps);

        // Update initial values for change detection
        initialValues.current = {
          name: newName,
          description: newDescription,
          patterns: newPatterns,
          selectedDeps: newSelectedDeps
        };
      } else {
        // Reset for new module
        setName('');
        setDescription('');
        setPatterns('');
        setSelectedDeps([]);

        initialValues.current = {
          name: '',
          description: '',
          patterns: '',
          selectedDeps: []
        };
      }

      // Reset state
      setHasUserChanges(false);
      setSaveSuccess(false);
      setSaveError(null);
      moduleIdRef.current = module?.id;
      initialLoadRef.current = false;
    }
  }, [module, hasUserChanges]);

  // Helper function to check if values have changed
  const checkForChanges = (newName, newDescription, newPatterns, newSelectedDeps) => {
    const hasChanged = (
      newName !== initialValues.current.name ||
      newDescription !== initialValues.current.description ||
      newPatterns !== initialValues.current.patterns ||
      JSON.stringify(newSelectedDeps.sort()) !== JSON.stringify(initialValues.current.selectedDeps.sort())
    );
    
    setHasUserChanges(hasChanged);
    
    // Clear any previous save status when user makes changes
    if (hasChanged) {
      setSaveSuccess(false);
      setSaveError(null);
    }
  };

  // Enhanced change handlers with change detection
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    checkForChanges(newName, description, patterns, selectedDeps);
  };

  const handleDescriptionChange = (e) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    checkForChanges(name, newDescription, patterns, selectedDeps);
  };

  const handlePatternsChange = (newPatterns) => {
    console.log('ModuleDialog: User changing patterns to:', newPatterns);
    setPatterns(newPatterns);
    checkForChanges(name, description, newPatterns, selectedDeps);
  };

  const handleDependencyChange = (depId, checked) => {
    const newSelectedDeps = checked 
      ? [...selectedDeps, depId]
      : selectedDeps.filter(id => id !== depId);
    
    setSelectedDeps(newSelectedDeps);
    checkForChanges(name, description, patterns, newSelectedDeps);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    console.log('ModuleDialog: Submitting with patterns:', patterns);
    
    try {
      await onSave({
        id: module?.id,
        name: name.trim(),
        description: description.trim(),
        patterns: patterns.split(',').filter(p => p.trim()),
        dependencies: selectedDeps
      });
      
      // Update initial values to reflect the saved state
      initialValues.current = {
        name: name.trim(),
        description: description.trim(),
        patterns,
        selectedDeps: [...selectedDeps]
      };
      
      // Reset change tracking and show success
      setHasUserChanges(false);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
      console.log('ModuleDialog: Save completed successfully');
    } catch (error) {
      console.error('ModuleDialog: Save failed:', error);
      setSaveError(error.message || 'Failed to save module');
    } finally {
      setIsSaving(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);



  // Filter out the current module from available dependencies
  const availableDeps = modules.filter(m => m.id !== module?.id);

  return (
    <Dialog
      title={isEditing ? 'Edit Module' : 'Create Module'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Success/Error Messages */}
        {saveSuccess && (
          <div className="flex items-center p-3 bg-green-900/20 border border-green-700 rounded-md">
            <CheckIcon className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-sm text-green-200">
              Module {isEditing ? 'updated' : 'created'} successfully
            </span>
          </div>
        )}

        {saveError && (
          <div className="p-3 bg-red-900/20 border border-red-700 rounded-md">
            <span className="text-sm text-red-200">
              Error: {saveError}
            </span>
          </div>
        )}

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
            disabled={isSaving}
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
            disabled={isSaving}
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
                    disabled={isSaving}
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
            className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 text-sm disabled:opacity-50"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-sm transition-colors flex items-center ${
              !name.trim() || isSaving
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            disabled={!name.trim() || isSaving}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              isEditing ? 'Update' : 'Create'
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}