import AgentStatus from "./AgentStatus";
import AgentSteps from "./AgentSteps";
import AgentReasoning from "./AgentReasoning";
import AgentDecision from "./AgentDecision";

export default function AgentRun({ run }) {
  if (!run) {
    return (
      <div className="agent-run-empty">
        <p>No agent run available for this patient.</p>
      </div>
    );
  }

  return (
    <div className="agent-run-container">
      <AgentStatus
        status={run.status}
        trigger={run.trigger}
        startedAt={run.startedAt}
        completedAt={run.completedAt}
        durationMs={run.durationMs}
      />

      <section className="agent-run-section">
        <div className="section-eyebrow">
          AUTONOMOUS LOOP
        </div>

        <h2>What Sanjeevani did</h2>

        <AgentSteps
          steps={run.steps || []}
        />
      </section>

      <AgentReasoning
        analysis={run.aiAnalysis}
      />

      <AgentDecision
        decision={run.decision || {
          decisionType:
            run.aiAnalysis?.recommendedAction,
          riskLevel:
            run.aiAnalysis?.riskLevel,
          priority:
            run.aiAnalysis?.priority,
          followUpIntervalDays:
            run.aiAnalysis?.followUpIntervalDays,
          ashaMessage:
            run.aiAnalysis?.ashaMessage,
          status:
            run.status === "completed"
              ? "applied"
              : run.status,
        }}
      />
    </div>
  );
}