import { Dialog } from '../../../../components/common/Dialog';

export function SizeWarningDialog({ sizeStats, onClose, onProceed }) {
  const formatSize = (sizeMB) => {
    if (sizeMB >= 1024) {
      return `${(sizeMB / 1024).toFixed(1)} GB`;
    }
    return `${sizeMB.toFixed(1)} MB`;
  };

  const hasLargeDirectories = sizeStats.largeDirectories?.length > 0;
  const hasLargeFiles = sizeStats.largeFiles?.length > 0;
  const exceedsFileCount = sizeStats.totalFiles > 500;
  const exceedsTotalSize = sizeStats.totalSizeMB > 50;

  return (
    <Dialog
      title="Size Warning"
      onClose={onClose}
    >
      {/* Add max-height and overflow to the main content container */}
      <div className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
        <p className="text-gray-300">
          The following issues were detected that may impact performance:
        </p>
        
        {exceedsFileCount && (
          <div className="text-yellow-400 text-sm">
            Total file count ({sizeStats.totalFiles.toLocaleString()}) exceeds recommended limit (500)
          </div>
        )}

        {exceedsTotalSize && (
          <div className="text-yellow-400 text-sm">
            Total size ({formatSize(sizeStats.totalSizeMB)}) exceeds recommended limit (50 MB)
          </div>
        )}
        
        {hasLargeDirectories && (
          <div>
            <h3 className="text-sm font-medium text-gray-200 mb-2">
              Large Directories:
            </h3>
            {/* Add subtle gradient shadows for better scroll indication */}
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-gray-800 to-transparent pointer-events-none z-10"></div>
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-800 to-transparent pointer-events-none z-10"></div>
              {/* Add max height to directory list */}
              <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                <ul className="space-y-2">
                  {sizeStats.largeDirectories.map(dir => (
                    <li key={dir.path} className="text-yellow-400 text-sm py-1">
                      <div className="break-all">
                        {dir.path}
                      </div>
                      <span className="text-gray-400">
                        ({dir.fileCount.toLocaleString()} files, {formatSize(dir.sizeMB)})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {hasLargeFiles && (
          <div>
            <h3 className="text-sm font-medium text-gray-200 mb-2">
              Large Files:
            </h3>
            {/* Add subtle gradient shadows for better scroll indication */}
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-gray-800 to-transparent pointer-events-none z-10"></div>
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-800 to-transparent pointer-events-none z-10"></div>
              {/* Add max height to file list */}
              <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                <ul className="space-y-2">
                  {sizeStats.largeFiles.map(file => (
                    <li key={file.path} className="text-yellow-400 text-sm py-1">
                      <div className="break-all">
                        {file.path}
                      </div>
                      <span className="text-gray-400">
                        ({formatSize(file.size)})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <p className="text-gray-300 text-sm">
          Consider:
          <ul className="list-disc ml-5 mt-2 space-y-1">
            {hasLargeDirectories && (
              <li>Adding exclude patterns for large directories</li>
            )}
            {hasLargeFiles && (
              <li>Adding exclude patterns for large files</li>
            )}
            <li>Using include patterns to limit the scope of analysis</li>
            <li>Enabling "Respect .gitignore" if these are build/dependency folders</li>
          </ul>
        </p>

        {/* Move buttons outside of scrollable area and make them sticky */}
        <div className="sticky bottom-0 flex justify-end space-x-3 mt-4 pt-4 bg-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2 bg-yellow-600 rounded-md hover:bg-yellow-700 text-sm"
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    </Dialog>
  );
}