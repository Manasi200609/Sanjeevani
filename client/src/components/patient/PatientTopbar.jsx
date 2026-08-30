import { Bell, ChevronDown } from "lucide-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function PatientTopbar() {
  const greeting = getGreeting();

  return (
    <header className="p-topbar">
      <div className="p-topbar-left">
        <div className="p-topbar-greeting">
          {greeting}
        </div>
      </div>

      <div className="p-topbar-right">
        <button
          type="button"
          className="p-topbar-icon"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="p-topbar-dot" />
        </button>

        <button type="button" className="p-topbar-profile">
          <div className="p-topbar-avatar">P</div>
          <div className="p-topbar-profile-info">
            <span className="p-topbar-name">Patient</span>
            <span className="p-topbar-role">Health Portal</span>
          </div>
          <ChevronDown size={14} />
        </button>
      </div>

      <style>{`
        .p-topbar {
          position: fixed;
          top: 0;
          left: 248px;
          right: 0;
          height: 72px;
          padding: 0 36px;
          background: #051815;
          border-bottom: 1px solid #1B453F;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 100;
        }

        .p-topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .p-topbar-greeting {
          font-family: "Manrope", sans-serif;
          color: #F0F4F8;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }

        .p-topbar-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .p-topbar-icon {
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border-radius: 8px;
          background: transparent;
          color: #64748B;
        }

        .p-topbar-icon:hover {
          background: #0D2E2A;
        }

        .p-topbar-dot {
          position: absolute;
          width: 6px;
          height: 6px;
          top: 7px;
          right: 7px;
          border: 1px solid #051815;
          border-radius: 50%;
          background: #22C55E;
        }

        .p-topbar-profile {
          display: flex;
          align-items: center;
          gap: 9px;
          background: transparent;
          color: #64748B;
          text-align: left;
        }

        .p-topbar-avatar {
          width: 31px;
          height: 31px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.12);
          color: #22C55E;
          font-size: 11px;
          font-weight: 700;
        }

        .p-topbar-profile-info {
          display: flex;
          flex-direction: column;
        }

        .p-topbar-name {
          font-size: 11px;
          font-weight: 600;
          color: #F0F4F8;
        }

        .p-topbar-role {
          margin-top: 2px;
          font-size: 9px;
          color: #64748B;
        }

        @media (max-width: 900px) {
          .p-topbar {
            left: 0;
          }
        }

        @media (max-width: 700px) {
          .p-topbar {
            padding: 0 16px;
            height: 60px;
          }
          .p-topbar-profile-info {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
