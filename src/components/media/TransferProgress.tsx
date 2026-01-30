/**
 * TransferProgress component for showing batch transfer status
 */

import type { MediaTransferResult } from "../../api/bridge";

interface TransferProgressProps {
  results: MediaTransferResult[];
  inProgress: boolean;
  onOpenFolder: (path: string) => void;
  onClose: () => void;
}

export function TransferProgress({
  results,
  inProgress,
  onOpenFolder,
  onClose,
}: TransferProgressProps) {
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const total = results.length;

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Get the destination folder from first successful result
  const destFolder = results.find((r) => r.success && r.dest_path)?.dest_path;
  const destFolderPath = destFolder
    ? destFolder.substring(0, destFolder.lastIndexOf("\\"))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-surface-900 rounded-xl border border-surface-700 shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <div className="flex items-center gap-3">
            {inProgress ? (
              <svg
                className="w-5 h-5 animate-spin text-primary-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : failed === 0 ? (
              <span className="text-success text-xl">✓</span>
            ) : (
              <span className="text-warning text-xl">⚠️</span>
            )}
            <div>
              <h3 className="font-medium text-surface-100">
                {inProgress ? "Transferring Files..." : "Transfer Complete"}
              </h3>
              <p className="text-sm text-surface-400">
                {inProgress
                  ? `${successful} of ${total} files transferred`
                  : `${successful} transferred${failed > 0 ? `, ${failed} failed` : ""}`}
              </p>
            </div>
          </div>

          {!inProgress && (
            <button
              onClick={onClose}
              className="p-1.5 text-surface-400 hover:text-surface-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Progress bar (only during transfer) */}
        {inProgress && (
          <div className="px-5 py-3 border-b border-surface-700">
            <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${(successful / total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 max-h-[300px]">
          {results.map((result, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                result.success ? "bg-surface-800/50" : "bg-error/10"
              }`}
            >
              <span className={result.success ? "text-success" : "text-error"}>
                {result.success ? "✓" : "✗"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-surface-200 truncate">
                  {result.source_path.split("/").pop()}
                </div>
                {result.error && (
                  <div className="text-xs text-error truncate">{result.error}</div>
                )}
              </div>
              <span className="text-xs text-surface-400 shrink-0">
                {formatSize(result.size_bytes)}
              </span>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        {!inProgress && (
          <div className="flex justify-end gap-3 px-5 py-4 border-t border-surface-700">
            {destFolderPath && (
              <button
                onClick={() => onOpenFolder(destFolderPath)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                  />
                </svg>
                Open Folder
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
