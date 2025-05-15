import React, { useState, useRef } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const ChipInput = ({ value, onChange, placeholder, highlightText }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const patterns = value ? value.split(',').filter(Boolean).map(p => p.trim()) : [];

  const addPattern = (pattern) => {
    const newPatterns = new Set([...patterns]);
    pattern.split(',').forEach(p => {
      if (p.trim()) newPatterns.add(p.trim());
    });
    onChange(Array.from(newPatterns).join(','));
    setInputValue('');
  };

  const removePattern = (patternToRemove) => {
    const newPatterns = patterns.filter(p => p !== patternToRemove);
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

  // Function to highlight text in patterns
  const highlightPattern = (pattern) => {
    if (!highlightText || highlightText.trim() === '') {
      return <span className="font-mono">{pattern}</span>;
    }

    const parts = pattern.split(new RegExp(`(${highlightText})`, 'gi'));

    return (
      <span className="font-mono">
        {parts.map((part, i) =>
          part.toLowerCase() === highlightText.toLowerCase()
            ? <span key={i} className="bg-yellow-600 text-black">{part}</span>
            : part
        )}
      </span>
    );
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
          {highlightPattern(pattern)}
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
  const [isCommonExcludesExpanded, setIsCommonExcludesExpanded] = useState(true);
  const [searchText, setSearchText] = useState('');

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

  // Filter common excludes based on search text
  const filteredCommonExcludes = searchText.trim() !== ''
    ? commonExcludes.filter(({ pattern, desc }) =>
      pattern.toLowerCase().includes(searchText.toLowerCase()) ||
      desc.toLowerCase().includes(searchText.toLowerCase())
    )
    : commonExcludes;

  const handleAddPattern = (newPattern) => {
    const currentPatterns = excludePatterns ? excludePatterns.split(',').filter(p => p.trim()) : [];
    const patternsToAdd = newPattern.split(',').filter(p => p.trim());
    const uniquePatterns = [...new Set([...currentPatterns, ...patternsToAdd])];
    onExcludeChange(uniquePatterns.join(','));
  };

  // Function to highlight text in common excludes
  const highlightText = (text) => {
    if (!searchText || searchText.trim() === '') {
      return text;
    }

    const parts = text.split(new RegExp(`(${searchText})`, 'gi'));

    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === searchText.toLowerCase()
            ? <span key={i} className="bg-yellow-600 text-black">{part}</span>
            : part
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer py-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-medium text-gray-200 select-none">Pattern Configuration</h3>
        {isExpanded ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/*
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
          */}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Exclude Patterns
            </label>

            {/* Search bar for patterns */}
            <div className="mb-2 relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="bg-gray-700 text-gray-200 text-sm rounded-md pl-10 pr-3 py-2 w-full border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search patterns..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  title="Clear search"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-200" />
                </button>
              )}
            </div>

            <ChipInput
              value={excludePatterns}
              onChange={onExcludeChange}
              placeholder="Type a pattern and press Enter (e.g., .git, node_modules)"
              highlightText={searchText}
            />

            <div className="mt-3 border-t border-gray-700 pt-3">
              <div
                className="flex items-center justify-between cursor-pointer mb-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCommonExcludesExpanded(!isCommonExcludesExpanded);
                }}
              >
                <div className="text-sm font-medium text-gray-300 select-none">Common Exclusions</div>
                {isCommonExcludesExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                )}
              </div>

              {isCommonExcludesExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredCommonExcludes.map(({ pattern, desc }) => (
                    <div
                      key={pattern}
                      className="flex items-center justify-between bg-gray-700 rounded-md p-2 text-sm"
                    >
                      <div className="flex-grow">
                        <div className="text-gray-200">{highlightText(desc)}</div>
                        <div className="text-gray-400 text-xs font-mono">{highlightText(pattern)}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddPattern(pattern);
                        }}
                        className="ml-2 p-1 hover:bg-gray-600 rounded-md"
                        title="Add this pattern"
                      >
                        <PlusIcon className="h-4 w-4 text-blue-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternInputs;