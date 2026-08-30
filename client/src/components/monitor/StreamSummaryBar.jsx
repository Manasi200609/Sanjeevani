import { Users, AlertTriangle, CalendarClock, ShieldAlert, Activity, Clock3 } from "lucide-react";
import { useLanguage } from "../../services/LanguageContext";

const STAT_ITEMS = [
  { key: "totalPatients", labelKey: "dashboard.totalPatients", fallback: "patients", icon: Users, color: "var(--teal)" },
  { key: "needsAttention", labelKey: "dashboard.needsAttention", fallback: "attention", icon: AlertTriangle, color: "var(--amber)" },
  { key: "followUpsDue", labelKey: "dashboard.followUpsDue", fallback: "due soon", icon: CalendarClock, color: "var(--teal)" },
  { key: "urgentCases", labelKey: "dashboard.urgentCases", fallback: "urgent", icon: ShieldAlert, color: "var(--coral)" },
];

export default function StreamSummaryBar({
  stats = {},
  agentStatus = "active",
  lastCheck = null,
}) {
  const { t } = useLanguage();
  const formatTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="stream-summary-bar">
      <div className="summary-stats-row">
        {STAT_ITEMS.map(({ key, labelKey, fallback, icon: Icon, color }) => (
          <div key={key} className="summary-stat">
            <div className="summary-stat-icon" style={{ color }}>
              <Icon size={15} />
            </div>
            <div className="summary-stat-value">
              {stats[key] ?? 0}
            </div>
            <div className="summary-stat-label">{t(labelKey) || fallback}</div>
          </div>
        ))}
      </div>

      <div className="summary-status-row">
        <div className="summary-live-dot" />
        <span className="summary-status-text">
          CareFlow {agentStatus === "active" ? "Active" : agentStatus === "processing" ? "Processing" : "Idle"}
        </span>
        {lastCheck && (
          <span className="summary-last-check">
            <Clock3 size={11} /> Last checked {formatTime(lastCheck)}
          </span>
        )}
      </div>

      <style>{`
        .stream-summary-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 14px 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .summary-stats-row {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .summary-stat {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .summary-stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .summary-stat-value {
          font-family: "Manrope", sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
        }

        .summary-stat-label {
          font-size: 10px;
          color: var(--muted);
          font-weight: 500;
          margin-left: -2px;
        }

        .summary-status-row {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-shrink: 0;
        }

        .summary-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #0E8C7C;
          box-shadow: 0 0 0 3px rgba(14, 140, 124, 0.2);
          animation: summary-pulse 2s ease-in-out infinite;
        }

        .summary-status-text {
          font-size: 10px;
          font-weight: 600;
          color: var(--teal);
          letter-spacing: 0.3px;
        }

        .summary-last-check {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          color: var(--muted);
          margin-left: 6px;
        }

        @keyframes summary-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 900px) {
          .stream-summary-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .summary-stats-row {
            justify-content: space-between;
          }
          .summary-status-row {
            justify-content: center;
          }
        }

        @media (max-width: 600px) {
          .summary-stats-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
