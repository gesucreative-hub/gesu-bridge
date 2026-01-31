import { useState, useEffect, useCallback } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { MediaItem } from "../../api/bridge";
import { previewMedia, parseError, openMediaFolder, getMediaThumbnail } from "../../api/bridge";

interface MediaPreviewProps {
  item: MediaItem;
  serial: string;
  onClose: () => void;
  onTransfer: (item: MediaItem) => void;
}

export function MediaPreview({
  item,
  serial,
  onClose,
  onTransfer,
}: MediaPreviewProps) {
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(item.thumbnail_url || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Pull file to local temp for preview
  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      setLoading(true);
      setError(null);

      try {
        const path = await previewMedia(serial, item.path);
        if (!cancelled) {
          setLocalPath(path);
        }
      } catch (err) {
        if (!cancelled) {
          setError(parseError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [serial, item.path]);

  // Load thumbnail if missing (happens for videos since thumbnails are cached in MediaGrid state, not item)
  useEffect(() => {
    if (item.media_type === "video" && !thumbnail) {
      getMediaThumbnail(serial, item.path).then(setThumbnail).catch(console.warn);
    }
  }, [serial, item.path, item.media_type, thumbnail]);

  // Handle external playback
  const handleOpenExternal = useCallback(async () => {
    if (!localPath) return;
    try {
      await openMediaFolder(localPath);
    } catch (err) {
      setError("Failed to open video: " + parseError(err));
    }
  }, [localPath]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 transition-all animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Content */}
      <div className="relative z-10 flex flex-col max-w-[90vw] max-h-[90vh]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 text-white/50 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Media container */}
        <div className="relative bg-surface-950 rounded-xl overflow-hidden min-w-[320px] min-h-[240px] flex items-center justify-center shadow-2xl ring-1 ring-white/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center w-[60vw] h-[60vh]">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-primary-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-primary-500 rounded-full animate-spin"></div>
              </div>
              <span className="mt-6 text-surface-200 font-medium tracking-wide">Fetching Preview...</span>
              <span className="text-xs text-surface-500 mt-2 uppercase tracking-widest">Adb pull in progress</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center w-[60vw] h-[60vh] text-center px-4">
              <div className="w-20 h-20 mb-6 bg-error/10 rounded-full flex items-center justify-center text-error">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-surface-100 font-medium text-lg mb-2">{error}</span>
              <button 
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          ) : localPath ? (
            <div 
              className={`relative group ${item.media_type === "video" ? "cursor-pointer" : ""}`} 
              onClick={item.media_type === "video" ? handleOpenExternal : undefined}
            >
              {item.media_type === "image" ? (
                <img
                  src={localPath.startsWith('data:') ? localPath : convertFileSrc(localPath)}
                  alt={item.name}
                  className="max-w-[85vw] max-h-[80vh] object-contain select-none"
                  onError={(e) => {
                    console.error("Image load failed", e);
                    setError("Failed to render image preview");
                  }}
                />
              ) : (
                <div className="relative flex items-center justify-center min-w-[400px]">
                  {/* Large thumbnail image */}
                  <img
                    src={thumbnail || ''}
                    alt={item.name}
                    className="max-w-[85vw] max-h-[80vh] object-contain opacity-50 group-hover:opacity-70 transition-all duration-300 scale-[1.01] group-hover:scale-100 blur-sm group-hover:blur-none"
                  />
                  
                  {/* Play circle overlay */}
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(34,197,94,0.4)] group-hover:scale-110 group-hover:bg-primary-500 group-hover:shadow-[0_0_50px_rgba(34,197,94,0.6)] transition-all duration-300">
                      <svg className="w-12 h-12 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Gradient overlay for text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

                  {/* "Click to Play" hint */}
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full text-white text-sm font-semibold opacity-0 group-hover:opacity-100 group-hover:translate-y-[-10px] transition-all duration-300 whitespace-nowrap z-30 shadow-2xl">
                    Click to Play in External Application
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Info bar */}
        <div className="flex items-center justify-between mt-6 px-3">
          <div className="text-white min-w-0 flex-1 mr-6">
            <h3 className="font-semibold text-lg truncate leading-tight" title={item.name}>{item.name}</h3>
            <div className="text-surface-400 text-sm mt-1 flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-surface-800 rounded text-[10px] font-bold uppercase tracking-wider text-surface-300 border border-surface-700">
                {item.media_type}
              </span>
              <span>{formatSize(item.size_bytes)}</span>
              {item.date_taken && (
                <>
                  <span className="text-surface-600">•</span>
                  <span>{item.date_taken}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onTransfer(item)}
              className="group flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-primary-900/20 active:scale-95"
            >
              <svg 
                className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Save to PC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
