// src/pages/ProjectView/components/FileExplorer/components/ContextMenu/ContextMenu.js - FIXED VERSION

import React, { useEffect, useRef, useState } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

// Custom event name for signaling a new menu has opened
const MENU_OPEN_EVENT = 'context-menu-opened';

// Submenu component
const ContextSubmenu = ({ items, onClose, parentRect, position = 'right', onMouseEnter, onMouseLeave }) => {
  const submenuRef = useRef(null);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!submenuRef.current || !parentRect) return;
    
    const submenuRect = submenuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left, top;
    
    if (position === 'right') {
      left = parentRect.right + 5;
      // If submenu would go off-screen, position it to the left instead
      if (left + submenuRect.width > viewportWidth) {
        left = parentRect.left - submenuRect.width - 5;
      }
    } else {
      left = parentRect.left - submenuRect.width - 5;
      if (left < 0) {
        left = parentRect.right + 5;
      }
    }
    
    top = parentRect.top;
    // Adjust if submenu would go below viewport
    if (top + submenuRect.height > viewportHeight) {
      top = viewportHeight - submenuRect.height - 10;
    }
    
    setSubmenuPosition({ top, left: Math.max(5, left) });
  }, [parentRect, position]);

  // Handler function defined outside of map to avoid recreation
  const handleSubmenuItemClick = (item) => {
    console.log("Submenu item clicked:", item.label);
    try {
      item.onClick();
    } catch (error) {
      console.error("Error executing submenu item onClick:", error);
    }
    onClose();
  };

  return (
    <div 
      ref={submenuRef}
      className="fixed z-50 min-w-[160px] bg-gray-600 rounded-md shadow-lg py-1 text-sm border border-gray-500"
      style={{ top: submenuPosition.top, left: submenuPosition.left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-500 focus:outline-none"
          onClick={() => handleSubmenuItemClick(item)}
          onMouseDown={() => handleSubmenuItemClick(item)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export const ContextMenu = ({ x, y, onClose, options }) => {
  const menuRef = useRef(null);
  const menuId = useRef(`menu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [position, setPosition] = useState({ top: y, left: x });
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [submenuParentRect, setSubmenuParentRect] = useState(null);
  const submenuTimeoutRef = useRef(null);

  // Calculate and set correct position on mount and when x/y change
  useEffect(() => {
    if (!menuRef.current) return;
    
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let adjustedX = x + 30;
    let adjustedY = y;
    
    if (x + menuRect.width > viewportWidth) {
      adjustedX = viewportWidth - menuRect.width - 10;
    }
    
    if (y + menuRect.height > viewportHeight) {
      adjustedY = viewportHeight - menuRect.height - 10;
    }
    
    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);
    
    setPosition({
      top: adjustedY,
      left: adjustedX
    });
  }, [x, y]);

  useEffect(() => {
    const openEvent = new CustomEvent(MENU_OPEN_EVENT, { 
      detail: { id: menuId.current } 
    });
    document.dispatchEvent(openEvent);

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    const handleOtherMenuOpen = (event) => {
      if (event.detail.id !== menuId.current) {
        onClose();
      }
    };
    document.addEventListener(MENU_OPEN_EVENT, handleOtherMenuOpen);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener(MENU_OPEN_EVENT, handleOtherMenuOpen);
      // Clear any pending timeouts
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
  }, [onClose]);

  const showSubmenu = (option, event) => {
    // Clear any existing timeout
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }

    if (option.submenu) {
      const rect = event.currentTarget.getBoundingClientRect();
      setSubmenuParentRect(rect);
      setActiveSubmenu(option);
    }
  };

  const hideSubmenu = () => {
    // Add a delay before hiding to allow mouse movement to submenu
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
      setSubmenuParentRect(null);
    }, 150); // 150ms delay
  };

  const keepSubmenuOpen = () => {
    // Cancel the hide timeout when mouse enters submenu area
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
  };

  const handleSubmenuMouseLeave = () => {
    // Hide submenu when mouse leaves submenu area
    hideSubmenu();
  };

  // Filter out separator items and handle them specially
  const menuItems = options.filter(option => !option.separator);
  const separatorIndices = options.map((option, index) => option.separator ? index : -1).filter(i => i !== -1);

  return (
    <>
      <div 
        ref={menuRef}
        className="fixed z-50 min-w-[160px] bg-gray-700 rounded-md shadow-lg py-1 text-sm"
        style={{ top: position.top, left: position.left }}
      >
        {menuItems.map((option, index) => {
          const showSeparatorBefore = separatorIndices.some(sepIndex => sepIndex === index);
          
          return (
            <React.Fragment key={index}>
              {showSeparatorBefore && (
                <div className="border-t border-gray-600 my-1" />
              )}
              <button
                className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-600 focus:outline-none flex items-center justify-between"
                onClick={(e) => {
                  console.log("Main menu item clicked:", option.label);
                  
                  // FIXED: Handle submenu items differently
                  if (option.submenu) {
                    // For submenu items, just show the submenu, don't close the main menu yet
                    showSubmenu(option, e);
                    return;
                  }
                  
                  // For regular items, execute the onClick and close
                  // FIXED: Don't call stopPropagation here either
                  option.onClick();
                  onClose();
                }}
                onMouseEnter={(e) => showSubmenu(option, e)}
                onMouseLeave={hideSubmenu}
              >
                <span>{option.label}</span>
                {option.submenu && (
                  <ChevronRightIcon className="w-4 h-4 text-gray-400 ml-2" />
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Render submenu if active */}
      {activeSubmenu && activeSubmenu.submenu && submenuParentRect && (
        <ContextSubmenu
          items={activeSubmenu.submenu}
          onClose={onClose}
          parentRect={submenuParentRect}
          onMouseEnter={keepSubmenuOpen}
          onMouseLeave={handleSubmenuMouseLeave}
        />
      )}
    </>
  );
};