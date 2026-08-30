import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Brain,
  ShieldAlert,
} from "lucide-react";

export default function CareDecisionCard({
  decision,
}) {
  if (!decision) {
    return (
      <div className="care-decision-card">
        <div className="care-decision-empty">
          <Brain size={18} />
          <span>
            No care decision has been generated yet.
          </span>
        </div>
      </div>
    );
  }

  const decisionType =
    decision.decisionType ||
    decision.recommendedAction ||
    "maintain_followup";

  const riskLevel =
    decision.riskLevel || "unknown";

  const priority =
    decision.priority || "normal";

  const followUpDays =
    decision.recommendedFollowUpIntervalDays ??
    decision.followUpIntervalDays;

  const formatValue = (value) =>
    String(value || "")
      .replaceAll("_", " ")
      .replace(/^./, (char) =>
        char.toUpperCase()
      );

  const executed =
    decision.status === "applied" ||
    Boolean(decision.executedAt);

  return (
    <div className="care-decision-card">
      <div className="section-heading">
        <div>
          <div className="section-eyebrow">
            AGENT DECISION
          </div>

          <h2>Care decision</h2>
        </div>

        <div
          className={`care-decision-status ${
            executed ? "applied" : "proposed"
          }`}
        >
          {executed ? (
            <CheckCircle2 size={14} />
          ) : (
            <Clock3 size={14} />
          )}

          {executed
            ? "Applied"
            : "Proposed"}
        </div>
      </div>

      <div className="care-decision-action">
        <div className="care-decision-icon">
          <ShieldAlert size={20} />
        </div>

        <div>
          <span>
            RECOMMENDED ACTION
          </span>

          <strong>
            {formatValue(decisionType)}
          </strong>
        </div>
      </div>

      <div className="care-decision-grid">
        <div>
          <span>Risk</span>

          <strong className={riskLevel}>
            {formatValue(riskLevel)}
          </strong>
        </div>

        <div>
          <span>Priority</span>

          <strong className={priority}>
            {formatValue(priority)}
          </strong>
        </div>

        {followUpDays !== undefined && (
          <div>
            <span>Follow-up</span>

            <strong>
              {followUpDays} days
            </strong>
          </div>
        )}
      </div>

      {decision.keySignals?.length > 0 && (
        <div className="care-decision-signals">
          <span>KEY SIGNALS</span>

          <div>
            {decision.keySignals.map(
              (signal, index) => (
                <span
                  className="signal-tag"
                  key={`${signal}-${index}`}
                >
                  {signal}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {decision.ashaMessage && (
        <div className="care-decision-message">
          <span>
            ASHA WORKER INSTRUCTION
          </span>

          <p>
            {decision.ashaMessage}
          </p>
        </div>
      )}

      {decision.reasoning && (
        <div className="care-decision-reasoning">
          <span>AGENT REASONING</span>

          <p>
            {decision.reasoning}
          </p>
        </div>
      )}

      <div className="care-decision-footer">
        <div>
          {executed && (
            <>
              <CheckCircle2 size={14} />
              <span>
                Decision executed
              </span>
            </>
          )}
        </div>

        {decision.executedAt && (
          <span>
            {new Date(
              decision.executedAt
            ).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        )}

        {!decision.executedAt &&
          decision.createdAt && (
            <span>
              Created{" "}
              {new Date(
                decision.createdAt
              ).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          )}
      </div>

      <div className="care-decision-flow">
        <span>Observe</span>
        <ArrowRight size={13} />
        <span>Reason</span>
        <ArrowRight size={13} />
        <span>Plan</span>
        <ArrowRight size={13} />
        <strong>Execute</strong>
      </div>
    </div>
  );
}