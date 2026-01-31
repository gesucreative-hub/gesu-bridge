import type { FolderInfo } from "../../api/bridge";

const QUICK_ACCESS_FOLDERS = [
  { name: "DCIM (Photos/Videos)", path: "/sdcard/DCIM" },
  { name: "Pictures", path: "/sdcard/Pictures" },
  { name: "Download", path: "/sdcard/Download" },
  { name: "Movies", path: "/sdcard/Movies" },
];

interface FolderBrowserProps {
  folders: FolderInfo[];
  currentPath: string;
  loading: boolean;
  onFolderSelect: (folder: FolderInfo) => void;
  onNavigateUp: () => void;
  onNavigateToPath: (path: string) => void;
}

const getDisplayPart = (part: string) => {
  if (part.toLocaleLowerCase() === "sdcard") return "Internal Storage";
  return part;
};

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
    <div className="flex flex-col h-full bg-surface-900">
      {/* Breadcrumb Navigation - Truncated for sidebar width */}
      <div className="flex items-center gap-1 px-4 py-2.5 bg-surface-800/40 border-b border-surface-700 overflow-hidden">
        <button
          onClick={() => onNavigateToPath("/sdcard")}
          className="text-xs text-surface-400 hover:text-primary-400 transition-colors shrink-0 flex items-center gap-1 group"
        >
          <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">Device</span>
        </button>
        
        <div className="flex items-center gap-1 min-w-0 flex-1 ml-0.5 overflow-hidden">
          {pathParts.map((part, index) => {
            const fullPath = "/" + pathParts.slice(0, index + 1).join("/");
            const isLast = index === pathParts.length - 1;
            
            // Only show last 2 parts of path if it's very long
            if (pathParts.length > 3 && index < pathParts.length - 2 && index > 0) {
              if (index === 1) return <span key="sep" className="text-surface-600 text-xs text-center shrink-0 w-2">...</span>;
              return null;
            }

            return (
              <span key={fullPath} className="flex items-center gap-1 shrink-0 min-w-0">
                <span className="text-surface-700 text-[10px] shrink-0">/</span>
                <button
                  onClick={() => !isLast && onNavigateToPath(fullPath)}
                  className={`text-xs transition-colors truncate max-w-[120px] ${
                    isLast
                      ? "text-surface-100 font-bold"
                      : "text-surface-400 hover:text-primary-400"
                  }`}
                  disabled={isLast}
                  title={part}
                >
                  {getDisplayPart(part)}
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {/* Quick Access Dropdown */}
      <div className="px-4 py-3 border-b border-surface-800 bg-surface-900/50">
        <div className="relative group">
          <label className="block text-[10px] uppercase tracking-widest text-surface-500 mb-1.5 ml-1 font-bold">
            Common Folders
          </label>
          <select
            value={QUICK_ACCESS_FOLDERS.find(f => currentPath.startsWith(f.path))?.path || ""}
            onChange={(e) => {
              if (e.target.value) onNavigateToPath(e.target.value);
            }}
            className="w-full bg-surface-800 border border-surface-700 text-surface-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-primary-500/50 hover:bg-surface-750 transition-all cursor-pointer appearance-none"
          >
            <option value="" disabled>Select a location...</option>
            {QUICK_ACCESS_FOLDERS.map((folder) => (
              <option key={folder.path} value={folder.path}>
                {folder.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-[34px] pointer-events-none text-surface-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Folder List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
            <span className="mt-3 text-xs text-surface-400 uppercase tracking-widest font-medium">Scanning...</span>
          </div>
        ) : folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-surface-600">
            <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-xs font-medium uppercase tracking-wide">No folders found</span>
          </div>
        ) : (
          <div className="p-3 space-y-0.5">
            {/* Go up button */}
            {currentPath !== "/sdcard" && (
              <button
                onClick={onNavigateUp}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-primary-300 transition-all group"
              >
                <div className="w-8 flex justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <span className="text-sm font-semibold tracking-wide">Parent Directory</span>
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
                  <div className="text-sm text-surface-200 group-hover:text-primary-300 transition-colors truncate" title={folder.name}>
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
