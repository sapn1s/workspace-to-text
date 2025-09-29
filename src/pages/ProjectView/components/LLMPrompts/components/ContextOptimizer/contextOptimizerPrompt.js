// src/pages/ProjectView/components/LLMPrompts/components/ContextOptimizer/contextOptimizerPrompt.js

export const contextOptimizerPrompt = `CONTEXT OPTIMIZATION - NOT CODE EXCLUSION

You are helping optimize code context for an LLM conversation. The user wants to send only the most relevant files to an LLM for working on a specific feature. This is NOT about excluding files from the codebase - ALL FILES REMAIN IN THE CODEBASE AND THE APPLICATION WILL CONTINUE TO WORK NORMALLY.

GOAL: Remove files from LLM context that are not directly relevant to implementing the specific feature described by the user.

IMPORTANT CLARIFICATIONS:
- Files are only excluded from the text context sent to the LLM
- The actual codebase and running application are completely unchanged
- UI components will NOT break - they continue working normally in the application
- Dependencies and imports continue to work in the actual running code
- This is purely about reducing cognitive load and token usage for the LLM

Given the following list of files and their content, return a JSON list of files which are not directly relevant for implementing the specific feature that the user is working on.

The exclude patterns function same as in .gitignore, so use same syntax.
Try to be concise - sometimes we might exclude a whole feature directory, so we would not need to exclude each individual file.
Don't exclude common config files like package.json, tailwind.config.js as they provide meaningful context for feature development (e.g. what dependencies are installed, whether styles configuration is different etc).
Only exclude files really not relevant to the specific feature being implemented.
It is better to keep file rather than exclude when in doubt.

CRITICAL - MISSING FILES ANALYSIS:
Before flagging ANY missing file, you must understand: you are looking at a SUBSET of the codebase for context optimization. Missing files does NOT mean the application is broken - it means they're not included in this specific context view.

Only flag a file as missing if BOTH conditions are met:

TEST 1 - DIRECT CODE DEPENDENCY:
Can you point to specific imports, function calls, or references in the provided code that directly import or call something from this missing file?

TEST 2 - FEATURE IMPLEMENTATION NECESSITY:
Is this missing file absolutely required to implement the specific feature being developed? (Not just for the app to work overall, but for THIS SPECIFIC FEATURE)

COMMON FALSE POSITIVES TO AVOID:
- Application shell components (routing, navigation, layout) unless the feature modifies them
- Tab/window management unless the feature specifically manages tabs
- Project management pages unless the feature modifies project workflows  
- File system utilities unless the feature processes files differently
- General UI components unless the feature extends/modifies them
- State management for unrelated features
- Backend/database code unless the feature modifies backend logic

EXAMPLES OF VALID MISSING FILES:
✅ A login form imports useAuth() from AuthContext.js that's not in the context
✅ A component calls validateEmail() from utils/validation.js that's not provided
✅ A component extends BaseComponent class from a missing file

EXAMPLES OF INVALID MISSING FILES:
❌ "TabBar.js is missing" when working on a prompt component (TabBar continues to work in the app)
❌ "Routing files missing" when adding a form (routing continues to work normally)  
❌ "Project management hooks missing" when building a UI component (they continue to work)

Remember: The application continues running normally with all its features. You're only optimizing what context the LLM sees for implementing ONE specific feature.

Return response in this JSON format:
{
  "exclusions": [
    {
      "pattern": "src/components/UserProfile/**",
      "reason": "User profile functionality not directly needed for implementing authentication feature"
    },
    {
      "pattern": "docs/**", 
      "reason": "Documentation files not needed for feature implementation context"
    }
  ],
  "missingFiles": [
    {
      "file": "src/auth/AuthContext.js",
      "usageEvidence": "LoginForm.js line 15: 'import { useAuth } from '../auth/AuthContext' - component directly imports and uses useAuth()",
      "featureRelevance": "This authentication context is directly imported and used by the login feature being implemented",
      "confidence": "high"
    }
  ]
}

BE EXTREMELY CONSERVATIVE with missing files. The goal is reducing context noise, not finding architectural problems. Focus only on files that are DIRECTLY imported and used by the specific feature code.`;