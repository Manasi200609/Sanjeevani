import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const PAGE_MAP = {
  "/asha": "monitor",
  "/asha/dashboard": "monitor",
  "/asha/patients": "patients",
  "/asha/agent": "agent",
  "/asha/record": "record",
  "/asha/settings": "settings",
  "/dashboard": "monitor",
  "/patients": "patients",
  "/agent": "agent",
  "/record": "record",
  "/settings": "settings",
};

export default function AppLayout({ children }) {
  const location = useLocation();
  const path = location.pathname;

  // Detect current page from URL
  let currentPage = "monitor";
  if (path.startsWith("/asha/patients/") || path.startsWith("/patients/")) {
    currentPage = "patient";
  } else if (PAGE_MAP[path]) {
    currentPage = PAGE_MAP[path];
  }

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} />
      <div className="app-main">
        <Topbar currentPage={currentPage} />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
