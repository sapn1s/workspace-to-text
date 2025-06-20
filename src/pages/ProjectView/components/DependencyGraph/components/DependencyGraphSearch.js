// src/pages/ProjectView/components/DependencyGraph/components/DependencyGraphSearch.js
import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export const DependencyGraphSearch = ({ graphData, onNodeSelect, showExternal = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filteredResults, setFilteredResults] = useState([]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Filter nodes based on search term and external visibility
  useEffect(() => {
    if (!searchTerm.trim() || !graphData?.nodes) {
      setFilteredResults([]);
      setSelectedIndex(-1);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = graphData.nodes
      .filter(node => {
        // Filter out external nodes if not showing external
        if (!showExternal && node.type === 'external') {
          return false;
        }
        
        // Search in both the label and path
        const label = (node.label || '').toLowerCase();
        const path = (node.path || '').toLowerCase();
        
        return label.includes(searchLower) || path.includes(searchLower);
      })
      .map(node => ({
        ...node,
        // Create a display name that shows both filename and path
        displayName: node.label,
        fullPath: node.path || node.label,
        // Calculate match relevance (exact filename match scores higher)
        relevance: getMatchRelevance(node, searchLower)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10); // Limit to 10 results for performance

    setFilteredResults(filtered);
    setSelectedIndex(-1);
  }, [searchTerm, graphData, showExternal]);

  // Calculate match relevance for sorting
  const getMatchRelevance = (node, searchLower) => {
    const label = (node.label || '').toLowerCase();
    const path = (node.path || '').toLowerCase();
    
    let score = 0;
    
    // Exact filename match gets highest score
    if (label === searchLower) score += 100;
    // Filename starts with search term
    else if (label.startsWith(searchLower)) score += 50;
    // Filename contains search term
    else if (label.includes(searchLower)) score += 25;
    
    // Path matches get lower scores
    if (path.includes(searchLower)) score += 10;
    
    return score;
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || filteredResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      
      case 'Tab':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredResults[selectedIndex]) {
          // Auto-fill with the selected result
          const selected = filteredResults[selectedIndex];
          setSearchTerm(selected.displayName);
          setIsOpen(false);
        } else if (filteredResults.length > 0) {
          // Auto-fill with the first result
          setSearchTerm(filteredResults[0].displayName);
          setIsOpen(false);
        }
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredResults[selectedIndex]) {
          selectNode(filteredResults[selectedIndex]);
        } else if (filteredResults.length > 0) {
          selectNode(filteredResults[0]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        inputRef.current?.blur();
        break;
    }
  };

  // Select a node and notify parent component
  const selectNode = (node) => {
    setSearchTerm(node.displayName);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Notify parent to center on this node AND select it
    if (onNodeSelect) {
      onNodeSelect(node);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(value.trim().length > 0);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (searchTerm.trim().length > 0) {
      setIsOpen(true);
    }
  };

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setIsOpen(false);
    setFilteredResults([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Get node type icon/color
  const getNodeTypeDisplay = (node) => {
    switch (node.type) {
      case 'entry':
        return { color: 'text-green-400', badge: 'E' };
      case 'hub':
        return { color: 'text-blue-400', badge: 'H' };
      case 'bridge':
        return { color: 'text-yellow-400', badge: 'B' };
      case 'leaf':
        return { color: 'text-gray-400', badge: 'L' };
      case 'config':
        return { color: 'text-purple-400', badge: 'C' };
      case 'external':
        return { color: 'text-orange-400', badge: 'X' };
      default:
        return { color: 'text-gray-400', badge: '?' };
    }
  };

  // Truncate path for display
  const truncatePath = (path, maxLength = 50) => {
    if (!path || path.length <= maxLength) return path;
    return '...' + path.slice(-(maxLength - 3));
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          className="w-full pl-10 pr-10 py-2 bg-gray-700 text-gray-200 text-sm rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
          placeholder="Search files... (Tab to autofill, Enter to select)"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
        />
        
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 flex items-center pr-3 hover:text-gray-200"
            title="Clear search"
          >
            <XMarkIcon className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && filteredResults.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-80 overflow-y-auto"
        >
          <div className="py-1">
            {filteredResults.map((node, index) => {
              const typeDisplay = getNodeTypeDisplay(node);
              const isSelected = index === selectedIndex;
              
              return (
                <button
                  key={node.id}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-700 focus:outline-none focus:bg-gray-700 transition-colors ${
                    isSelected ? 'bg-gray-700' : ''
                  }`}
                  onClick={() => selectNode(node)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center space-x-2">
                    {/* Node type badge */}
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded ${typeDisplay.color} bg-gray-600`}
                      title={`${node.type} node`}
                    >
                      {typeDisplay.badge}
                    </span>
                    
                    {/* File name and path */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 font-medium truncate">
                        {node.displayName}
                      </div>
                      {node.fullPath && node.fullPath !== node.displayName && (
                        <div className="text-xs text-gray-400 truncate">
                          {truncatePath(node.fullPath)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Help text */}
          <div className="border-t border-gray-600 px-3 py-2 text-xs text-gray-500">
            Use ↑↓ to navigate, Tab to autofill, Enter to select, Esc to close
          </div>
        </div>
      )}

      {/* No results message */}
      {isOpen && searchTerm.trim() && filteredResults.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg">
          <div className="px-3 py-2 text-sm text-gray-400">
            No files found matching "{searchTerm}"
            {!showExternal && (
              <div className="text-xs text-gray-500 mt-1">
                Try enabling "Show External" to search external dependencies
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};