import { useLocation } from "react-router-dom";
import { Search, Bell, ChevronDown, CalendarDays } from "lucide-react";
import { useLanguage } from "../../services/LanguageContext";

const pageTitles = {
  monitor: "Sanjeevani · Live Monitor",
  dashboard: "Sanjeevani · Live Monitor",
  patients: "topbar.patientManagement",
  patient: "topbar.patientDetails",
  agent: "topbar.agentActivity",
  settings: "topbar.settings",
  record: "topbar.patientManagement",
};

export default function Topbar() {
  const location = useLocation();
  const { t, profile } = useLanguage();
  const initials = (profile.name || "AW")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Derive page from URL
  const path = location.pathname;
  let currentPage = "monitor";
  if (path.startsWith("/asha/patients/") || path.startsWith("/patients/")) currentPage = "patient";
  else if (path === "/asha/patients" || path === "/patients") currentPage = "patients";
  else if (path === "/asha/agent" || path === "/agent") currentPage = "agent";
  else if (path === "/asha/settings" || path === "/settings") currentPage = "settings";
  else if (path === "/asha/record" || path === "/record") currentPage = "record";
  else if (path === "/asha" || path === "/asha/dashboard" || path === "/dashboard") currentPage = "monitor";

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-page-title">
          {t(
            pageTitles[currentPage] ||
              "topbar.careCoordination"
          )}
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-date">
          <CalendarDays size={16} />
          <span>{dateStr}</span>
        </div>
        <div className="topbar-search">
          <Search size={17} />
          <input
            type="text"
            placeholder={t("topbar.searchPlaceholder")}
          />
          <span className="search-shortcut">/</span>
        </div>
        <button
          type="button"
          className="topbar-icon-button"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="topbar-notification-dot" />
        </button>
        <button type="button" className="topbar-profile">
          <div className="topbar-avatar">{initials}</div>
          <div className="topbar-profile-info">
            <span className="topbar-profile-name">
              {profile.name}
            </span>
            <span className="topbar-profile-role">
              {t("nav.careCoordinator")}
            </span>
          </div>
          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}
