import React, { useState, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export function ChipInput({ value, onChange, placeholder }) {
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
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="bg-transparent border-0 outline-none flex-grow text-sm min-w-[100px] text-gray-200 placeholder-gray-500"
        placeholder={patterns.length === 0 ? placeholder : 'Add more patterns...'}
      />
    </div>
  );
}