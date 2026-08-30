import { useState } from "react";
import {
  Eye,
  Brain,
  CalendarClock,
  Play,
  MessageCircle,
  CheckCircle2,
  Clock3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ============================================================
// PIPELINE STEP CONFIGURATION
// ============================================================

const STEPS = [
  {
    key: "observe",
    label: "OBSERVE",
    icon: Eye,
    description: "Examined patient history and longitudinal context",
    color: "#0E8C7C",
  },
  {
    key: "reason",
    label: "REASON",
    icon: Brain,
    description: "Gemini analyzed trajectory and risk signals",
    color: "#2E7D5A",
  },
  {
    key: "plan",
    label: "PLAN",
    icon: CalendarClock,
    description: "Care decision generated based on analysis",
    color: "#B09238",
  },
  {
    key: "execute",
    label: "EXECUTE",
    icon: Play,
    description: "Care plan updated and actions executed",
    color: "#0E8C7C",
  },
  {
    key: "communicate",
    label: "COMMUNICATE",
    icon: MessageCircle,
    description: "Results communicated to care team",
    color: "#2E7D5A",
  },
];

// ============================================================
// FORMAT HELPERS
// ============================================================

const fmt = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());

const fmtDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// ============================================================
// EXTRACT STEP DETAILS FROM AGENT RUN
// ============================================================

function extractStepData(run) {
  const steps = run.steps || [];
  const analysis = run.aiAnalysis || {};
  const decisions = run.decisions || [];
  const decision = decisions.length > 0 ? decisions[0] : null;

  // Map backend step names to pipeline keys
  const stepMap = {};
  steps.forEach((s) => {
    const key = s.step?.toLowerCase();
    if (key) stepMap[key] = s;
  });

  const observeData = stepMap["observe"] || stepMap["observation"];
  const reasonData = stepMap["reason"] || stepMap["reasoning"];
  const planData = stepMap["plan"] || stepMap["planning"];
  const executeData = stepMap["execute"] || stepMap["execution"];
  const communicateData = stepMap["communicate"] || stepMap["communication"];

  return {
    observe: {
      completed: !!observeData,
      duration: observeData?.durationMs,
      details: observeData?.details
        ? [
            observeData.details.eventsAnalyzed !== undefined &&
              `${observeData.details.eventsAnalyzed} events examined`,
            observeData.details.trajectoryChange &&
              `Trajectory: ${fmt(observeData.details.trajectoryChange)}`,
            observeData.details.symptomsFound &&
              `${observeData.details.symptomsFound} symptoms identified`,
          ].filter(Boolean)
        : [
            analysis.riskLevel && `Risk level: ${fmt(analysis.riskLevel)}`,
          ].filter(Boolean),
    },
    reason: {
      completed: !!reasonData,
      duration: reasonData?.durationMs,
      details: [
        analysis.riskLevel && `Risk assessment: ${fmt(analysis.riskLevel)}`,
        analysis.recommendedAction && `Recommended: ${fmt(analysis.recommendedAction)}`,
        analysis.keySignals?.length > 0 &&
          `${analysis.keySignals.length} key signal${analysis.keySignals.length !== 1 ? "s" : ""} detected`,
      ].filter(Boolean),
    },
    plan: {
      completed: !!planData,
      duration: planData?.durationMs,
      details: [
        decision?.decisionType && `Decision: ${fmt(decision.decisionType)}`,
        decision?.priority && `Priority: ${fmt(decision.priority)}`,
        decision?.followUp?.intervalDays &&
          `Follow-up: every ${decision.followUp.intervalDays} days`,
      ].filter(Boolean),
    },
    execute: {
      completed: !!executeData,
      duration: executeData?.durationMs,
      details: executeData?.details?.actionsPerformed
        ? executeData.details.actionsPerformed.map((a) => `✓ ${fmt(a)}`)
        : run.status === "completed"
          ? ["Care plan updated"]
          : [],
    },
    communicate: {
      completed: !!communicateData,
      duration: communicateData?.durationMs,
      details: [
        analysis.ashaMessage && "ASHA worker notified",
        decision && "Decision communicated",
      ].filter(Boolean),
    },
  };
}

// ============================================================
// PIPELINE STEP COMPONENT
// ============================================================

function PipelineStep({ step, data, isLast, index }) {
  const Icon = step.icon;
  const isCompleted = data.completed;

  return (
    <div className="pipeline-step-group">
      <div className="pipeline-step">
        <div className="pipeline-step-icon-col">
          <div
            className={`pipeline-step-icon ${isCompleted ? "completed" : ""}`}
            style={{
              background: isCompleted ? step.color + "18" : "var(--surface)",
              color: isCompleted ? step.color : "#D0DED9",
              borderColor: isCompleted ? step.color + "40" : "var(--border)",
            }}
          >
            {isCompleted ? (
              <CheckCircle2 size={16} />
            ) : (
              <Icon size={16} />
            )}
          </div>
          {!isLast && <div className="pipeline-connector" />}
        </div>

        <div className="pipeline-step-body">
          <div className="pipeline-step-header">
            <span
              className="pipeline-step-label"
              style={{ color: isCompleted ? step.color : "#5A7A72" }}
            >
              {String(index + 1).padStart(2, "0")} {step.label}
            </span>
            {data.duration != null && (
              <span className="pipeline-step-duration">
                <Clock3 size={10} /> {data.duration}ms
              </span>
            )}
          </div>

          {data.details.length > 0 && (
            <div className="pipeline-step-details">
              {data.details.map((detail, i) => (
                <div key={i} className="pipeline-step-detail">
                  {detail}
                </div>
              ))}
            </div>
          )}

          {data.details.length === 0 && isCompleted && (
            <div className="pipeline-step-details">
              <div className="pipeline-step-detail" style={{ color: "var(--muted)" }}>
                {step.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AgentPipeline({ run, compact = false }) {
  const [expanded, setExpanded] = useState(!compact);

  if (!run) return null;

  const stepData = extractStepData(run);
  const completedCount = Object.values(stepData).filter((s) => s.completed).length;

  const patientName =
    run.patientId?.name || run.patientId?.patientCode || "Patient";
  const patientId = run.patientId?._id;

  return (
    <div className={`agent-pipeline ${compact ? "pipeline-compact" : ""}`}>
      {/* Header */}
      <div
        className="pipeline-header"
        onClick={() => compact && setExpanded(!expanded)}
        style={compact ? { cursor: "pointer" } : {}}
      >
        <div className="pipeline-header-left">
          <div className="pipeline-title-row">
            <span className="pipeline-eyebrow">CAREFLOW AGENT</span>
            <span className={`pipeline-status ${run.status === "completed" ? "completed" : run.status === "failed" ? "failed" : ""}`}>
              {run.status === "completed" ? "Completed" : fmt(run.status)}
            </span>
          </div>
          <div className="pipeline-subtitle">
            {patientName}
            {run.durationMs && (
              <span className="pipeline-total-time">
                · {run.durationMs}ms
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="pipeline-progress">
          <div className="pipeline-progress-bar">
            <div
              className="pipeline-progress-fill"
              style={{
                width: `${(completedCount / STEPS.length) * 100}%`,
              }}
            />
          </div>
          <span className="pipeline-progress-text">
            {completedCount}/{STEPS.length}
          </span>
        </div>

        {compact && (
          <div className="pipeline-expand-icon">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </div>

      {/* Pipeline steps */}
      {expanded && (
        <div className="pipeline-steps">
          {STEPS.map((step, i) => (
            <PipelineStep
              key={step.key}
              step={step}
              data={stepData[step.key]}
              isLast={i === STEPS.length - 1}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {expanded && (
        <div className="pipeline-footer">
          {run.startedAt && (
            <span className="pipeline-timestamp">
              Started {fmtDate(run.startedAt)}
              {run.completedAt && ` · Completed ${fmtDate(run.completedAt)}`}
            </span>
          )}
          {patientId && (
            <button
              className="pipeline-link"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/asha/patients/${patientId}`;
              }}
            >
              View patient →
            </button>
          )}
        </div>
      )}

      <style>{`
        .agent-pipeline {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        .pipeline-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 18px;
          border-bottom: 1px solid var(--border);
        }

        .pipeline-header-left {
          flex: 1;
          min-width: 0;
        }

        .pipeline-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pipeline-eyebrow {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: var(--teal);
        }

        .pipeline-status {
          font-size: 8px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          background: var(--teal-light);
          color: var(--teal);
        }

        .pipeline-status.completed {
          background: var(--green-light);
          color: var(--green);
        }

        .pipeline-status.failed {
          background: var(--coral-light);
          color: var(--coral);
        }

        .pipeline-subtitle {
          margin-top: 3px;
          font-size: 12px;
          color: var(--muted);
        }

        .pipeline-total-time {
          margin-left: 4px;
          color: #5A7A72;
        }

        .pipeline-progress {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .pipeline-progress-bar {
          width: 60px;
          height: 4px;
          background: var(--bg-elevated);
          border-radius: 2px;
          overflow: hidden;
        }

        .pipeline-progress-fill {
          height: 100%;
          background: var(--teal);
          border-radius: 2px;
          transition: width 0.4s ease;
        }

        .pipeline-progress-text {
          font-size: 9px;
          font-weight: 600;
          color: var(--muted);
        }

        .pipeline-expand-icon {
          color: var(--muted);
          flex-shrink: 0;
        }

        .pipeline-steps {
          padding: 12px 18px;
        }

        .pipeline-step-group {
          position: relative;
        }

        .pipeline-step {
          display: flex;
          gap: 12px;
        }

        .pipeline-step-icon-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 28px;
          flex-shrink: 0;
        }

        .pipeline-step-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .pipeline-connector {
          width: 1px;
          flex: 1;
          min-height: 16px;
          background: var(--border);
          margin: 4px 0;
        }

        .pipeline-step-body {
          flex: 1;
          padding-bottom: 12px;
          min-width: 0;
        }

        .pipeline-step-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .pipeline-step-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.6px;
        }

        .pipeline-step-duration {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 9px;
          color: var(--muted);
        }

        .pipeline-step-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pipeline-step-detail {
          font-size: 11px;
          color: var(--text);
          line-height: 1.5;
        }

        .pipeline-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 18px;
          border-top: 1px solid var(--border);
          background: var(--bg-elevated);
        }

        .pipeline-timestamp {
          font-size: 9px;
          color: var(--muted);
        }

        .pipeline-link {
          background: transparent;
          color: var(--teal);
          font-size: 10px;
          font-weight: 600;
          padding: 4px 0;
          transition: opacity 0.15s ease;
        }

        .pipeline-link:hover {
          opacity: 0.8;
        }

        .pipeline-compact .pipeline-header {
          padding: 12px 16px;
        }

        .pipeline-compact .pipeline-steps {
          padding: 8px 16px;
        }

        .pipeline-compact .pipeline-footer {
          padding: 8px 16px;
        }
      `}</style>
    </div>
  );
}
