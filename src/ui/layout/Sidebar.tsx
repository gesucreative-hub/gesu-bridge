import { type ReactNode, useState, useEffect } from "react";
import { ping } from "../../api/bridge";
import appIcon from "../../assets/app-icon.svg";

export type PageId = "devices" | "mirror" | "transfer" | "bluetooth" | "settings";

interface NavItem {
  id: PageId;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  {
    id: "devices",
    label: "Devices",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: "mirror",
    label: "Mirror",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: "transfer",
    label: "Transfer",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
    ),
  },
  {
    id: "bluetooth",
    label: "Bluetooth",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 2l4 4-4 4m0-8v16m0 0l4-4-4-4m0 8l-4-4 4-4"
        />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Check backend connection on mount
    ping()
      .then((response) => {
        setIsConnected(response === "pong");
      })
      .catch(() => {
        setIsConnected(false);
      });
  }, []);

  return (
    <aside className="w-64 bg-surface-900 border-r border-surface-800 flex flex-col">
      {/* Logo / App Title */}
      <div className="h-16 flex items-center px-6 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src={appIcon} 
              alt="GesuBridge Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-semibold text-lg text-surface-100">
            GesuBridge
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-150 cursor-pointer
                    ${
                      isActive
                        ? "bg-primary-600/20 text-primary-400 border border-primary-500/30"
                        : "text-surface-400 hover:bg-surface-800 hover:text-surface-200 border border-transparent"
                    }
                  `}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-surface-800">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected === null 
              ? "bg-surface-600 animate-pulse" 
              : isConnected 
                ? "bg-success" 
                : "bg-error"
          }`} />
          <span className="text-xs text-surface-400">
            {isConnected === null ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <p className="text-xs text-surface-500 text-center">
          GesuBridge v0.4.0
        </p>
      </div>
    </aside>
  );
}
