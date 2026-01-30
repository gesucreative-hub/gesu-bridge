/**
 * FolderBrowser component for navigating device folder structure
 */

import type { FolderInfo } from "../../api/bridge";

interface FolderBrowserProps {
  folders: FolderInfo[];
  currentPath: string;
  loading: boolean;
  onFolderSelect: (folder: FolderInfo) => void;
  onNavigateUp: () => void;
  onNavigateToPath: (path: string) => void;
}

export function FolderBrowser({
  folders,
  currentPath,
  loading,
  onFolderSelect,
  onNavigateUp,
  onNavigateToPath,
}: FolderBrowserProps) {
  // Parse breadcrumb from current path
  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1 px-4 py-2 bg-surface-800/50 border-b border-surface-700 overflow-x-auto">
        <button
          onClick={() => onNavigateToPath("/sdcard")}
          className="text-sm text-surface-400 hover:text-primary-400 transition-colors shrink-0 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Device
        </button>
        {pathParts.map((part, index) => {
          const fullPath = "/" + pathParts.slice(0, index + 1).join("/");
          const isLast = index === pathParts.length - 1;
          return (
            <span key={fullPath} className="flex items-center gap-1 shrink-0">
              <span className="text-surface-600">/</span>
              <button
                onClick={() => !isLast && onNavigateToPath(fullPath)}
                className={`text-sm transition-colors ${
                  isLast
                    ? "text-surface-200 font-medium"
                    : "text-surface-400 hover:text-primary-400"
                }`}
                disabled={isLast}
              >
                {part}
              </button>
            </span>
          );
        })}
      </div>

      {/* Quick Access Bar */}
      <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-surface-700">
        {[
          { 
              name: "DCIM", 
              path: "/sdcard/DCIM", 
              icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          },
          { 
              name: "Pictures", 
              path: "/sdcard/Pictures", 
              icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          },
          { 
              name: "Download", 
              path: "/sdcard/Download", 
              icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          },
          { 
              name: "Movies", 
              path: "/sdcard/Movies", 
              icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
          },
        ].map((quick) => (
          <button
            key={quick.path}
            onClick={() => onNavigateToPath(quick.path)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-all flex items-center gap-1.5 ${
              currentPath.startsWith(quick.path)
                ? "bg-primary-600/20 border-primary-500/50 text-primary-300"
                : "border-surface-600 text-surface-300 hover:border-primary-500/50 hover:text-primary-300"
            }`}
          >
            {quick.icon} {quick.name}
          </button>
        ))}
      </div>

      {/* Folder List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-3 text-surface-400">
              <svg
                className="w-5 h-5 animate-spin"
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
              Loading folders...
            </div>
          </div>
        ) : folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-surface-400">
            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-sm">No subfolders</span>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {/* Go up button */}
            {currentPath !== "/sdcard" && (
              <button
                onClick={onNavigateUp}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors text-surface-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span className="text-sm">..</span>
              </button>
            )}

            {/* Folder items */}
            {folders.map((folder) => (
              <button
                key={folder.path}
                onClick={() => onFolderSelect(folder)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors group"
              >
                <span className="text-lg text-surface-400 group-hover:text-primary-400 transition-colors">
                  {folder.is_media_folder ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                  ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                  )}
                </span>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm text-surface-200 group-hover:text-primary-300 transition-colors whitespace-nowrap" title={folder.name}>
                    {folder.name}
                  </div>
                  {folder.item_count !== null && (
                    <div className="text-xs text-surface-500 whitespace-nowrap">
                      {folder.item_count} items
                    </div>
                  )}
                </div>
                <svg
                  className="w-4 h-4 text-surface-500 group-hover:text-surface-300 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
