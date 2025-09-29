// src/pages/ProjectView/components/LLMPrompts/components/ModuleCreator/ModuleCreator.js
import React, { useState, useEffect } from 'react';
import {
  CubeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import ModuleCreatorModal from './ModuleCreatorModal';

const ModuleCreator = ({ projectId, currentAnalysisResult, onOpenModuleDialog }) => {
  const [moduleData, setModuleData] = useState({
    userInput: '',
    llmResponse: '',
    suggestedModules: []
  });
  const [showModal, setShowModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState({
    copyPrompt: null
  });

  const modulePrompt = {
    title: 'Module Creator',
    prompt: `MODULE ORGANIZATION ASSISTANT

You are helping organize a codebase into logical, reusable modules. Modules group related files using exclude patterns (gitignore syntax) and can be toggled on/off when working on different features.

GOAL: Suggest meaningful modules that represent distinct functionalities users would realistically want to include/exclude independently.

KEY PRINCIPLES FOR GOOD MODULES:

1. FUNCTIONAL SEPARATION
   - Each module should represent a distinct feature or concern
   - Users should be able to understand "I'm working on X, so I need module Y"
   - Examples: "Authentication", "Payment Processing", "Admin Dashboard", "API Routes"

2. SUBSTANTIAL CONTENT
   - Avoid modules with just 1-2 files (unless they're very large/complex)
   - Prefer modules that group 5+ related files
   - Single config files don't need their own modules
   - Exception: Complex feature directories (e.g., "User Management" with forms, hooks, components)

3. PRACTICAL GRANULARITY
   - Not too broad: Don't put "All Components" in one module
   - Not too narrow: Don't create "Button Component" module
   - Sweet spot: Feature-level grouping (e.g., "Chat Components", "Analytics Dashboard")

4. MINIMIZE MODULE COUNT
   - Aim for 5-12 modules for most projects
   - Only suggest modules for parts users would actually toggle
   - When in doubt, combine related smaller concerns

WHAT NOT TO MODULE:

❌ Individual config files (package.json, tsconfig, .env)
❌ Build tool configs (webpack, vite, etc.) - unless part of a "Build System" module
❌ Single utility files
❌ Generic folders like "utils" or "helpers" (unless very domain-specific)
❌ Test files (unless project is test-heavy and you'd create "Test Suite" module)

WHAT TO MODULE:

✅ Feature directories (authentication, payments, dashboard)
✅ Distinct UI sections (admin panel, user portal, landing page)
✅ API/backend layers (if separate from frontend)
✅ Third-party integrations (Stripe, Auth0, Analytics)
✅ Documentation (if extensive)

ANALYSIS CONTEXT:
Below is the project's file structure and content. Analyze it and suggest modules that would make sense for this specific codebase.

PROJECT ANALYSIS:
${currentAnalysisResult || '[No analysis provided - please run analysis first]'}

Return response in this JSON format:
{
  "modules": [
    {
      "name": "Authentication System",
      "description": "User login, registration, password reset, and session management",
      "patterns": [
        "src/auth/**",
        "src/components/Login/**",
        "src/components/Register/**",
        "src/hooks/useAuth.js",
        "src/contexts/AuthContext.js"
      ],
      "rationale": "This groups all authentication-related functionality that users would want to exclude when working on unrelated features",
      "estimatedFileCount": 15
    },
    {
      "name": "Admin Dashboard",
      "description": "Administrative interface and user management",
      "patterns": [
        "src/admin/**",
        "src/components/UserTable/**"
      ],
      "rationale": "Admin features are typically only needed when working on admin-specific tasks",
      "estimatedFileCount": 8
    }
  ],
  "projectInsights": {
    "totalAnalyzedFiles": 150,
    "suggestedModuleCount": 7,
    "coverage": "These modules cover approximately 80% of the feature code, leaving core utilities and configs always included"
  }
}

IMPORTANT: Base suggestions on the ACTUAL file structure provided. Don't suggest generic modules that don't exist in this project.`
  };

  useEffect(() => {
    loadModuleData();
  }, [projectId]);

  const loadModuleData = async () => {
    if (!projectId) return;
    try {
      const stored = await window.electron.getAppSetting(`module_creator_${projectId}`);
      if (stored) {
        const data = JSON.parse(stored);
        setModuleData({
          ...data,
          suggestedModules: data.suggestedModules || []
        });
      }
    } catch (error) {
      console.error('Error loading module creator data:', error);
    }
  };

  const saveModuleData = async (data) => {
    if (!projectId) return;
    try {
      await window.electron.setAppSetting(`module_creator_${projectId}`, JSON.stringify(data));
      setModuleData(data);
    } catch (error) {
      console.error('Error saving module creator data:', error);
    }
  };

  const handleCopyPrompt = () => {
    if (!currentAnalysisResult) {
      alert('Please run project analysis first to provide context for module suggestions');
      return;
    }

    const fullPrompt = modulePrompt.prompt;
    window.electron.copyToClipboard(fullPrompt);

    setSaveStatus(prev => ({ ...prev, copyPrompt: 'copied' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, copyPrompt: null }));
    }, 2000);
  };

  const handleCreateSingleModule = async (module) => {
    if (onOpenModuleDialog) {
      // Close this modal first
      setShowModal(false);
      
      // Small delay to ensure modal closes before opening the next one
      setTimeout(() => {
        // Open the module creation dialog with pre-filled data
        onOpenModuleDialog({
          name: module.name,
          description: module.description,
          patterns: module.patterns
        });
      }, 100);
    }
  };

  const canCopyPrompt = currentAnalysisResult;
  const hasSuggestions = moduleData.suggestedModules && moduleData.suggestedModules.length > 0;

  return (
    <div>
      <div className="bg-gray-700 rounded-md p-3 cursor-pointer hover:bg-gray-600 transition-colors"
        onClick={() => setShowModal(true)}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center">
            <span className="text-sm text-gray-200 font-medium">{modulePrompt.title}</span>
            {hasSuggestions && (
              <CheckCircleIcon className="h-4 w-4 text-green-400 ml-2" title={`${moduleData.suggestedModules.length} modules suggested`} />
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              className="p-1.5 rounded-md text-xs bg-gray-600 hover:bg-gray-500 text-gray-300"
              title="View/Create suggested modules"
            >
              <CubeIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 line-clamp-2">
          Get AI suggestions for organizing your codebase into logical modules
          {hasSuggestions && <span className="text-green-400 ml-1">({moduleData.suggestedModules.length} modules ready)</span>}
        </p>
      </div>

      {showModal && (
        <ModuleCreatorModal
          moduleData={moduleData}
          onClose={() => setShowModal(false)}
          onSave={saveModuleData}
          onCopyPrompt={handleCopyPrompt}
          onCreateSingleModule={handleCreateSingleModule}
          canCopyPrompt={canCopyPrompt}
        />
      )}
    </div>
  );
};

export default ModuleCreator;