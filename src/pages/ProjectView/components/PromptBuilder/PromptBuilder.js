// src/pages/ProjectView/components/PromptBuilder/PromptBuilder.js
import React from 'react';
import LLMPrompts from '../LLMPrompts/LLMPrompts';

export function PromptBuilder({
    project,
    isModulesPanelCollapsed,
    currentData,
    onApplyContextExclusions,
    onOpenModuleDialog
}) {
    return (
        <div className={`flex-none ${isModulesPanelCollapsed ? 'w-1/12' : 'w-1/5'}`}>
            <div className="bg-gray-800 rounded-lg h-[600px] overflow-hidden">
                <div className="p-4 h-full">
                    <div className="h-full overflow-y-auto">
                        <LLMPrompts
                            projectId={project.id}
                            onApplyContextExclusions={onApplyContextExclusions}
                            currentAnalysisResult={currentData.result}
                            onOpenModuleDialog={onOpenModuleDialog}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}