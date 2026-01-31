/**
 * MediaGrid component for displaying media items in a grid layout
 */

import { useState, useEffect, useRef } from "react";
import type { MediaItem, MediaFilter } from "../../api/bridge";
import { getMediaThumbnail } from "../../api/bridge";

interface MediaGridProps {
  serial: string;
  items: MediaItem[];
  loading: boolean;
  selectedItems: Set<string>;
  onItemSelect: (item: MediaItem, selected: boolean) => void;
  onItemPreview: (item: MediaItem) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  filter: MediaFilter;
  onFilterChange: (filter: MediaFilter) => void;
}

export function MediaGrid({
  serial,
  items,
  loading,
  selectedItems,
  onItemSelect,
  onItemPreview,
  onSelectAll,
  onClearSelection,
  filter,
  onFilterChange,
}: MediaGridProps) {
  // Local cache for thumbnails (path -> base64/url)
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const loadingRef = useRef<Set<string>>(new Set());

  // Reset thumbnails when serial changes (new device)
  useEffect(() => {
    setThumbnails({});
    loadingRef.current = new Set();
  }, [serial]);

  // Lazy load thumbnails sequentially (Simple loading)
  useEffect(() => {
    let cancelled = false;

    const loadThumbnails = async () => {
      // Filter items that need thumbnails
      const itemsNeedingThumbnails = items.filter(
        (item) =>
          (item.media_type === "image" || item.media_type === "video") &&
          !item.thumbnail_url &&
          !thumbnails[item.path] &&
          !loadingRef.current.has(item.path)
      );

      if (itemsNeedingThumbnails.length === 0) return;

      // Mark all as loading initially to prevent redundant calls
      // and load them one by one sequentially
      for (const item of itemsNeedingThumbnails) {
        if (cancelled) break;
        
        loadingRef.current.add(item.path);
        try {
          const url = await getMediaThumbnail(serial, item.path);
          if (!cancelled) {
            setThumbnails((prev) => ({ ...prev, [item.path]: url }));
          }
        } catch (e) {
          console.warn("Failed to load thumbnail", item.path, e);
        } finally {
          loadingRef.current.delete(item.path);
        }
      }
    };

    if (!loading && items.length > 0) {
      loadThumbnails();
    }

    return () => {
      cancelled = true;
    };
  }, [items, loading, serial]); // Removed 'thumbnails' to prevent loop

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Format duration for videos
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-800/50 border-b border-surface-700">
        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          {(["all", "images", "videos"] as MediaFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1 text-xs rounded-full transition-all flex items-center gap-1.5 ${
                filter === f
                  ? "bg-primary-600/20 text-primary-300 border border-primary-500/50"
                  : "text-surface-400 border border-transparent hover:text-surface-200"
              }`}
            >
              {f === "all" ? (
                "All"
              ) : f === "images" ? (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Images
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                    />
                  </svg>
                  Videos
                </>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-surface-400">
            {items.length} items{" "}
            {selectedItems.size > 0 && `(${selectedItems.size} selected)`}
          </span>
          <button
            onClick={onSelectAll}
            className="px-2 py-1 text-surface-300 hover:text-primary-300 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={onClearSelection}
            className="px-2 py-1 text-surface-300 hover:text-primary-300 transition-colors"
            disabled={selectedItems.size === 0}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3 text-surface-400">
              <svg
                className="w-8 h-8 animate-spin"
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
              <span>Loading media...</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-surface-400">
            <div className="text-surface-600 mb-3 grayscale opacity-50">
              {filter === "images" ? (
                <svg
                  className="w-16 h-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              ) : filter === "videos" ? (
                <svg
                  className="w-16 h-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-16 h-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              )}
            </div>
            <span className="text-sm">No media files found</span>
            <span className="text-xs text-surface-500 mt-1">
              Try browsing a different folder
            </span>
          </div>
        ) : (
          <div 
            className="grid gap-3" 
            style={{ 
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" 
            }}
          >
            {items.map((item) => {
              const isSelected = selectedItems.has(item.path);
              const thumb = item.thumbnail_url || thumbnails[item.path];

              return (
                <div
                  key={item.path}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer group border-2 transition-all ${
                    isSelected
                      ? "border-primary-500 ring-2 ring-primary-500/30"
                      : "border-transparent hover:border-surface-600"
                  }`}
                >
                  {/* Thumbnail placeholder */}
                  <div
                    className="absolute inset-0 bg-surface-800 flex items-center justify-center"
                    onClick={() => onItemPreview(item)}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback on error
                          e.currentTarget.style.display = "none";
                          e.currentTarget.parentElement?.classList.remove(
                            "bg-surface-800",
                          );
                          e.currentTarget.parentElement?.classList.add(
                            "bg-surface-800",
                          );
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-surface-600">
                        {item.media_type === "image" ? (
                          <svg
                            className="w-8 h-8 opacity-50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-8 h-8 opacity-50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                            />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Video duration badge */}
                  {item.media_type === "video" && item.duration_ms && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white">
                      {formatDuration(item.duration_ms)}
                    </div>
                  )}

                  {/* Selection checkbox */}
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary-500 border-primary-500"
                        : "border-white/70 bg-black/30 group-hover:border-white"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemSelect(item, !isSelected);
                    }}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Hover overlay with info */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 pt-8">
                    <div className="text-xs text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-white/70">
                      {formatSize(item.size_bytes)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
