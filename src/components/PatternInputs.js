import React, { useState, useRef } from 'react';
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  PlusIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline';

const ChipInput = ({ value, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  
  // Parse patterns from the value string
  const patterns = value ? value.split(',').filter(Boolean).map(p => p.trim()) : [];

  const addPattern = (pattern) => {
    const newPatterns = new Set([...patterns]);
    pattern.split(',').forEach(p => {
      if (p.trim()) newPatterns.add(p.trim());
    });
    // Pass the string directly
    onChange(Array.from(newPatterns).join(','));
    setInputValue('');
  };

  const removePattern = (patternToRemove) => {
    const newPatterns = patterns.filter(p => p !== patternToRemove);
    // Pass the string directly
    onChange(newPatterns.join(','));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addPattern(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && patterns.length > 0) {
      removePattern(patterns[patterns.length - 1]);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (!value.includes(',')) {
      setInputValue(value);
    } else {
      addPattern(value);
    }
  };

  return (
    <div
      className="min-h-[2.5rem] w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 
                 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent
                 flex flex-wrap gap-2 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {patterns.map((pattern, index) => (
        <span
          key={index}
          className="inline-flex items-center bg-gray-600 text-gray-200 text-sm rounded-md px-2 py-1 gap-1"
        >
          <span className="font-mono">{pattern}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removePattern(pattern);
            }}
            className="text-gray-400 hover:text-gray-200 focus:outline-none"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        className="bg-transparent border-0 outline-none flex-grow text-sm min-w-[100px] text-gray-200 placeholder-gray-500"
        placeholder={patterns.length === 0 ? placeholder : 'Add more patterns...'}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

const PatternInputs = ({ includePatterns, excludePatterns, onIncludeChange, onExcludeChange }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const commonExcludes = [
    { pattern: '.git/**,.git', desc: 'Git repository files' },
    { pattern: 'node_modules/**,node_modules', desc: 'Node.js dependencies' },
    { pattern: 'dist/**,build/**', desc: 'Build output folders' },
    { pattern: '.env,.env.*', desc: 'Environment files' },
    { pattern: 'package-lock.json,yarn.lock', desc: 'Package manager locks' },
    { pattern: '*.log,logs/**', desc: 'Log files' },
    { pattern: '.DS_Store,Thumbs.db', desc: 'System files' },
    { pattern: '.vscode/**,.idea/**', desc: 'Editor configs' }
  ];

  const handleAddPattern = (newPattern) => {
    const currentPatterns = excludePatterns ? excludePatterns.split(',').filter(p => p.trim()) : [];
    const patternsToAdd = newPattern.split(',').filter(p => p.trim());
    const uniquePatterns = [...new Set([...currentPatterns, ...patternsToAdd])];
    onExcludeChange(uniquePatterns.join(','));
  };

  return (
    <div className="space-y-4 bg-gray-800 rounded-lg p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-medium text-gray-200">Pattern Configuration</h3>
        {isExpanded ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {isExpanded && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Include Patterns
            </label>
            <ChipInput
              value={includePatterns}
              onChange={onIncludeChange}
              placeholder="Type a pattern and press Enter (e.g., src/**, *.js)"
            />
            <p className="text-xs text-gray-400 mt-1">
              Press Enter or comma to add patterns. Examples: src/** (all files in src), *.{'{js,ts}'} (all JS/TS files)
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Exclude Patterns
            </label>
            <ChipInput
              value={excludePatterns}
              onChange={onExcludeChange}
              placeholder="Type a pattern and press Enter (e.g., .git, node_modules)"
            />
            
            <div className="mt-3">
              <div className="text-xs font-medium text-gray-400 mb-2">Common Exclusions:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {commonExcludes.map(({ pattern, desc }) => (
                  <div 
                    key={pattern}
                    className="flex items-center justify-between bg-gray-700 rounded-md p-2 text-sm"
                  >
                    <div className="flex-grow">
                      <div className="text-gray-200">{desc}</div>
                      <div className="text-gray-400 text-xs font-mono">{pattern}</div>
                    </div>
                    <button
                      onClick={() => handleAddPattern(pattern)}
                      className="ml-2 p-1 hover:bg-gray-600 rounded-md"
                      title="Add this pattern"
                    >
                      <PlusIcon className="h-4 w-4 text-blue-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternInputs;