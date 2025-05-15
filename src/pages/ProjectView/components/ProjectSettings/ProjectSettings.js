import React, { useState, useEffect } from 'react';
import { ChevronRightIcon, ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

function ProjectSettings({ projectId }) {
    const [settings, setSettings] = useState({
        respectGitignore: true,
        ignoreDotfiles: true
    });
    const [isExpanded, setIsExpanded] = useState(true);
    const [activeTooltip, setActiveTooltip] = useState(null);

    useEffect(() => {
        const loadSettings = async () => {
            if (!projectId) return;
            const projectSettings = await window.electron.getProjectSettings(projectId);
            setSettings(projectSettings);
            
            const appSettings = await window.electron.getAppSetting('settingsExpanded');
            setIsExpanded(appSettings === null ? true : appSettings === 'true');
        };
        loadSettings();
    }, [projectId]);

    const handleSettingChange = async (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        await window.electron.updateProjectSettings(projectId, newSettings);
    };

    const toggleExpanded = async () => {
        const newState = !isExpanded;
        setIsExpanded(newState);
        await window.electron.setAppSetting('settingsExpanded', String(newState));
    };

    const tooltips = {
        respectGitignore: "When enabled, this setting automatically applies rules defined in your .gitignore file (assuming your project has it).",
        ignoreDotfiles: "When enabled, this setting excludes hidden files and directories (those starting with a dot) from analysis. This includes files like .DS_Store, .env, and hidden configuration folders."
    };

    const SettingToggle = ({ id, label, value, onChange }) => (
        <div className="flex items-center relative group">
            <label className="text-sm text-gray-300 mr-2 select-none flex items-center">
                {label}
                <button
                    className="ml-1 p-1 rounded-full hover:bg-gray-600 focus:outline-none"
                    onMouseEnter={() => setActiveTooltip(id)}
                    onMouseLeave={() => setActiveTooltip(null)}
                >
                    <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                </button>
            </label>
            <div className="relative">
                <button
                    onClick={() => onChange(!value)}
                    className={`
                        flex items-center w-8 h-4 rounded-full transition-colors duration-200 ease-in-out
                        ${value ? 'bg-blue-600' : 'bg-gray-600'}
                    `}
                >
                    <span
                        className={`
                            absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full 
                            transition-transform duration-200 ease-in-out
                            ${value ? 'translate-x-4' : 'translate-x-0'}
                        `}
                    />
                </button>
            </div>
            {activeTooltip === id && (
                <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-2 bg-gray-900 text-gray-200 text-xs rounded-md shadow-lg">
                    {tooltips[id]}
                    <div className="absolute bottom-0 left-4 transform translate-y-full">
                        <div className="w-2 h-2 bg-gray-900 transform rotate-45" />
                    </div>
                </div>
            )}
        </div>
    );

    if (!projectId) return null;

    return (
        <div className="bg-gray-800 rounded-lg py-2 px-3">
            <div 
                className="flex items-center cursor-pointer" 
                onClick={toggleExpanded}
            >
                {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-200 ml-1">Project Settings</span>
            </div>

            {isExpanded && (
                <div className="mt-2 flex items-center space-x-4">
                    <SettingToggle
                        id="respectGitignore"
                        label="Respect .gitignore"
                        value={settings.respectGitignore}
                        onChange={(value) => handleSettingChange('respectGitignore', value)}
                    />
                    
                    <div className="h-4 w-px bg-gray-600" />
                    
                    <SettingToggle
                        id="ignoreDotfiles"
                        label="Ignore dot files"
                        value={settings.ignoreDotfiles}
                        onChange={(value) => handleSettingChange('ignoreDotfiles', value)}
                    />
                </div>
            )}
        </div>
    );
}

export default ProjectSettings;