import { ClipboardIcon } from '@heroicons/react/24/outline';

export default function AnalysisResultContainer({ result, onCopy }) {
  const characterCount = result ? result.length : 0;

  return (
    <div className="w-full bg-gray-800 rounded-md overflow-hidden flex flex-col h-96">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex flex-col">
          <span className="text-sm text-gray-300">Character count: {characterCount.toLocaleString()}</span>
        </div>
      </div>
      <div className="w-full h-full overflow-auto p-4">
        <pre className="text-sm text-gray-300 whitespace-pre-wrap break-all font-mono">
          {result}
        </pre>
      </div>
    </div>
  );
}