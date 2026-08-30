import {
  Activity,
  CheckCircle2,
  Clock3,
  AlertCircle,
} from "lucide-react";

export default function AgentStatus({
  status = "idle",
  trigger = "manual",
  startedAt,
  completedAt,
  durationMs,
}) {
  const normalizedStatus =
    String(status).toLowerCase();

  const statusConfig = {
    completed: {
      label: "Completed",
      className: "completed",
      icon: CheckCircle2,
    },
    running: {
      label: "Running",
      className: "running",
      icon: Activity,
    },
    failed: {
      label: "Failed",
      className: "failed",
      icon: AlertCircle,
    },
    pending: {
      label: "Pending",
      className: "pending",
      icon: Clock3,
    },
    idle: {
      label: "Idle",
      className: "idle",
      icon: Clock3,
    },
  };

  const config =
    statusConfig[normalizedStatus] ||
    statusConfig.idle;

  const Icon = config.icon;

  const formatDuration = (value) => {
    if (
      value === undefined ||
      value === null
    ) {
      return null;
    }

    if (value < 1000) {
      return `${value} ms`;
    }

    return `${(value / 1000).toFixed(1)} sec`;
  };

  const formatTime = (value) => {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="agent-status-card">
      <div className="agent-status-header">
        <div>
          <div className="section-eyebrow">
            AGENT STATUS
          </div>

          <h2>CareFlow agent</h2>
        </div>

        <div
          className={`agent-status-badge ${config.className}`}
        >
          <Icon size={15} />
          {config.label}
        </div>
      </div>

      <div className="agent-status-grid">
        <div className="agent-status-item">
          <span>Trigger</span>
          <strong>
            {String(trigger).replaceAll("_", " ")}
          </strong>
        </div>

        {startedAt && (
          <div className="agent-status-item">
            <span>Started</span>
            <strong>
              {formatTime(startedAt)}
            </strong>
          </div>
        )}

        {completedAt && (
          <div className="agent-status-item">
            <span>Completed</span>
            <strong>
              {formatTime(completedAt)}
            </strong>
          </div>
        )}

        {durationMs !== undefined &&
          durationMs !== null && (
            <div className="agent-status-item">
              <span>Duration</span>
              <strong>
                {formatDuration(durationMs)}
              </strong>
            </div>
          )}
      </div>
    </div>
  );
}