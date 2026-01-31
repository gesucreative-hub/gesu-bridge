/**
 * MediaPreviewerPage - Fast media browser for connected Android devices
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  listDevices,
  listDeviceFolders,
  listDeviceMedia,
  pullMediaFiles,
  openMediaFolder,
  getSettings,
  getDefaultMediaRoot,
  parseError,
  type Device,
  type FolderInfo,
  type MediaItem,
  type MediaFilter,
  type MediaTransferResult,
} from "../api/bridge";
import { FolderBrowser } from "../components/media/FolderBrowser";
import { MediaGrid } from "../components/media/MediaGrid";
import { MediaPreview } from "../components/media/MediaPreview";
import { TransferProgress } from "../components/media/TransferProgress";

export function MediaPreviewerPage() {
  // Device state
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [adbAvailable, setAdbAvailable] = useState<boolean | null>(null);

  // Navigation state
  const [currentPath, setCurrentPath] = useState("/sdcard");
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<MediaFilter>("all");

  // Preview state
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Transfer state
  const [transferResults, setTransferResults] = useState<MediaTransferResult[]>([]);
  const [transferInProgress, setTransferInProgress] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Resizable panel state
  const [panelWidth, setPanelWidth] = useState(260); // Optimized default
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cache refs
  const folderCache = useRef<Record<string, FolderInfo[]>>({});
  const mediaCache = useRef<Record<string, Record<string, MediaItem[]>>>({}); // path -> filter -> items

  // Clear cache when device changes
  useEffect(() => {
    folderCache.current = {};
    mediaCache.current = {};
  }, [selectedDevice?.serial]);

  // Handle resize drag
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      // Clamp between 200px and 800px
      setPanelWidth(Math.max(200, Math.min(800, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Load devices on mount
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const settings = await getSettings();
        setAdbAvailable(settings.adb_available);

        if (settings.adb_available) {
          const deviceList = await listDevices();
          setDevices(deviceList);
          
          // Auto-select first ready device
          const readyDevice = deviceList.find((d) => d.state === "ready");
          if (readyDevice) {
            setSelectedDevice(readyDevice);
            // Fetch default root
            try {
              const root = await getDefaultMediaRoot(readyDevice.serial);
              setCurrentPath(root);
            } catch (e) {
              console.warn("Failed to get default root", e);
            }
          }
        }
      } catch (err) {
        setError(parseError(err));
      }
    };

    loadInitial();
  }, []);

  // Load folders when path changes
  useEffect(() => {
    if (!selectedDevice) return;

    const loadFolders = async () => {
      // Check cache first
      if (folderCache.current[currentPath]) {
        setFolders(folderCache.current[currentPath]);
        return;
      }

      setFoldersLoading(true);
      setError(null);

      try {
        const folderList = await listDeviceFolders(selectedDevice.serial, currentPath);
        folderCache.current[currentPath] = folderList;
        setFolders(folderList);
      } catch (err) {
        setError(parseError(err));
        setFolders([]);
      } finally {
        setFoldersLoading(false);
      }
    };

    loadFolders();
  }, [selectedDevice, currentPath]);

  // Load media when path or filter changes
  useEffect(() => {
    if (!selectedDevice) return;

    const loadMedia = async () => {
      // Check cache first
      if (mediaCache.current[currentPath]?.[filter]) {
        setMediaItems(mediaCache.current[currentPath][filter]);
        return;
      }

      setMediaLoading(true);
      setError(null);
      setSelectedItems(new Set());

      try {
        const items = await listDeviceMedia(selectedDevice.serial, currentPath, filter);
        
        if (!mediaCache.current[currentPath]) {
          mediaCache.current[currentPath] = {};
        }
        mediaCache.current[currentPath][filter] = items;
        
        setMediaItems(items);
      } catch (err) {
        setError(parseError(err));
        setMediaItems([]);
      } finally {
        setMediaLoading(false);
      }
    };

    loadMedia();
  }, [selectedDevice, currentPath, filter]);

  // Navigation handlers
  const handleFolderSelect = useCallback((folder: FolderInfo) => {
    setCurrentPath(folder.path);
  }, []);

  const handleNavigateUp = useCallback(() => {
    const parts = currentPath.split("/").filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      setCurrentPath("/" + parts.join("/"));
    }
  }, [currentPath]);

  const handleNavigateToPath = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  // Selection handlers
  const handleItemSelect = useCallback((item: MediaItem, selected: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(item.path);
      } else {
        next.delete(item.path);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedItems(new Set(mediaItems.map((item) => item.path)));
  }, [mediaItems]);

  const handleClearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Preview handler
  const handleItemPreview = useCallback((item: MediaItem) => {
    setPreviewItem(item);
  }, []);

  // Transfer handlers
  const handleTransferSelected = useCallback(async () => {
    if (!selectedDevice || selectedItems.size === 0) return;

    // Ask for destination folder
    const destFolder = await open({
      directory: true,
      title: "Select destination folder",
    });

    if (!destFolder) return;

    setTransferInProgress(true);
    setShowTransferModal(true);
    setTransferResults([]);

    try {
      const paths = Array.from(selectedItems);
      const results = await pullMediaFiles(selectedDevice.serial, paths, destFolder);
      setTransferResults(results);
      setSelectedItems(new Set());
    } catch (err) {
      setError(parseError(err));
    } finally {
      setTransferInProgress(false);
    }
  }, [selectedDevice, selectedItems]);

  const handleTransferSingle = useCallback(
    async (item: MediaItem) => {
      if (!selectedDevice) return;

      // Ask for destination folder
      const destFolder = await open({
        directory: true,
        title: "Select destination folder",
      });

      if (!destFolder) return;

      setTransferInProgress(true);
      setShowTransferModal(true);
      setTransferResults([]);
      setPreviewItem(null);

      try {
        const results = await pullMediaFiles(selectedDevice.serial, [item.path], destFolder);
        setTransferResults(results);
      } catch (err) {
        setError(parseError(err));
      } finally {
        setTransferInProgress(false);
      }
    },
    [selectedDevice]
  );

  const handleOpenFolder = useCallback(async (path: string) => {
    try {
      await openMediaFolder(path);
    } catch (err) {
      setError(parseError(err));
    }
  }, []);

  // Render ADB not available state
  if (adbAvailable === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <span className="text-5xl mb-4">🔧</span>
        <h2 className="text-xl font-semibold text-surface-100 mb-2">
          ADB Not Available
        </h2>
        <p className="text-surface-400 max-w-md">
          Please configure ADB path in Settings to use the Media Previewer.
        </p>
      </div>
    );
  }

  // Render no device state
  if (adbAvailable && !selectedDevice) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <span className="text-5xl mb-4">📱</span>
        <h2 className="text-xl font-semibold text-surface-100 mb-2">
          No Device Connected
        </h2>
        <p className="text-surface-400 max-w-md">
          Connect an Android device via USB with USB debugging enabled to browse media.
        </p>
        {devices.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-surface-500 mb-2">
              {devices.length} device(s) found but not ready:
            </p>
            {devices.map((d) => (
              <div key={d.serial} className="text-sm text-warning">
                {d.model || d.serial}: {d.state}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-surface-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-surface-100">
              Media Previewer
            </h1>
            <p className="text-sm text-surface-400">
              Browse and transfer photos & videos via USB
            </p>
          </div>

          {/* Device selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedDevice?.serial || ""}
              onChange={(e) => {
                const device = devices.find((d) => d.serial === e.target.value);
                setSelectedDevice(device || null);
                setCurrentPath("/sdcard");
              }}
              className="px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 focus:outline-none focus:border-primary-500"
            >
              {devices
                .filter((d) => d.state === "ready")
                .map((device) => (
                  <option key={device.serial} value={device.serial}>
                    {device.model || device.serial}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-6 py-3 bg-error/10 border-b border-error/20 text-error text-sm flex items-center gap-2">
          <span>⚠️</span>
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-error/70 hover:text-error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main content with resizable panels */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* Left panel - Folder browser */}
        <div
          style={{ width: panelWidth }}
          className="border-r border-surface-800 flex flex-col overflow-hidden shrink-0 bg-surface-900"
        >
          <div className="flex-1 overflow-x-auto">
            <FolderBrowser
              folders={folders}
              currentPath={currentPath}
              loading={foldersLoading}
              onFolderSelect={handleFolderSelect}
              onNavigateUp={handleNavigateUp}
              onNavigateToPath={handleNavigateToPath}
            />
          </div>
        </div>

        {/* Resize handle */}
        <div
          className={`w-1 cursor-col-resize hover:bg-primary-500/50 active:bg-primary-500 transition-colors z-10 ${
            isResizing ? "bg-primary-500" : "bg-transparent"
          }`}
          onMouseDown={() => setIsResizing(true)}
        />

        {/* Right panel - Media grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <MediaGrid
            serial={selectedDevice?.serial || ""}
            items={mediaItems}
            loading={mediaLoading}
            selectedItems={selectedItems}
            onItemSelect={handleItemSelect}
            onItemPreview={handleItemPreview}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            filter={filter}
            onFilterChange={setFilter}
          />

          {/* Transfer action bar */}
          {selectedItems.size > 0 && (
            <div className="px-4 py-3 bg-surface-800 border-t border-surface-700 flex items-center justify-between">
              <span className="text-sm text-surface-300">
                {selectedItems.size} item(s) selected
              </span>
              <button
                onClick={handleTransferSelected}
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
                Transfer to PC
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay to prevent text selection during resize */}
      {isResizing && <div className="fixed inset-0 z-50 cursor-col-resize" />}

      {/* Preview modal */}
      {previewItem && selectedDevice && (
        <MediaPreview
          item={previewItem}
          serial={selectedDevice.serial}
          onClose={() => setPreviewItem(null)}
          onTransfer={handleTransferSingle}
        />
      )}

      {/* Transfer progress modal */}
      {showTransferModal && (
        <TransferProgress
          results={transferResults}
          inProgress={transferInProgress}
          onOpenFolder={handleOpenFolder}
          onClose={() => setShowTransferModal(false)}
        />
      )}
    </div>
  );
}
