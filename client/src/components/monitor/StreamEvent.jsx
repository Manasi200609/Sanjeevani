import { useState } from "react";
import {
  Activity,
  Brain,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ChevronDown,
  ChevronRight,
  Eye,
  Play,
  MessageCircle,
  AlertTriangle,
  ShieldAlert,
  User,
  Wrench,
} from "lucide-react";

// ============================================================
// EVENT TYPE CONFIGURATION
// ============================================================

const EVENT_TYPES = {
  signal: {
    icon: AlertTriangle,
    label: "SIGNAL DETECTED",
    accentColor: "#B09238",
    bgColor: "var(--amber-bg); 0.06)",
  },
  tool: {
    icon: Wrench,
    label: "AGENT TOOL",
    accentColor: "#0E8C7C",
    bgColor: "var(--blue-bg); 0.06)",
  },
  reasoning: {
    icon: Brain,
    label: "AGENT REASONING",
    accentColor: "#0E8C7C",
    bgColor: "var(--blue-bg); 0.04)",
  },
  decision: {
    icon: CalendarClock,
    label: "DECISION MADE",
    accentColor: "#2E7D5A",
    bgColor: "var(--green-bg); 0.04)",
  },
  action: {
    icon: CheckCircle2,
    label: "ACTION EXECUTED",
    accentColor: "#2E7D5A",
    bgColor: "var(--green-bg); 0.04)",
  },
  followup: {
    icon: Clock3,
    label: "FOLLOW-UP DUE",
    accentColor: "#D4593A",
    bgColor: "var(--red-bg); 0.05)",
  },
  system: {
    icon: Activity,
    label: "SYSTEM CHECK",
    accentColor: "#5A7A72",
    bgColor: "rgba(100, 116, 139, 0.08); 0.04)",
  },
};

// ============================================================
// TIME FORMATTING
// ============================================================

const formatTimeAgo = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatFullDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// ============================================================
// FORMAT HELPER
// ============================================================

const fmt = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());

// ============================================================
// STREAM EVENT COMPONENT
// ============================================================

export default function StreamEvent({
  event,
  isLast = false,
  isFirst = false,
  showConnector = true,
}) {
  const [expanded, setExpanded] = useState(false);

  if (!event) return null;

  const config = EVENT_TYPES[event.type] || EVENT_TYPES.system;
  const Icon = config.icon;

  const hasExpandableContent =
    event.details ||
    event.expandedContent ||
    event.patientId ||
    event.agentRunId;

  return (
    <div className="stream-event-wrapper">
      {/* Connector line from previous event */}
      {showConnector && !isFirst && (
        <div className="stream-connector">
          <div className="stream-connector-line" />
        </div>
      )}

      <div
        className={`stream-event ${expanded ? "expanded" : ""}`}
        style={{
          borderLeftColor: config.accentColor,
        }}
        onClick={() => hasExpandableContent && setExpanded(!expanded)}
      >
        {/* Event header */}
        <div className="stream-event-header">
          <div className="stream-event-icon" style={{
            background: config.bgColor,
            color: config.accentColor,
          }}>
            <Icon size={15} />
          </div>

          <div className="stream-event-content">
            <div className="stream-event-meta">
              <span className="stream-event-type" style={{ color: config.accentColor }}>
                {config.label}
              </span>
              <span className="stream-event-time">
                {formatTimeAgo(event.timestamp)}
              </span>
            </div>

            <div className="stream-event-title">
              {event.title}
            </div>

            {event.subtitle && (
              <div className="stream-event-subtitle">
                {event.subtitle}
              </div>
            )}
          </div>

          {hasExpandableContent && (
            <div className="stream-event-expand">
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="stream-event-details">
            {/* Standard details list */}
            {event.details && event.details.length > 0 && (
              <div className="stream-details-list">
                {event.details.map((detail, i) => (
                  <div key={i} className="stream-detail-row">
                    {detail.icon && (
                      <span className="stream-detail-icon" style={{ color: config.accentColor }}>
                        {detail.icon}
                      </span>
                    )}
                    <span className="stream-detail-label">{detail.label}</span>
                    <span className="stream-detail-value">{detail.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Custom expanded content */}
            {event.expandedContent}

            {/* Action links */}
            <div className="stream-event-actions">
              {event.patientId && event.patientName && (
                <button
                  className="stream-action-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/asha/patients/${event.patientId}`;
                  }}
                >
                  <User size={12} /> View patient →
                </button>
              )}
              {event.agentRunId && (
                <button
                  className="stream-action-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = "/asha/agent";
                  }}
                >
                  <Brain size={12} /> View agent run →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .stream-event-wrapper {
          position: relative;
          margin-bottom: 14px;
        }

        .stream-connector {
          display: flex;
          justify-content: flex-start;
          padding-left: 30px;
          height: 1px;
        }

        .stream-connector-line {
          width: 1px;
          height: 14px;
          background: var(--border);
          opacity: 0.4;
        }

        .stream-event {
          position: relative;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-left: 3px solid;
          border-radius: 0 10px 10px 0;
          padding: 16px 18px;
          cursor: pointer;
          transition: box-shadow 0.2s ease, background 0.15s ease;
        }

        .stream-event:hover {
          box-shadow: 0 2px 8px rgba(15, 43, 38, 0.06);
          background: var(--bg-elevated);
        }

        .stream-event.expanded {
          background: var(--bg-elevated);
        }

        .stream-event-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .stream-event-icon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .stream-event-content {
          flex: 1;
          min-width: 0;
        }

        .stream-event-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .stream-event-type {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.8px;
        }

        .stream-event-time {
          font-size: 9px;
          color: var(--muted);
        }

        .stream-event-title {
          font-family: "Manrope", sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.4;
        }

        .stream-event-subtitle {
          margin-top: 3px;
          font-size: 11px;
          color: var(--muted);
          line-height: 1.5;
        }

        .stream-event-expand {
          color: var(--muted);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .stream-event-details {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #E6EDEB;
          animation: detailFadeIn 0.2s ease;
        }

        @keyframes detailFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .stream-details-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .stream-detail-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
        }

        .stream-detail-icon {
          flex-shrink: 0;
          display: flex;
        }

        .stream-detail-label {
          color: var(--muted);
          min-width: 100px;
          font-weight: 500;
        }

        .stream-detail-value {
          color: var(--text);
          font-weight: 600;
        }

        .stream-event-actions {
          display: flex;
          gap: 12px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid #E6EDEB;
        }

        .stream-action-link {
          display: flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          color: var(--teal);
          font-size: 10px;
          font-weight: 600;
          padding: 4px 0;
          transition: opacity 0.15s ease;
        }

        .stream-action-link:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
