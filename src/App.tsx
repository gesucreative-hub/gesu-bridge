import { useState } from "react";
import { Sidebar, type PageId } from "./ui/layout/Sidebar";
import { DevicesPage, MirrorPage, TransferPage, MediaPreviewerPage, BluetoothPage, SettingsPage } from "./pages";
import "./styles/index.css";

function App() {
  const [currentPage, setCurrentPage] = useState<PageId>("devices");

  function renderPage() {
    switch (currentPage) {
      case "devices":
        return <DevicesPage />;
      case "mirror":
        return <MirrorPage />;
      case "transfer":
        return <TransferPage />;
      case "media":
        return <MediaPreviewerPage />;
      case "bluetooth":
        return <BluetoothPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DevicesPage />;
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 p-8 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;

