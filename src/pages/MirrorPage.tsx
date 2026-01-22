import { useState, useEffect } from "react";
import { 
  listDevices, 
  getSettings, 
  startMirror, 
  stopMirror, 
  getMirrorSessions,
  startCamera,
  stopCamera,
  getCameraSessions,
  parseError,
  type Device, 
  type Settings,
  type MirrorSession,
  type CameraFacing,
  type CameraResolution
} from "../api/bridge";

type MirrorMode = 'screen' | 'camera';

export function MirrorPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [mirrorSessions, setMirrorSessions] = useState<MirrorSession[]>([]);
  const [cameraSessions, setCameraSessions] = useState<MirrorSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingSerial, setStartingSerial] = useState<string | null>(null);
  const [stoppingSerial, setStoppingSerial] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Mode and options
  const [mode, setMode] = useState<MirrorMode>('screen');
  const [screenOff, setScreenOff] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('back');
  const [cameraResolution, setCameraResolution] = useState<CameraResolution>('1280x720');
  const [muteAudio, setMuteAudio] = useState(true);
  const [cameraOrientation, setCameraOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    loadInitial();
    const interval = setInterval(refreshSessions, 2000);
    return () => clearInterval(interval);
  }, []);

  async function loadInitial() {
    setIsLoading(true);
    try {
      const [settingsResult, mirrorResult, cameraResult] = await Promise.all([
        getSettings(),
        getMirrorSessions(),
        getCameraSessions()
      ]);
      setSettings(settingsResult);
      setMirrorSessions(mirrorResult);
      setCameraSessions(cameraResult);

      if (settingsResult.adb_available) {
        const devicesResult = await listDevices();
        setDevices(devicesResult.filter(d => d.state === "ready"));
      }
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshSessions() {
    try {
      const [mirrorResult, cameraResult] = await Promise.all([
        getMirrorSessions(),
        getCameraSessions()
      ]);
      setMirrorSessions(mirrorResult);
      setCameraSessions(cameraResult);
    } catch {
      // Silently fail on polling
    }
  }

  async function handleStartMirror(serial: string) {
    setStartingSerial(serial);
    setError(null);
    try {
      if (mode === 'screen') {
        await startMirror(serial, screenOff);
      } else {
        await startCamera(serial, cameraFacing, cameraResolution, muteAudio, cameraOrientation);
      }
      await refreshSessions();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setStartingSerial(null);
    }
  }

  async function handleStopMirror(serial: string) {
    setStoppingSerial(serial);
    setError(null);
    try {
      if (mode === 'screen') {
        await stopMirror(serial);
      } else {
        await stopCamera(serial);
      }
      await refreshSessions();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setStoppingSerial(null);
    }
  }

  function isDeviceMirroring(serial: string): boolean {
    if (mode === 'screen') {
      return mirrorSessions.some(s => s.device_serial === serial);
    }
    return cameraSessions.some(s => s.device_serial === serial);
  }

  const activeSessions = mode === 'screen' ? mirrorSessions : cameraSessions;

  if (isLoading) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <div className="text-surface-400">Loading...</div>
      </div>
    );
  }

  if (!settings?.scrcpy_available) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-surface-100 mb-2">Mirror</h1>
        <p className="text-surface-400 mb-6">Mirror your device screen or camera.</p>
        <div className="bg-surface-900 border border-warning/30 rounded-xl p-8 text-center">
          <h2 className="text-lg font-medium text-surface-200 mb-2">scrcpy Not Configured</h2>
          <p className="text-sm text-surface-400">Configure scrcpy path in Settings.</p>
        </div>
      </div>
    );
  }

  if (!settings?.adb_available) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-surface-100 mb-2">Mirror</h1>
        <p className="text-surface-400 mb-6">Mirror your device screen or camera.</p>
        <div className="bg-surface-900 border border-warning/30 rounded-xl p-8 text-center">
          <h2 className="text-lg font-medium text-surface-200 mb-2">ADB Not Configured</h2>
          <p className="text-sm text-surface-400">Configure ADB path in Settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-surface-100 mb-2">Mirror</h1>
      <p className="text-surface-400 mb-6">Mirror your device screen or camera.</p>

      {/* Error */}
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 mb-6">
        <label className="block text-sm font-medium text-surface-400 mb-3">Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('screen')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'screen' 
                ? 'bg-primary-600 text-white' 
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Screen
          </button>
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'camera' 
                ? 'bg-primary-600 text-white' 
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Camera
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 mb-6">
        {mode === 'screen' ? (
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-surface-200">Turn off phone screen</span>
              <p className="text-xs text-surface-500">Keep device screen off while mirroring</p>
            </div>
            <button
              onClick={() => setScreenOff(!screenOff)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                screenOff ? "bg-primary-600" : "bg-surface-700"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                screenOff ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-2">Camera</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCameraFacing('front')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    cameraFacing === 'front' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                  }`}
                >
                  Front
                </button>
                <button
                  onClick={() => setCameraFacing('back')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    cameraFacing === 'back' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                  }`}
                >
                  Back
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-2">Resolution</label>
              <select
                value={cameraResolution}
                onChange={(e) => setCameraResolution(e.target.value as CameraResolution)}
                className="w-full px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg 
                         text-surface-200 focus:outline-none focus:border-primary-500"
              >
                <option value="640x480">480p (640×480)</option>
                <option value="1280x720">720p (1280×720)</option>
                <option value="1920x1080">1080p (1920×1080)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-2">Orientation</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCameraOrientation('portrait')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    cameraOrientation === 'portrait' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                  }`}
                >
                  {/* Portrait phone icon */}
                  <svg className="w-5 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="3" width="12" height="18" rx="2" strokeWidth={2} />
                    <circle cx="12" cy="18" r="1" fill="currentColor" />
                  </svg>
                  Portrait
                </button>
                <button
                  onClick={() => setCameraOrientation('landscape')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    cameraOrientation === 'landscape' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                  }`}
                >
                  {/* Landscape phone icon */}
                  <svg className="w-6 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth={2} />
                    <circle cx="18" cy="12" r="1" fill="currentColor" />
                  </svg>
                  Landscape
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-surface-800">
              <div>
                <span className="font-medium text-surface-200">Mute audio</span>
                <p className="text-xs text-surface-500">Disable microphone audio forwarding</p>
              </div>
              <button
                onClick={() => setMuteAudio(!muteAudio)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  muteAudio ? "bg-primary-600" : "bg-surface-700"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  muteAudio ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-surface-300 mb-3">
            Active {mode === 'screen' ? 'Mirror' : 'Camera'} Sessions
          </h3>
          <div className="space-y-2">
            {activeSessions.map(session => {
              const device = devices.find(d => d.serial === session.device_serial);
              return (
                <div key={session.device_serial} 
                     className="bg-primary-600/10 border border-primary-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                    <div>
                      <span className="font-medium text-surface-100">
                        {device?.model || session.device_serial}
                      </span>
                      <span className="text-xs text-surface-500 ml-2">
                        {mode === 'screen' ? 'Mirroring' : 'Camera'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStopMirror(session.device_serial)}
                    disabled={stoppingSerial === session.device_serial}
                    className="px-4 py-2 bg-error/20 hover:bg-error/30 text-error 
                             rounded-lg text-sm font-medium transition-colors cursor-pointer
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {stoppingSerial === session.device_serial ? "Stopping..." : "Stop"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Device List */}
      {devices.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-surface-300 mb-3">Available Devices</h3>
          <div className="space-y-2">
            {devices.map(device => {
              const isActive = isDeviceMirroring(device.serial);
              const isStarting = startingSerial === device.serial;
              
              return (
                <div key={device.serial} 
                     className="bg-surface-900 border border-surface-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center text-surface-400">
                      {mode === 'screen' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-surface-100">{device.model || device.serial}</span>
                      <div className="text-xs text-surface-500">
                        {device.manufacturer && <span>{device.manufacturer}</span>}
                      </div>
                    </div>
                  </div>
                  
                  {isActive ? (
                    <span className="text-xs text-primary-400 px-3 py-1 bg-primary-500/20 rounded-full">
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleStartMirror(device.serial)}
                      disabled={isStarting}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-500 
                               text-white rounded-lg text-sm font-medium transition-colors cursor-pointer
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isStarting ? "Starting..." : mode === 'screen' ? "Start Mirror" : "Start Camera"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-8 text-center">
          <h2 className="text-lg font-medium text-surface-300 mb-2">No devices ready</h2>
          <p className="text-sm text-surface-500">Connect your Android device via USB.</p>
        </div>
      )}
    </div>
  );
}
