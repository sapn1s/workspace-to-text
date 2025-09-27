import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export function ChipInput({ 
  value, 
  onChange, 
  placeholder,
  highlightText, // Optional prop for search highlighting
  enableMultiSelect = true,
  enableInlineEdit = true,
  enableUndo = true 
}) {
  const [inputValue, setInputValue] = useState('');
  const [selectedChips, setSelectedChips] = useState(new Set());
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [dragSelecting, setDragSelecting] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [justFinishedDrag, setJustFinishedDrag] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  
  const inputRef = useRef(null);
  const editInputRef = useRef(null);
  const containerRef = useRef(null);

  const patterns = value ? value.split(',').filter(Boolean).map(p => p.trim()) : [];

  // Auto-focus and select text when editing
  useEffect(() => {
    if (editingIndex !== null && editInputRef.current && enableInlineEdit) {
      setTimeout(() => {
        editInputRef.current.focus();
        editInputRef.current.select();
      }, 10);
    }
  }, [editingIndex, enableInlineEdit]);

  // Global mouseup listener to end drag selection
  useEffect(() => {
    if (!enableMultiSelect) return;

    const handleGlobalMouseUp = () => {
      if (dragSelecting) {
        setDragSelecting(false);
        setDragStart(null);
        setJustFinishedDrag(true);
        
        setTimeout(() => {
          setJustFinishedDrag(false);
        }, 10);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragSelecting, enableMultiSelect]);

  // Global keydown listener for handling backspace when chips are selected
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Only handle if we have selected chips and we're not currently editing
      if (enableMultiSelect && selectedChips.size > 0 && editingIndex === null) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          removeSelectedPatterns();
        } else if (e.key === 'Escape') {
          setSelectedChips(new Set());
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          // Copy selected patterns
          const textToCopy = Array.from(selectedChips).join(', ');
          navigator.clipboard.writeText(textToCopy).catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          });
        }
      }
      
      // Handle Ctrl+Z for undo (anywhere, not just when chips are selected)
      if (enableUndo && (e.ctrlKey || e.metaKey) && e.key === 'z' && undoStack.length > 0) {
        e.preventDefault();
        const lastState = undoStack[undoStack.length - 1];
        setUndoStack(prev => prev.slice(0, -1));
        onChange(lastState);
        setSelectedChips(new Set());
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedChips, editingIndex, undoStack, onChange, enableMultiSelect, enableUndo]);

  // Function to highlight text in patterns (optional)
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

  // Calculate width for edit input
  const getEditWidth = (text) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '14px monospace';
    const width = ctx.measureText(text || 'W').width;
    return Math.max(width + 32, 100);
  };

  const addPattern = (pattern) => {
    if (!pattern.trim()) return;
    // Save current state to undo stack before adding
    if (enableUndo) {
      setUndoStack(prev => [...prev.slice(-9), value]); // Keep last 10 states
    }
    const newPatterns = [...new Set([...patterns, pattern.trim()])];
    onChange(newPatterns.join(','));
    setInputValue('');
  };

  const removePattern = (patternToRemove) => {
    // Save current state to undo stack before removing
    if (enableUndo) {
      setUndoStack(prev => [...prev.slice(-9), value]); // Keep last 10 states
    }
    const newPatterns = patterns.filter(p => p !== patternToRemove);
    onChange(newPatterns.join(','));
  };

  const updatePattern = (oldPattern, newPattern) => {
    if (!newPattern.trim()) {
      removePattern(oldPattern);
      return;
    }
    // Save current state to undo stack before updating
    if (enableUndo) {
      setUndoStack(prev => [...prev.slice(-9), value]); // Keep last 10 states
    }
    const newPatterns = patterns.map(p => p === oldPattern ? newPattern.trim() : p);
    onChange(newPatterns.join(','));
  };

  const removeSelectedPatterns = () => {
    // Save current state to undo stack before removing selected
    if (enableUndo) {
      setUndoStack(prev => [...prev.slice(-9), value]); // Keep last 10 states
    }
    const newPatterns = patterns.filter(p => !selectedChips.has(p));
    onChange(newPatterns.join(','));
    setSelectedChips(new Set());
  };

  // Start editing
  const startEdit = (index, pattern) => {
    if (!enableInlineEdit) return;
    setEditingIndex(index);
    setEditingValue(pattern);
    setSelectedChips(new Set());
  };

  // Finish editing
  const finishEdit = () => {
    if (editingIndex !== null && patterns[editingIndex]) {
      updatePattern(patterns[editingIndex], editingValue);
    }
    setEditingIndex(null);
    setEditingValue('');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  // Handle container mousedown - start drag selection
  const handleContainerMouseDown = (e) => {
    if (!enableMultiSelect) return;
    
    // Ignore if clicking on input, buttons, or during editing
    if (e.target === inputRef.current || 
        e.target.closest('button') ||
        e.target === editInputRef.current ||
        editingIndex !== null) {
      return;
    }

    e.preventDefault();

    // Check if clicking on a chip
    const chipEl = e.target.closest('[data-chip-index]');
    
    if (chipEl) {
      const index = parseInt(chipEl.dataset.chipIndex);
      const pattern = patterns[index];

      // Ctrl+click for toggle
      if (e.ctrlKey || e.metaKey) {
        const newSelected = new Set(selectedChips);
        if (newSelected.has(pattern)) {
          newSelected.delete(pattern);
        } else {
          newSelected.add(pattern);
        }
        setSelectedChips(newSelected);
        return;
      }

      // Regular click - start drag selection from this chip
      setDragSelecting(true);
      setDragStart(index);
      setSelectedChips(new Set([pattern]));
    } else {
      // Click on empty space - start drag selection with nothing selected
      setDragSelecting(true);
      setDragStart(null);
      setSelectedChips(new Set());
    }
  };

  // Handle mouse enter on chips during drag
  const handleChipMouseEnter = (index, pattern) => {
    if (!enableMultiSelect || !dragSelecting) return;

    if (dragStart === null) {
      // Started from empty space, select this chip
      setSelectedChips(new Set([pattern]));
      setDragStart(index);
    } else {
      // Select range from drag start to current
      const start = Math.min(dragStart, index);
      const end = Math.max(dragStart, index);
      const rangePatterns = new Set();
      
      for (let i = start; i <= end; i++) {
        if (patterns[i]) {
          rangePatterns.add(patterns[i]);
        }
      }
      
      setSelectedChips(rangePatterns);
    }
  };

  // Handle double click on chip
  const handleChipDoubleClick = (e, index, pattern) => {
    if (!enableInlineEdit) return;
    e.preventDefault();
    e.stopPropagation();
    startEdit(index, pattern);
  };

  // Handle main input keydown
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addPattern(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && patterns.length > 0 && selectedChips.size === 0) {
      removePattern(patterns[patterns.length - 1]);
    } else if (e.key === 'Escape') {
      setSelectedChips(new Set());
    }
  };

  // Handle edit input keydown
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
    e.stopPropagation();
  };

  // Handle container click for focusing input
  const handleContainerClick = (e) => {
    // Don't clear selection if we just finished a drag operation
    if (justFinishedDrag) {
      return;
    }
    
    if (e.target === containerRef.current) {
      if (enableMultiSelect) {
        setSelectedChips(new Set());
      }
      inputRef.current?.focus();
    }
  };

  // Determine if we need extra margin for selection indicator
  const needsExtraMargin = enableMultiSelect && selectedChips.size > 0;

  return (
    <div className={`relative ${needsExtraMargin ? 'mb-8' : ''}`}>
      <div
        ref={containerRef}
        className="min-h-[2.5rem] w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 
                   focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent
                   flex flex-wrap gap-2 cursor-text"
        onMouseDown={handleContainerMouseDown}
        onClick={handleContainerClick}
      >
        {patterns.map((pattern, index) => (
          <div 
            key={index} 
            data-chip-index={index}
            className="relative"
            onMouseEnter={() => handleChipMouseEnter(index, pattern)}
          >
            {editingIndex === index ? (
              // Edit mode
              <input
                ref={editInputRef}
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={finishEdit}
                style={{ width: `${getEditWidth(editingValue)}px` }}
                className="bg-gray-600 text-gray-200 text-sm rounded-md px-2 py-1 font-mono
                          border-2 border-blue-500 outline-none"
              />
            ) : (
              // Display mode
              <div
                className={`inline-flex items-center text-sm rounded-md px-2 py-1 gap-1
                           cursor-pointer user-select-none transition-colors
                           ${enableMultiSelect && selectedChips.has(pattern) 
                             ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                             : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
                onDoubleClick={(e) => handleChipDoubleClick(e, index, pattern)}
              >
                {highlightText ? highlightPattern(pattern) : <span className="font-mono">{pattern}</span>}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePattern(pattern);
                  }}
                  className="text-gray-400 hover:text-gray-200 focus:outline-none ml-1"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={() => enableMultiSelect && setSelectedChips(new Set())}
          className="bg-transparent border-0 outline-none flex-grow text-sm min-w-[100px] 
                     text-gray-200 placeholder-gray-500"
          placeholder={patterns.length === 0 ? placeholder : 'Add more patterns...'}
        />
      </div>
      
      {/* Selection indicator - only show if multi-select is enabled and chips are selected */}
      {enableMultiSelect && selectedChips.size > 0 && (
        <div className="absolute top-full left-0 mt-2 text-xs text-blue-400 z-10">
          {selectedChips.size} selected • Backspace to delete • Ctrl+C to copy {enableUndo && '• Ctrl+Z to undo'}
        </div>
      )}
    </div>
  );
}