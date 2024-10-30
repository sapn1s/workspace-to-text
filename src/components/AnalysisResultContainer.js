import React from 'react';

export default function AnalysisResultContainer({ result }) {
  const characterCount = result ? result.length : 0;

  return (
    <div className="w-full h-full bg-gray-700 rounded-md overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-600 flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-sm text-gray-300">
            Character count: {characterCount.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="flex-grow overflow-auto p-4">
        <pre className="text-sm text-gray-300 whitespace-pre-wrap break-all font-mono">
          {result}
        </pre>
      </div>
    </div>
  );
}