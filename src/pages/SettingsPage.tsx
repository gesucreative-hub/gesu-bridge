import { useState, useEffect } from "react";
import { getSettings, setAdbPath, detectAdb, setScrcpyPath, detectScrcpy, parseError, type Settings } from "../api/bridge";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [adbInput, setAdbInput] = useState("");
  const [scrcpyInput, setScrcpyInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAdb, setIsSavingAdb] = useState(false);
  const [isSavingScrcpy, setIsSavingScrcpy] = useState(false);
  const [isDetectingAdb, setIsDetectingAdb] = useState(false);
  const [isDetectingScrcpy, setIsDetectingScrcpy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<"adb" | "scrcpy" | null>(null);
  
  // Update state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<{ version: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getSettings();
      setSettings(result);
      setAdbInput(result.adb_path ?? result.adb_resolved_path ?? "");
      setScrcpyInput(result.scrcpy_path ?? result.scrcpy_resolved_path ?? "");
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDetectAdb() {
    setIsDetectingAdb(true);
    setError(null);
    try {
      const detected = await detectAdb();
      if (detected) {
        setAdbInput(detected);
        await handleSaveAdb(detected);
      } else {
        setError("ADB not found. Please install Android SDK Platform Tools or set path manually.");
      }
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsDetectingAdb(false);
    }
  }

  async function handleDetectScrcpy() {
    setIsDetectingScrcpy(true);
    setError(null);
    try {
      const detected = await detectScrcpy();
      if (detected) {
        setScrcpyInput(detected);
        await handleSaveScrcpy(detected);
      } else {
        setError("scrcpy not found. Please install scrcpy or set path manually.");
      }
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsDetectingScrcpy(false);
    }
  }

  async function handleSaveAdb(pathOverride?: string) {
    const path = pathOverride ?? adbInput;
    setIsSavingAdb(true);
    setError(null);
    setSaveSuccess(null);
    try {
      const result = await setAdbPath(path || null);
      setSettings(result);
      setSaveSuccess("adb");
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsSavingAdb(false);
    }
  }

  async function handleSaveScrcpy(pathOverride?: string) {
    const path = pathOverride ?? scrcpyInput;
    setIsSavingScrcpy(true);
    setError(null);
    setSaveSuccess(null);
    try {
      const result = await setScrcpyPath(path || null);
      setSettings(result);
      setSaveSuccess("scrcpy");
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsSavingScrcpy(false);
    }
  }

  async function checkForUpdates() {
    setIsCheckingUpdate(true);
    setUpdateError(null);
    setUpdateAvailable(null);
    try {
      const update = await check();
      if (update) {
        setUpdateAvailable({ version: update.version });
      }
    } catch (err) {
      setUpdateError(parseError(err));
    } finally {
      setIsCheckingUpdate(false);
    }
  }

  async function installUpdate() {
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        await relaunch();
      }
    } catch (err) {
      setUpdateError(parseError(err));
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <div className="text-surface-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-surface-100 mb-2">Settings</h1>
      <p className="text-surface-400 mb-6">
        Configure GesuBridge settings and tool paths.
      </p>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 text-error text-sm bg-error/10 border border-error/30 rounded-lg p-3 mb-6">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* ADB Configuration */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-surface-200">ADB Configuration</h2>
          <div className={`flex items-center gap-2 text-sm ${settings?.adb_available ? "text-success" : "text-error"}`}>
            <div className={`w-2 h-2 rounded-full ${settings?.adb_available ? "bg-success" : "bg-error"}`} />
            {settings?.adb_available ? "Available" : "Not Found"}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-2">ADB Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={adbInput}
                onChange={(e) => setAdbInput(e.target.value)}
                placeholder="Auto-detect or enter path..."
                className="flex-1 px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg 
                         text-surface-200 placeholder-surface-500 
                         focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              <button
                onClick={() => handleSaveAdb()}
                disabled={isSavingAdb}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 
                         text-white rounded-lg text-sm font-medium transition-colors cursor-pointer
                         disabled:cursor-not-allowed"
              >
                {isSavingAdb ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDetectAdb}
              disabled={isDetectingAdb}
              className="px-4 py-2 bg-surface-700 hover:bg-surface-600 disabled:bg-surface-800
                       text-surface-200 rounded-lg text-sm font-medium transition-colors cursor-pointer
                       disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDetectingAdb ? "Detecting..." : "Auto-Detect"}
            </button>
            {adbInput && (
              <button
                onClick={() => { setAdbInput(""); handleSaveAdb(""); }}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 
                         text-surface-400 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {settings?.adb_resolved_path && (
            <div className="text-xs text-surface-500 bg-surface-800/50 rounded-lg p-3 overflow-hidden">
              <span className="text-surface-400">Resolved path:</span>{" "}
              <code className="text-primary-400 break-all">{settings.adb_resolved_path}</code>
            </div>
          )}

          {saveSuccess === "adb" && (
            <div className="flex items-center gap-2 text-success text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              ADB settings saved!
            </div>
          )}
        </div>
      </div>

      {/* scrcpy Configuration */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-surface-200">scrcpy Configuration</h2>
          <div className={`flex items-center gap-2 text-sm ${settings?.scrcpy_available ? "text-success" : "text-error"}`}>
            <div className={`w-2 h-2 rounded-full ${settings?.scrcpy_available ? "bg-success" : "bg-error"}`} />
            {settings?.scrcpy_available ? "Available" : "Not Found"}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-2">scrcpy Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={scrcpyInput}
                onChange={(e) => setScrcpyInput(e.target.value)}
                placeholder="Auto-detect or enter path..."
                className="flex-1 px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg 
                         text-surface-200 placeholder-surface-500 
                         focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              <button
                onClick={() => handleSaveScrcpy()}
                disabled={isSavingScrcpy}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 
                         text-white rounded-lg text-sm font-medium transition-colors cursor-pointer
                         disabled:cursor-not-allowed"
              >
                {isSavingScrcpy ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDetectScrcpy}
              disabled={isDetectingScrcpy}
              className="px-4 py-2 bg-surface-700 hover:bg-surface-600 disabled:bg-surface-800
                       text-surface-200 rounded-lg text-sm font-medium transition-colors cursor-pointer
                       disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDetectingScrcpy ? "Detecting..." : "Auto-Detect"}
            </button>
            {scrcpyInput && (
              <button
                onClick={() => { setScrcpyInput(""); handleSaveScrcpy(""); }}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 
                         text-surface-400 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {settings?.scrcpy_resolved_path && (
            <div className="text-xs text-surface-500 bg-surface-800/50 rounded-lg p-3 overflow-hidden">
              <span className="text-surface-400">Resolved path:</span>{" "}
              <code className="text-primary-400 break-all">{settings.scrcpy_resolved_path}</code>
            </div>
          )}

          {saveSuccess === "scrcpy" && (
            <div className="flex items-center gap-2 text-success text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              scrcpy settings saved!
            </div>
          )}
        </div>
      </div>

      {/* Updates Section */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-6 mt-6">
        <h2 className="text-lg font-semibold text-surface-100 mb-4">Updates</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-300 text-sm">Current version</p>
              <p className="text-surface-100 font-medium">v0.5.0</p>
            </div>
            <button
              onClick={checkForUpdates}
              disabled={isCheckingUpdate || isUpdating}
              className="px-4 py-2 bg-surface-700 hover:bg-surface-600 
                       text-surface-200 rounded-lg text-sm font-medium 
                       transition-colors cursor-pointer disabled:opacity-50"
            >
              {isCheckingUpdate ? "Checking..." : "Check for Updates"}
            </button>
          </div>

          {updateError && (
            <div className="bg-error/10 border border-error/30 rounded-lg p-3">
              <p className="text-error text-sm">{updateError}</p>
            </div>
          )}

          {updateAvailable && (
            <div className="bg-primary-600/10 border border-primary-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-400 font-medium">
                    Update available: v{updateAvailable.version}
                  </p>
                  <p className="text-surface-500 text-sm">
                    A new version is ready to install
                  </p>
                </div>
                <button
                  onClick={installUpdate}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 
                           text-white rounded-lg text-sm font-medium 
                           transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? "Installing..." : "Install & Restart"}
                </button>
              </div>
            </div>
          )}

          {!updateAvailable && !updateError && !isCheckingUpdate && (
            <p className="text-surface-500 text-sm">
              Click "Check for Updates" to see if a new version is available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
