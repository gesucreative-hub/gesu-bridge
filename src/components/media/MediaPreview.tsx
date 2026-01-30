/**
 * MediaPreview modal for viewing full-size images and videos
 */

import { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { MediaItem } from "../../api/bridge";
import { previewMedia, parseError } from "../../api/bridge";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Content */}
      <div className="relative z-10 flex flex-col max-w-[90vw] max-h-[90vh]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 text-white/70 hover:text-white transition-colors"
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
        <div className="relative bg-surface-900 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center w-[60vw] h-[60vh]">
              <svg
                className="w-12 h-12 animate-spin text-primary-400"
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
              <span className="mt-4 text-surface-300">Loading preview...</span>
              <span className="text-xs text-surface-500 mt-1">
                Pulling file from device
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center w-[60vw] h-[60vh] text-error">
              <svg className="w-16 h-16 mb-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          ) : localPath ? (
            item.media_type === "image" ? (
              <div className="flex flex-col items-center">
                  <img
                    src={localPath.startsWith('data:') ? localPath : convertFileSrc(localPath)}
                    alt={item.name}
                    className="max-w-[80vw] max-h-[80vh] object-contain"
                    onError={(e) => {
                        console.error("Image load failed", e);
                        setError("Failed to render image");
                    }}
                  />
              </div>
            ) : (
                <div className="flex flex-col items-center">
                  <video
                    src={convertFileSrc(localPath)}
                    controls
                    autoPlay
                    className="max-w-[90vw] max-h-[80vh] bg-black"
                  />
                </div>
              )
          ) : null}
        </div>

        {/* Info bar */}
        <div className="flex items-center justify-between mt-3 px-2">
          <div className="text-white">
            <div className="font-medium">{item.name}</div>
            <div className="text-sm text-white/60">
              {formatSize(item.size_bytes)}
              {item.date_taken && ` • ${item.date_taken}`}
            </div>
          </div>

          
          <div className="flex items-center gap-2">
            {item.media_type === "video" && localPath && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  import("../../api/bridge").then(m => m.openMediaFolder(localPath));
                }}
                className="flex items-center gap-2 px-3 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors text-sm"
              >
                <span>External Player ↗</span>
              </button>
            )}

            <button
            onClick={() => onTransfer(item)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
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
