import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";

export default function CarePlanCard({ carePlan }) {
  if (!carePlan) {
    return (
      <div className="care-plan-card">
        <div className="care-plan-empty">
          <ClipboardList size={18} />
          <span>No active care plan found.</span>
        </div>
      </div>
    );
  }

  const {
    status,
    priority,
    careState,
    trajectoryStatus,
    riskScore,
    followUp,
    instructions = [],
    ashaMessage,
    reasoning,
    version,
    lastReviewedAt,
  } = carePlan;

  const formatValue = (value) =>
    String(value || "")
      .replaceAll("_", " ")
      .replace(/^./, (char) =>
        char.toUpperCase()
      );

  const nextFollowUp = followUp?.nextFollowUpAt
    ? new Date(
        followUp.nextFollowUpAt
      ).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="care-plan-card">
      <div className="section-heading">
        <div>
          <div className="section-eyebrow">
            ACTIVE CARE PLAN
          </div>

          <h2>Current care plan</h2>
        </div>

        <div
          className={`care-plan-status ${status}`}
        >
          <CheckCircle2 size={14} />
          {formatValue(status)}
        </div>
      </div>

      <div className="care-plan-summary">
        <div className="care-plan-summary-item">
          <span>Care state</span>
          <strong>
            {formatValue(careState)}
          </strong>
        </div>

        <div className="care-plan-summary-item">
          <span>Trajectory</span>
          <strong
            className={trajectoryStatus}
          >
            {formatValue(trajectoryStatus)}
          </strong>
        </div>

        <div className="care-plan-summary-item">
          <span>Priority</span>
          <strong className={priority}>
            {formatValue(priority)}
          </strong>
        </div>

        <div className="care-plan-summary-item">
          <span>Risk score</span>
          <strong>
            {riskScore ?? 0}
            <small>/100</small>
          </strong>
        </div>
      </div>

      <div className="care-plan-followup">
        <div className="care-plan-followup-icon">
          <CalendarClock size={18} />
        </div>

        <div>
          <span>FOLLOW-UP</span>

          <strong>
            {followUp?.required
              ? `Every ${
                  followUp.intervalDays
                } days`
              : "Not currently required"}
          </strong>

          {nextFollowUp && (
            <small>
              Next visit: {nextFollowUp}
            </small>
          )}
        </div>
      </div>

      {instructions.length > 0 && (
        <div className="care-plan-instructions">
          <div className="care-plan-label">
            CARE INSTRUCTIONS
          </div>

          <ul>
            {instructions.map(
              (instruction, index) => (
                <li key={index}>
                  {typeof instruction ===
                  "string"
                    ? instruction
                    : instruction?.text ||
                      JSON.stringify(
                        instruction
                      )}
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {ashaMessage && (
        <div className="care-plan-message">
          <div className="care-plan-label">
            ASHA WORKER MESSAGE
          </div>

          <p>{ashaMessage}</p>
        </div>
      )}

      {reasoning && (
        <div className="care-plan-reasoning">
          <div className="care-plan-label">
            WHY THIS PLAN
          </div>

          <p>{reasoning}</p>
        </div>
      )}

      <div className="care-plan-footer">
        <span>
          Plan v{version || 1}
        </span>

        {lastReviewedAt && (
          <span>
            Reviewed{" "}
            {new Date(
              lastReviewedAt
            ).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}