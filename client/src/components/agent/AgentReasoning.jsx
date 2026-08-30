import { Brain, AlertTriangle } from "lucide-react";

export default function AgentReasoning({ analysis }) {
  if (!analysis) {
    return (
      <div className="agent-reasoning-card">
        <div className="agent-reasoning-empty">
          <Brain size={18} />
          <span>No AI reasoning available yet.</span>
        </div>
      </div>
    );
  }

  const {
    assessment,
    riskLevel,
    keySignals = [],
    reasoning,
    recommendedAction,
    followUpIntervalDays,
  } = analysis;

  return (
    <div className="agent-reasoning-card">
      <div className="section-heading">
        <div>
          <div className="section-eyebrow">
            AGENT REASONING
          </div>

          <h2>Why CareFlow acted</h2>
        </div>

        <div
          className={`reasoning-risk ${riskLevel?.toLowerCase()}`}
        >
          <AlertTriangle size={14} />
          {riskLevel || "Unknown"} risk
        </div>
      </div>

      <div className="reasoning-assessment">
        <div className="reasoning-label">
          ASSESSMENT
        </div>

        <p>{assessment}</p>
      </div>

      {keySignals.length > 0 && (
        <div className="reasoning-signals">
          <div className="reasoning-label">
            KEY SIGNALS
          </div>

          <div className="signal-list">
            {keySignals.map((signal, index) => (
              <div
                className="signal-item"
                key={`${signal}-${index}`}
              >
                <span className="signal-dot" />
                {signal}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="reasoning-action">
        <div>
          <div className="reasoning-label">
            RECOMMENDED ACTION
          </div>

          <strong>
            {recommendedAction
              ?.replaceAll("_", " ")
              .replace(/^./, (char) =>
                char.toUpperCase()
              )}
          </strong>
        </div>

        {followUpIntervalDays && (
          <div className="reasoning-followup">
            <span>Follow-up interval</span>
            <strong>
              {followUpIntervalDays} days
            </strong>
          </div>
        )}
      </div>

      {reasoning && (
        <div className="reasoning-explanation">
          <div className="reasoning-label">
            REASONING
          </div>

          <p>{reasoning}</p>
        </div>
      )}
    </div>
  );
}