import React from 'react';
import { ClipboardIcon } from '@heroicons/react/24/outline';

const CustomPromptItem = ({ prompt, onCopy, onEdit, copyStatus, currentAnalysisResult }) => {
  const canCopy = prompt.title.trim() && prompt.prompt.trim();

  const handleCopyClick = (e) => {
    e.stopPropagation();
    
    if (e.shiftKey) {
      // Copy just the prompt content
      const promptOnly = `${prompt.title}\n\n${prompt.prompt}`;
      window.electron.copyToClipboard(promptOnly);
      // Trigger copy status for prompt-only copy
      onCopy(prompt, null); // Pass null to indicate prompt-only copy
    } else {
      // Copy prompt + analysis (existing behavior)
      onCopy(prompt, currentAnalysisResult);
    }
  };

  return (
    <div 
      className="bg-gray-700 rounded-md p-3 cursor-pointer hover:bg-gray-600 transition-colors"
      onClick={() => onEdit(prompt)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <div className="text-sm text-gray-200 font-medium truncate mb-1">
            {prompt.title}
          </div>
          <p className="text-xs text-gray-400 line-clamp-2">
            {prompt.prompt ? 
              `${prompt.prompt.substring(0, 80)}...` : 
              <span className="italic">No content yet - click to add</span>
            }
          </p>
        </div>
        
        <div className="flex-shrink-0">
          <button
            onClick={handleCopyClick}
            className={`p-2 rounded text-white relative ${
              canCopy 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-600 cursor-not-allowed'
            }`}
            title={canCopy ? 
              "Copy prompt + analysis • Shift+click for prompt only" : 
              "Add prompt content to enable copying"
            }
            disabled={!canCopy}
          >
            <ClipboardIcon className="h-4 w-4" />
            {copyStatus === 'copied' && canCopy && (
              <div className="absolute -top-8 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Copied!
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPromptItem;