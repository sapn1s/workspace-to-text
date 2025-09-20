import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import CustomPromptItem from './CustomPromptItem';
import CustomPromptEditModal from './CustomPromptEditModal';

const CustomPrompts = forwardRef(({ projectId, currentAnalysisResult }, ref) => {
  const [customPrompts, setCustomPrompts] = useState([]);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [saveStatus, setSaveStatus] = useState({
    copyPrompt: null
  });

  useEffect(() => {
    loadCustomPrompts();
  }, []); 

  const loadCustomPrompts = async () => {
    try {
      // Use global key instead of project-specific key
      const stored = await window.electron.getAppSetting('global_llm_prompts');
      if (stored) {
        setCustomPrompts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading custom prompts:', error);
    }
  };

  const saveCustomPrompts = async (prompts) => {
    try {
      // Use global key instead of project-specific key
      await window.electron.setAppSetting('global_llm_prompts', JSON.stringify(prompts));
      setCustomPrompts(prompts);
    } catch (error) {
      console.error('Error saving custom prompts:', error);
    }
  };

  const handleCopyPrompt = (prompt, analysisResult = null) => {
    let content = `${prompt.title}\n\n${prompt.prompt}`;
    
    // If we have current analysis result, append it
    if (analysisResult && analysisResult.trim()) {
      content += `\n\n--- PROJECT ANALYSIS ---\n${analysisResult}`;
    }
    
    window.electron.copyToClipboard(content);
    
    setSaveStatus(prev => ({ ...prev, copyPrompt: 'copied' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, copyPrompt: null }));
    }, 2000);
  };

  const handleEditPrompt = (prompt) => {
    setEditingPrompt(prompt ? { ...prompt } : { id: Date.now(), title: '', prompt: '' });
  };

  // Expose the add function through ref
  useImperativeHandle(ref, () => ({
    handleAddNewPrompt: () => handleEditPrompt(null)
  }));

  const handleSavePrompt = async (promptData) => {
    const isNew = !customPrompts.find(p => p.id === promptData.id);
    let updatedPrompts;

    if (isNew) {
      updatedPrompts = [...customPrompts, promptData];
    } else {
      updatedPrompts = customPrompts.map(p => p.id === promptData.id ? promptData : p);
    }

    await saveCustomPrompts(updatedPrompts);
    setEditingPrompt(null);
  };

  const handleDeletePrompt = async (promptId) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    
    const updatedPrompts = customPrompts.filter(p => p.id !== promptId);
    await saveCustomPrompts(updatedPrompts);
  };

  return (
    <div>
      <div className="space-y-2">
        {customPrompts.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">
            No custom prompts yet. Click + to add one.
          </div>
        ) : (
          customPrompts.map((prompt) => (
            <CustomPromptItem
              key={prompt.id}
              prompt={prompt}
              onCopy={handleCopyPrompt}
              onEdit={handleEditPrompt}
              onDelete={handleDeletePrompt}
              copyStatus={saveStatus.copyPrompt}
              currentAnalysisResult={currentAnalysisResult}
            />
          ))
        )}
      </div>

      {editingPrompt && (
        <CustomPromptEditModal
          prompt={editingPrompt}
          isNew={!customPrompts.find(p => p.id === editingPrompt.id)}
          onClose={() => setEditingPrompt(null)}
          onSave={handleSavePrompt}
          onDelete={handleDeletePrompt}
        />
      )}
    </div>
  );
});

export default CustomPrompts;