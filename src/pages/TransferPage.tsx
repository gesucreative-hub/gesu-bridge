import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { 
  listDevices, 
  getSettings, 
  pushFiles,
  getTransfers,
  cancelTransfer,
  parseError,
  type Device, 
  type Settings,
  type TransferItem 
} from "../api/bridge";

interface DragDropPayload {
  paths: string[];
  position: { x: number; y: number };
}

export function TransferPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [activeTransfers, setActiveTransfers] = useState<TransferItem[]>([]);
  const [history, setHistory] = useState<TransferItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [customDest, setCustomDest] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitial();
    const interval = setInterval(refreshTransfers, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for Tauri drag-drop events
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    
    async function setupDragDrop() {
      unlisten = await listen<DragDropPayload>("tauri://drag-drop", async (event) => {
        const paths = event.payload.paths;
        if (paths && paths.length > 0) {
          await startTransfer(paths);
        }
      });
    }
    
    setupDragDrop();
    
    return () => {
      if (unlisten) unlisten();
    };
  }, [selectedDevice, customDest]);

  async function loadInitial() {
    setIsLoading(true);
    try {
      const [settingsResult, transferData] = await Promise.all([
        getSettings(),
        getTransfers()
      ]);
      setSettings(settingsResult);
      setActiveTransfers(transferData[0]);
      setHistory(transferData[1]);
      setCustomDest(settingsResult.default_device_dir);

      if (settingsResult.adb_available) {
        const devicesResult = await listDevices();
        const readyDevices = devicesResult.filter(d => d.state === "ready");
        setDevices(readyDevices);
        if (readyDevices.length > 0 && !selectedDevice) {
          setSelectedDevice(readyDevices[0].serial);
        }
      }
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshTransfers() {
    try {
      const [active, hist] = await getTransfers();
      setActiveTransfers(active);
      setHistory(hist);
    } catch {
      // Silently fail on polling
    }
  }

  async function handleBrowseFiles() {
    if (!selectedDevice) {
      setError("Please select a device first");
      return;
    }

    try {
      const selected = await open({
        multiple: true,
        directory: false,
        title: "Select files to transfer"
      });

      if (selected && selected.length > 0) {
        await startTransfer(selected);
      }
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function startTransfer(paths: string[]) {
    if (!selectedDevice) {
      setError("Please select a device first");
      return;
    }
    
    setError(null);
    setIsTransferring(true);
    
    try {
      const dest = customDest.trim() || settings?.default_device_dir;
      await pushFiles(selectedDevice, paths, dest);
      await refreshTransfers();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsTransferring(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelTransfer(id);
      await refreshTransfers();
    } catch (err) {
      setError(parseError(err));
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "complete": return "text-success";
      case "failed": return "text-error";
      case "cancelled": return "text-surface-400";
      case "transferring": return "text-primary-400";
      default: return "text-surface-400";
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <div className="text-surface-400">Loading...</div>
      </div>
    );
  }

  // ADB not configured
  if (!settings?.adb_available) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-surface-100 mb-2">Transfer</h1>
        <p className="text-surface-400 mb-6">Transfer files to your Android device.</p>
        <div className="bg-surface-900 border border-warning/30 rounded-xl p-8 text-center">
          <h2 className="text-lg font-medium text-surface-200 mb-2">ADB Not Configured</h2>
          <p className="text-sm text-surface-400">Configure ADB path in Settings to enable file transfers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-surface-100 mb-2">Transfer</h1>
      <p className="text-surface-400 mb-6">Transfer files to your Android device.</p>

      {/* Error */}
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Device & Destination */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-400 mb-2">Target Device</label>
          <select
            value={selectedDevice || ""}
            onChange={(e) => setSelectedDevice(e.target.value || null)}
            className="w-full px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg 
                     text-surface-200 focus:outline-none focus:border-primary-500"
          >
            <option value="">Select a device...</option>
            {devices.map(d => (
              <option key={d.serial} value={d.serial}>
                {d.model || d.serial} {d.manufacturer ? `(${d.manufacturer})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-400 mb-2">
            Destination Folder
            <span className="text-surface-500 font-normal ml-2">(on device, under /sdcard/)</span>
          </label>
          <input
            type="text"
            value={customDest}
            onChange={(e) => setCustomDest(e.target.value)}
            placeholder="Download/GesuBridge"
            className="w-full px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg 
                     text-surface-200 placeholder-surface-500
                     focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {/* Drop Zone */}
      <div className="bg-surface-900 border-2 border-dashed border-surface-700 rounded-xl p-8 text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-surface-300 mb-2">
          Drag & drop files here
        </h2>
        <p className="text-sm text-surface-500 mb-4">
          or use the button below to browse
        </p>
        <button
          onClick={handleBrowseFiles}
          disabled={!selectedDevice || isTransferring}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700
                   text-white rounded-lg text-sm font-medium transition-colors cursor-pointer
                   disabled:cursor-not-allowed"
        >
          {isTransferring ? "Transferring..." : "Browse Files"}
        </button>
      </div>

      {/* Active Transfers */}
      {activeTransfers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-surface-300 mb-3">Active Transfers</h3>
          <div className="space-y-2">
            {activeTransfers.map(t => (
              <div key={t.id} className="bg-surface-900 border border-surface-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-surface-200">{t.file_name}</span>
                  <button
                    onClick={() => handleCancel(t.id)}
                    className="text-xs text-error hover:text-error/80 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="w-full bg-surface-700 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${t.size_bytes > 0 ? (t.transferred_bytes / t.size_bytes) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-xs text-surface-500 mt-1">
                  {formatBytes(t.transferred_bytes)} / {formatBytes(t.size_bytes)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-surface-300 mb-3">History</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.slice(0, 20).map(t => (
              <div key={t.id} className="bg-surface-900 border border-surface-800 rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-lg ${t.status === "complete" ? "text-success" : "text-error"}`}>
                    {t.status === "complete" ? "✓" : "✗"}
                  </span>
                  <div>
                    <span className="text-surface-200">{t.file_name}</span>
                    <span className="text-xs text-surface-500 ml-2">{formatBytes(t.size_bytes)}</span>
                  </div>
                </div>
                <span className={`text-xs capitalize ${getStatusColor(t.status)}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
