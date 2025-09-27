import React from 'react';

export function ModuleFilter({ sortBy, onSortChange, moduleCount, className = "" }) {
    const sortOptions = [
        { value: 'name', label: 'Name' },
        { value: 'created_at', label: 'Date Created' },
        { value: 'usage_status', label: 'Usage Status' }
    ];

    return (
        <div className={`flex items-center justify-between ${className}`}>
            <span className="text-xs text-gray-500">
                {moduleCount} module{moduleCount !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center">
                <label className="text-xs text-gray-500 mr-2">Sort:</label>
                <select
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 border border-gray-600 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                >
                    {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}