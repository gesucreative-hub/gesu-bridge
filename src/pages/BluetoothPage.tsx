import { 
  openBluetoothSettings, 
  openBluetoothSend, 
  openBluetoothReceive 
} from "../api/bridge";

export function BluetoothPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-surface-100 mb-2">Bluetooth</h1>
      <p className="text-surface-400 mb-6">
        Transfer files wirelessly via Bluetooth.
      </p>

      {/* Action Buttons */}
      <div className="space-y-4 mb-8">
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center text-surface-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-surface-100">Send Files</h3>
              <p className="text-sm text-surface-500">Send files to a paired Bluetooth device</p>
            </div>
          </div>
          <button
            onClick={() => openBluetoothSend()}
            className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-500 
                     text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Open Send Dialog
          </button>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center text-surface-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-surface-100">Receive Files</h3>
              <p className="text-sm text-surface-500">Receive files from a Bluetooth device</p>
            </div>
          </div>
          <button
            onClick={() => openBluetoothReceive()}
            className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-500 
                     text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Open Receive Dialog
          </button>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center text-surface-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-surface-100">Bluetooth Settings</h3>
              <p className="text-sm text-surface-500">Pair devices and manage connections</p>
            </div>
          </div>
          <button
            onClick={() => openBluetoothSettings()}
            className="w-full px-4 py-3 bg-surface-700 hover:bg-surface-600 
                     text-surface-200 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Open Settings
          </button>
        </div>
      </div>

      {/* Limitations Notice */}
      <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className="text-sm font-medium text-surface-300">Note</h4>
        </div>
        <ul className="text-xs text-surface-500 space-y-1">
          <li>• Bluetooth transfer uses Windows built-in file transfer wizard</li>
          <li>• Your phone must be paired before sending/receiving</li>
          <li>• Transfer speed is slower than USB (typically 1-3 MB/s)</li>
          <li>• For faster transfers, use the Transfer page with USB</li>
        </ul>
      </div>
    </div>
  );
}
