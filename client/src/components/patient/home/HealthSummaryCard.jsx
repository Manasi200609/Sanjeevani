import {
  HeartPulse,
  CalendarClock,
  Pill,
  Activity,
} from "lucide-react";

const DEMO_ITEMS = [
  {
    icon: HeartPulse,
    label: "Current Status",
    value: "Stable",
    color: "var(--green)",
    bg: "var(--green-light)",
  },
  {
    icon: CalendarClock,
    label: "Next Follow-up",
    value: "In 3 days",
    color: "var(--teal)",
    bg: "var(--teal-light)",
  },
  {
    icon: Pill,
    label: "Medication",
    value: "On track",
    color: "var(--green)",
    bg: "var(--green-light)",
  },
  {
    icon: Activity,
    label: "Recent Update",
    value: "2 days ago",
    color: "var(--muted)",
    bg: "var(--bg-elevated)",
  },
];

export default function HealthSummaryCard() {
  return (
    <div className="p-health-summary">
      <div className="p-health-grid">
        {DEMO_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="p-health-item">
              <div
                className="p-health-icon"
                style={{ background: item.bg, color: item.color }}
              >
                <Icon size={18} />
              </div>
              <div className="p-health-label">{item.label}</div>
              <div className="p-health-value">{item.value}</div>
            </div>
          );
        })}
      </div>

      <style>{`
        .p-health-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .p-health-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          padding: 18px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          transition: box-shadow 0.2s ease;
        }

        .p-health-item:hover {
          box-shadow: var(--shadow-sm);
        }

        .p-health-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
        }

        .p-health-label {
          color: var(--muted);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }

        .p-health-value {
          font-family: "Manrope", sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
        }

        @media (max-width: 700px) {
          .p-health-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 480px) {
          .p-health-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
