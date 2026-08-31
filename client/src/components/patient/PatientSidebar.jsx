import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  MessageCircle,
  HeartPulse,
  Clock3,
  Pill,
  UserRound,
  Activity,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/patient/home" },
  { label: "Ask Vaidya", icon: MessageCircle, path: "/patient/chat" },
  { label: "My Health", icon: HeartPulse, path: "/patient/health" },
  { label: "Timeline", icon: Clock3, path: "/patient/timeline" },
  { label: "Medications", icon: Pill, path: "/patient/medications" },
  { label: "Profile", icon: UserRound, path: "/patient/profile" },
];

export default function PatientSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="patient-sidebar">
      <div className="p-sidebar-brand">
        <img
          src="/images/sanjeevani-blue.png"
          alt="Sanjeevani"
          style={{ width: 54, height: 54, objectFit: "contain", borderRadius: 14 }}
        />
        <div>
          <div className="p-brand-name">Vaidya</div>
          <div className="p-brand-sub">
            YOUR HEALTH COMPANION
          </div>
        </div>
      </div>

      <nav className="p-sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              type="button"
              className={`p-nav-item ${active ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <Icon size={17} strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-sidebar-footer">
        <div className="p-footer-brand">
          <img
            src="/images/sanjeevani-blue.png"
            alt=""
            style={{ width: 20, height: 20, objectFit: "contain", opacity: 0.5, borderRadius: 4 }}
          />
          <div>
            <div className="p-footer-name">Sanjeevani</div>
            <div className="p-footer-sub">Life-giving care</div>
          </div>
        </div>
      </div>

      <style>{`
        .patient-sidebar {
          width: 248px;
          min-height: 100vh;
          background: #051815;
          color: #F0F4F8;
          display: flex;
          flex-direction: column;
          padding: 25px 15px 18px;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 20;
        }

        .p-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 3px 10px 32px;
        }

        .p-brand-icon {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--green-light);
          color: var(--green);
        }

        .p-brand-name {
          font-family: "Manrope", sans-serif;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.4px;
        }

        .p-brand-sub {
          margin-top: 2px;
          font-size: 9px;
          color: #64748B;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .p-sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .p-nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 11px;
          border-radius: 9px;
          color: #64748B;
          background: transparent;
          text-align: left;
          font-size: 13px;
          font-weight: 500;
          transition: background 0.18s ease, color 0.18s ease;
        }

        .p-nav-item:hover {
          color: #F0F4F8;
          background: rgba(20, 184, 166, 0.08);
        }

        .p-nav-item.active {
          color: #F0F4F8;
          background: rgba(20, 184, 166, 0.15);
        }

        .p-nav-item.active svg {
          color: #14B8A6;
        }

        .p-sidebar-footer {
          margin-top: auto;
          padding: 16px 10px 0;
          border-top: 1px solid rgba(20, 184, 166, 0.12);
        }

        .p-footer-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748B;
        }

        .p-footer-name {
          font-size: 10px;
          font-weight: 600;
          color: #64748B;
        }

        .p-footer-sub {
          font-size: 9px;
          color: #64748B;
        }

        @media (max-width: 900px) {
          .patient-sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
