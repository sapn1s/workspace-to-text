import React, { useEffect, useRef, useState } from 'react';

// Custom event name for signaling a new menu has opened
const MENU_OPEN_EVENT = 'context-menu-opened';

export const ContextMenu = ({ x, y, onClose, options }) => {
  const menuRef = useRef(null);
  const menuId = useRef(`menu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [position, setPosition] = useState({ top: y, left: x });

  // Calculate and set correct position on mount and when x/y change
  useEffect(() => {
    if (!menuRef.current) return;
    
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Start with the original coordinates
    let adjustedX = x+30;
    let adjustedY = y;
    
    // Check if menu extends beyond right edge
    if (x + menuRect.width > viewportWidth) {
      adjustedX = viewportWidth - menuRect.width - 10;
    }
    
    // Check if menu extends beyond bottom edge
    if (y + menuRect.height > viewportHeight) {
      adjustedY = viewportHeight - menuRect.height - 10;
    }
    
    // Ensure menu doesn't appear offscreen at the top or left
    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);
    
    // Update position state
    setPosition({
      top: adjustedY,
      left: adjustedX
    });
  }, [x, y]);

  useEffect(() => {
    // Dispatch event when this menu opens to close any other open menus
    const openEvent = new CustomEvent(MENU_OPEN_EVENT, { 
      detail: { id: menuId.current } 
    });
    document.dispatchEvent(openEvent);

    // Handle clicks outside the menu
    const handleClickOutside = (e) => {
      // Prevent closing if clicking inside the menu
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    // Listen for other menus opening
    const handleOtherMenuOpen = (event) => {
      // Only close if the event came from a different menu
      if (event.detail.id !== menuId.current) {
        onClose();
      }
    };
    document.addEventListener(MENU_OPEN_EVENT, handleOtherMenuOpen);

    // Clean up event listeners on unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener(MENU_OPEN_EVENT, handleOtherMenuOpen);
    };
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 min-w-[160px] bg-gray-700 rounded-md shadow-lg py-1 text-sm"
      style={{ top: position.top, left: position.left }}
    >
      {options.map((option, index) => (
        <button
          key={index}
          className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-600 focus:outline-none"
          onClick={(e) => {
            e.stopPropagation(); // Prevent the click from bubbling up
            option.onClick();
            onClose();
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};