import { useState, useEffect } from "react";
import { listDevices, getSettings, parseError, type Device, type DeviceState, type Settings } from "../api/bridge";

// State chip colors and labels
const stateConfig: Record<DeviceState, { color: string; bg: string; label: string }> = {
  ready: { color: "text-success", bg: "bg-success/20", label: "Ready" },
  unauthorized: { color: "text-warning", bg: "bg-warning/20", label: "Unauthorized" },
  offline: { color: "text-error", bg: "bg-error/20", label: "Offline" },
  unknown: { color: "text-surface-400", bg: "bg-surface-700", label: "Unknown" },
};

export function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    setIsLoading(true);
    try {
      const settingsResult = await getSettings();
      setSettings(settingsResult);
      
      if (settingsResult.adb_available) {
        await refreshDevices();
      }
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshDevices() {
    setIsRefreshing(true);
    setError(null);
    try {
      const result = await listDevices();
      setDevices(result);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsRefreshing(false);
    }
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <div className="text-surface-400">Loading...</div>
      </div>
    );
  }

  // Render ADB not configured state
  if (!settings?.adb_available) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-surface-100 mb-2">Devices</h1>
        <p className="text-surface-400 mb-6">
          Connect and manage your Android devices via USB.
        </p>

        <div className="bg-surface-900 border border-warning/30 rounded-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-surface-200 mb-2">ADB Not Configured</h2>
          <p className="text-sm text-surface-400 max-w-md mx-auto mb-4">
            ADB (Android Debug Bridge) is required to detect devices. Please configure the ADB path in Settings.
          </p>
          <p className="text-xs text-surface-500">
            Go to <span className="text-primary-400">Settings</span> → ADB Configuration → Auto-Detect or set path manually.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 mb-1">Devices</h1>
          <p className="text-surface-400 text-sm">
            {devices.length} device{devices.length !== 1 ? "s" : ""} connected
          </p>
        </div>
        <button
          onClick={refreshDevices}
          disabled={isRefreshing}
          className="px-4 py-2 bg-surface-800 hover:bg-surface-700 disabled:bg-surface-900
                   text-surface-200 rounded-lg text-sm font-medium transition-colors cursor-pointer
                   disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg 
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-error mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-error text-sm font-medium">Error loading devices</p>
            <p className="text-error/80 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Device List */}
      {devices.length > 0 ? (
        <div className="space-y-3">
          {devices.map((device) => {
            const config = stateConfig[device.state];
            return (
              <div
                key={device.serial}
                className="bg-surface-900 border border-surface-800 rounded-xl p-4 
                         hover:border-surface-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Device Icon */}
                    <div className="w-12 h-12 rounded-lg bg-surface-800 flex items-center justify-center">
                      <svg className="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    
                    {/* Device Info */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-surface-100">
                          {device.model || device.serial}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="text-xs text-surface-500 space-x-3">
                        <span>Serial: {device.serial}</span>
                        {device.manufacturer && <span>• {device.manufacturer}</span>}
                        {device.android_version && <span>• Android {device.android_version}</span>}
                      </div>
                    </div>
                  </div>

                  {/* State-specific guidance */}
                  {device.state === "unauthorized" && (
                    <div className="text-xs text-warning max-w-xs text-right">
                      Accept the RSA fingerprint dialog on your device
                    </div>
                  )}
                  {device.state === "offline" && (
                    <div className="text-xs text-error max-w-xs text-right">
                      Reconnect USB cable or check USB debugging
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-surface-300 mb-2">No devices connected</h2>
          <p className="text-sm text-surface-500 max-w-md mx-auto mb-4">
            Connect your Android device via USB and enable USB debugging to get started.
          </p>
          <div className="text-xs text-surface-600 space-y-1">
            <p>1. Enable Developer Options on your device</p>
            <p>2. Enable USB Debugging in Developer Options</p>
            <p>3. Connect via USB cable</p>
            <p>4. Accept the RSA fingerprint dialog on your device</p>
          </div>
        </div>
      )}
    </div>
  );
}
