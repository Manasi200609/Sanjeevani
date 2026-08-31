import { useNavigate } from "react-router-dom";
import {
  Activity,
  Users,
  Brain,
  ClipboardCheck,
  Settings as SettingsIcon,
} from "lucide-react";
import { useLanguage } from "../../services/LanguageContext";

const ROUTES = {
  monitor: "/asha",
  patients: "/asha/patients",
  record: "/asha/record",
  agent: "/asha/agent",
  settings: "/asha/settings",
};

export default function Sidebar({ currentPage }) {
  const navigate = useNavigate();
  const { t, profile } = useLanguage();
  const initials = (profile.name || "AW")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const navigationItems = [
    { label: "Monitor", icon: Activity, page: "monitor", live: true },
    { label: t("nav.patients"), icon: Users, page: "patients" },
    { label: t("nav.recordVisit"), icon: ClipboardCheck, page: "record" },
    { label: "Agent Log", icon: Brain, page: "agent" },
  ];

  const handleNavigate = (page) => {
    navigate(ROUTES[page] || "/");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img
          src="/images/sanjeevani-green.png"
          alt="Sanjeevani"
          style={{ width: 32, height: 32, objectFit: "contain" }}
        />
        <div className="brand-content">
          <div className="brand-name">Sanjeevani</div>
          <div className="brand-caption">{t("app.subtitle")}</div>
        </div>
      </div>

      <nav className="sidebar-navigation">
        <div className="sidebar-section-title">
          {t("nav.workspace")}
        </div>
        <div className="sidebar-menu">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPage === item.page ||
              (currentPage === "patient" &&
                item.page === "patients");
            return (
              <button
                key={item.page}
                type="button"
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                onClick={() => handleNavigate(item.page)}
              >
                <Icon size={18} strokeWidth={2} />
                <span>{item.label}</span>
                {item.live && (
                  <span style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "8px",
                    fontWeight: 700,
                    color: "var(--blue)",
                    letterSpacing: "0.5px",
                  }}>
                    <span style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "#0E8C7C",
                      boxShadow: "0 0 0 2px rgba(14,140,124,0.2)",
                    }} />
                    LIVE
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="sidebar-bottom">
        <button
          type="button"
          className={`sidebar-nav-item ${
            currentPage === "settings" ? "active" : ""
          }`}
          onClick={() => handleNavigate("settings")}
        >
          <SettingsIcon size={18} strokeWidth={2} />
          <span>{t("nav.settings")}</span>
        </button>
        <div className="sidebar-profile">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-info">
            <div className="profile-name">{profile.name}</div>
            <div className="profile-role">
              {t("nav.careCoordinator")}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
