import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ShieldAlert,
} from "lucide-react";

export default function AgentDecision({ decision }) {
  if (!decision) {
    return (
      <div className="agent-decision-card">
        <div className="agent-decision-empty">
          No care decision has been generated yet.
        </div>
      </div>
    );
  }

  const action =
    decision.decisionType ||
    decision.recommendedAction ||
    "No action";

  const priority =
    decision.priority || "normal";

  const riskLevel =
    decision.riskLevel || "unknown";

  const interval =
    decision.recommendedFollowUpIntervalDays ??
    decision.followUpIntervalDays;

  const formatAction = (value) =>
    String(value)
      .replaceAll("_", " ")
      .replace(/^./, (char) =>
        char.toUpperCase()
      );

  return (
    <div className="agent-decision-card">
      <div className="section-heading">
        <div>
          <div className="section-eyebrow">
            CARE DECISION
          </div>

          <h2>Agent decision</h2>
        </div>

        <div className="decision-status">
          <CheckCircle2 size={15} />
          {decision.status || "Applied"}
        </div>
      </div>

      <div className="decision-main">
        <div className="decision-icon">
          <ShieldAlert size={20} />
        </div>

        <div className="decision-action">
          <span className="decision-label">
            RECOMMENDED ACTION
          </span>

          <strong>
            {formatAction(action)}
          </strong>

          {decision.assessment && (
            <p>{decision.assessment}</p>
          )}
        </div>
      </div>

      <div className="decision-details">
        <div className="decision-detail">
          <span>Risk level</span>
          <strong className={riskLevel.toLowerCase()}>
            {riskLevel}
          </strong>
        </div>

        <div className="decision-detail">
          <span>Priority</span>
          <strong className={priority.toLowerCase()}>
            {priority}
          </strong>
        </div>

        {interval !== undefined && (
          <div className="decision-detail">
            <span>Follow-up</span>
            <strong>
              {interval} days
            </strong>
          </div>
        )}
      </div>

      {decision.ashaMessage && (
        <div className="decision-message">
          <div className="decision-label">
            ASHA WORKER INSTRUCTION
          </div>

          <p>{decision.ashaMessage}</p>
        </div>
      )}

      {decision.executedAt && (
        <div className="decision-execution">
          <CheckCircle2 size={14} />

          <span>
            Decision executed successfully
          </span>

          <Clock3 size={13} />

          <span>
            {new Date(
              decision.executedAt
            ).toLocaleString()}
          </span>
        </div>
      )}

      <div className="decision-flow">
        <span>Patient data</span>

        <ArrowRight size={14} />

        <span>AI reasoning</span>

        <ArrowRight size={14} />

        <strong>
          {formatAction(action)}
        </strong>
      </div>
    </div>
  );
}