import { Activity, Clock3, CheckCircle2, AlertTriangle, Loader } from "lucide-react";
import { useLanguage } from "../../services/LanguageContext";

const STATUS_CONFIG = {
  active: {
    icon: Activity,
    labelKey: "monitor.careflowActive",
    fallback: "Sanjeevani Active",
    dotColor: "#0E8C7C",
    textColor: "#0E8C7C",
    bgColor: "rgba(14, 140, 124, 0.08)",
  },
  processing: {
    icon: Loader,
    labelKey: "monitor.careflowProcessing",
    fallback: "Sanjeevani Processing",
    dotColor: "#B09238",
    textColor: "#B09238",
    bgColor: "rgba(176, 146, 56, 0.08)",
  },
  idle: {
    icon: Clock3,
    labelKey: "monitor.careflowIdle",
    fallback: "Sanjeevani Idle",
    dotColor: "#5A7A72",
    textColor: "#5A7A72",
    bgColor: "rgba(90, 122, 114, 0.06)",
  },
  error: {
    icon: AlertTriangle,
    labelKey: "monitor.careflowError",
    fallback: "Sanjeevani Error",
    dotColor: "#D4593A",
    textColor: "#D4593A",
    bgColor: "rgba(212, 89, 58, 0.08)",
  },
  healthy: {
    icon: CheckCircle2,
    labelKey: "monitor.allStableStatus",
    fallback: "All Stable",
    dotColor: "#2E7D5A",
    textColor: "#2E7D5A",
    bgColor: "rgba(46, 125, 90, 0.08)",
  },
};

export default function AgentStatusPulse({
  status = "active",
  patientCount = 0,
  lastCheck = null,
}) {
  const { t } = useLanguage();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const Icon = config.icon;

  const formatTime = (date) => {
    if (!date) return "Unknown";
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div
      className="agent-pulse"
      style={{
        background: config.bgColor,
        borderRadius: "11px",
        padding: "13px",
        margin: "0 4px 16px",
        border: "1px solid rgba(14, 140, 124, 0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: config.dotColor,
            boxShadow:
              status === "active" || status === "processing"
                ? `0 0 0 3px ${config.dotColor}33`
                : "none",
            animation:
              status === "active" || status === "processing"
                ? "pulse-dot 2s ease-in-out infinite"
                : "none",
          }}
        />
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: config.textColor,
            letterSpacing: "0.3px",
          }}
        >
          {t(config.labelKey) || config.fallback}
        </span>
      </div>

      {patientCount > 0 && (
        <div
          style={{
            fontSize: "10px",
            color: "#5A7A72",
            lineHeight: "1.5",
          }}
        >
          {t("monitor.monitoring")} {patientCount} patient{patientCount !== 1 ? "s" : ""}
        </div>
      )}

      {lastCheck && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "6px",
            fontSize: "9px",
            color: "#5A7A72",
          }}
        >
          <Clock3 size={10} />
          {t("monitor.lastCheck")}: {formatTime(lastCheck)}
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
