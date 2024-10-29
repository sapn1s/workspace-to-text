import React, { useEffect } from 'react';

export const ContextMenu = ({ x, y, onClose, options }) => {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      className="fixed z-50 min-w-[160px] bg-gray-700 rounded-md shadow-lg py-1 text-sm"
      style={{ top: y, left: x }}
    >
      {options.map((option, index) => (
        <button
          key={index}
          className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-600 focus:outline-none"
          onClick={() => {
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