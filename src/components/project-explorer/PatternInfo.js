import React from 'react';

export const PatternInfo = ({ includePatterns, excludePatterns }) => (
  <div className="mt-4 space-y-2 text-xs text-gray-400 flex-shrink-0">
    <div>
      <div className="font-medium">Include Patterns:</div>
      <div className="italic break-words">{includePatterns || 'None'}</div>
    </div>
    <div>
      <div className="font-medium">Exclude Patterns:</div>
      <div className="italic break-words">{excludePatterns || 'None'}</div>
    </div>
  </div>
);