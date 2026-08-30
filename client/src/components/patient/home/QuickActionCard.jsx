import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Clock3,
  Pill,
  CalendarClock,
  ArrowRight,
} from "lucide-react";

const ACTIONS = [
  {
    label: "Ask Vaidya",
    description: "Chat with your health assistant",
    icon: MessageCircle,
    path: "/patient/chat",
    color: "#22C55E",
    bg: "rgba(34, 197, 94, 0.12)",
  },
  {
    label: "Health Timeline",
    description: "View your health history",
    icon: Clock3,
    path: "/patient/timeline",
    color: "#14B8A6",
    bg: "rgba(20, 184, 166, 0.12)",
  },
  {
    label: "Medications",
    description: "Check your prescriptions",
    icon: Pill,
    path: "/patient/medications",
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.12)",
  },
  {
    label: "Follow-ups",
    description: "See upcoming appointments",
    icon: CalendarClock,
    path: "/patient/health",
    color: "#94A3B8",
    bg: "#123B35",
  },
];

export default function QuickActionCard() {
  const navigate = useNavigate();

  return (
    <div className="p-quick-actions">
      <div className="p-quick-grid">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              type="button"
              className="p-quick-item"
              onClick={() => navigate(action.path)}
            >
              <div
                className="p-quick-icon"
                style={{ background: action.bg, color: action.color }}
              >
                <Icon size={18} />
              </div>
              <div className="p-quick-body">
                <div className="p-quick-label">{action.label}</div>
                <div className="p-quick-desc">{action.description}</div>
              </div>
              <ArrowRight size={16} className="p-quick-arrow" />
            </button>
          );
        })}
      </div>

      <style>{`
        .p-quick-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .p-quick-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: #0D2E2A;
          border: 1px solid #1B453F;
          border-radius: 11px;
          text-align: left;
          cursor: pointer;
          transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .p-quick-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          border-color: #14B8A6;
        }

        .p-quick-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          flex-shrink: 0;
        }

        .p-quick-body {
          flex: 1;
          min-width: 0;
        }

        .p-quick-label {
          font-size: 12px;
          font-weight: 600;
          color: #F0F4F8;
        }

        .p-quick-desc {
          font-size: 10px;
          color: #64748B;
          margin-top: 2px;
        }

        .p-quick-arrow {
          color: #64748B;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }

        .p-quick-item:hover .p-quick-arrow {
          transform: translateX(2px);
          color: #14B8A6;
        }

        @media (max-width: 600px) {
          .p-quick-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
