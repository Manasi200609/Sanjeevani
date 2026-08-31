import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Activity, Brain, AlertTriangle, Clock3 } from "lucide-react";
import StreamEvent from "./StreamEvent";
import { getDashboard, getPatients, getAgentRunHistory, getAgentEvents } from "../../services/api";
import { useLanguage } from "../../services/LanguageContext";

// ============================================================
// MAP AGENT EVENT TYPE TO STREAM EVENT TYPE
// ============================================================

function mapAgentEventType(agentEventType) {
  const map = {
    signal_detected: "signal",
    agent_started: "reasoning",
    agent_observed: "reasoning",
    tool_called: "tool",
    agent_reasoned: "reasoning",
    decision_made: "decision",
    care_plan_updated: "action",
    asha_notification: "action",
    patient_message: "signal",
    agent_completed: "action",
    agent_failed: "system",
    system_check: "system",
  };
  return map[agentEventType] || "system";
}

// ============================================================
// BUILD DETAILS FROM AGENT EVENT
// ============================================================

function buildDetailsFromAgentEvent(evt) {
  const details = [];
  const data = evt.data || {};

  if (evt.eventType === "tool_called") {
    // Tool call events show tool-specific details
    if (data.toolName) details.push({ label: "Tool", value: data.toolName });
    if (data.resultSummary) details.push({ label: "Result", value: data.resultSummary });
    if (data.success === false) details.push({ label: "Status", value: "Failed" });
    else if (data.success === true) details.push({ label: "Status", value: "✓ Success" });
    if (data.args && Object.keys(data.args).length > 0) {
      // Show a concise arg summary (e.g. patientId only)
      const argKeys = Object.keys(data.args).filter(k => k !== "patientId");
      if (argKeys.length > 0) {
        details.push({ label: "Parameters", value: argKeys.map(k => `${k}: ${data.args[k]}`).join(", ") });
      }
    }
    return details;
  }

  if (data.riskLevel) details.push({ label: "Risk level", value: String(data.riskLevel).replace(/^./, c => c.toUpperCase()) });
  if (data.trajectory) details.push({ label: "Trajectory", value: String(data.trajectory).replace(/^./, c => c.toUpperCase()) });
  if (data.confidence) details.push({ label: "Confidence", value: `${Math.round(data.confidence * 100)}%` });
  if (data.decisionType) details.push({ label: "Decision", value: String(data.decisionType).replace(/_/g, " ").replace(/^./, c => c.toUpperCase()) });
  if (data.priority) details.push({ label: "Priority", value: String(data.priority).replace(/^./, c => c.toUpperCase()) });
  if (data.newFollowUp) details.push({ label: "Follow-up", value: `Every ${data.newFollowUp} days` });
  if (data.ashaMessage) details.push({ label: "ASHA message", value: data.ashaMessage });
  if (data.reasoning) details.push({ label: "Reasoning", value: data.reasoning.slice(0, 200) });
  if (data.keySignals?.length > 0) details.push({ label: "Key signals", value: data.keySignals.slice(0, 3).join(", ") });
  if (data.durationMs) details.push({ label: "Duration", value: `${data.durationMs}ms` });

  return details;
}

// ============================================================
// BUILD EVENTS FROM BACKEND DATA (FALLBACK)
// ============================================================

function buildStreamEvents(dashboardData, agentRuns) {
  const events = [];

  // -------------------------------------------------------
  // 1. ATTENTION PATIENTS → SIGNAL events
  // -------------------------------------------------------
  const attentionPatients = dashboardData?.attentionPatients || [];
  attentionPatients.forEach((patient) => {
    const trajectory = patient.trajectoryStatus || "stable";
    const riskScore = patient.riskScore ?? 0;
    const symptoms = patient.symptoms || [];
    const priority = patient.priority || "normal";

    // Build signal description
    const signalParts = [];
    if (trajectory === "worsening") {
      signalParts.push("worsening trajectory");
    }
    if (symptoms.length > 0) {
      const symptomNames = symptoms.slice(0, 3).map((s) => s.name || s);
      signalParts.push(`${symptomNames.join(", ")} reported`);
    }
    if (priority === "elevated" || priority === "high" || priority === "urgent") {
      signalParts.push(`${priority} priority`);
    }
    if (signalParts.length === 0) {
      signalParts.push("condition requires attention");
    }

    events.push({
      id: `signal-${patient._id}`,
      type: "signal",
      timestamp: patient.lastVisitAt || new Date().toISOString(),
      title: `${patient.name} — ${signalParts.join(" · ")}`,
      subtitle: `Patient ${patient.patientCode || ""} · Risk ${riskScore}/100 · ${trajectory}`,
      patientId: patient._id,
      patientName: patient.name,
      patientCode: patient.patientCode,
      details: [
        { label: "Patient", value: patient.name },
        { label: "Code", value: patient.patientCode || "—" },
        { label: "Trajectory", value: fmt(trajectory) },
        { label: "Risk", value: `${riskScore}/100` },
        { label: "Priority", value: fmt(priority) },
        ...(symptoms.length > 0
          ? [{ label: "Signals", value: symptoms.map((s) => s.name || s).join(", ") }]
          : []),
      ],
      groupKey: `patient-${patient._id}`,
    });
  });

  // -------------------------------------------------------
  // 2. AGENT RUNS → reasoning + decision + action events
  // -------------------------------------------------------
  agentRuns.forEach((run) => {
    const patientName =
      run.patientId?.name || run.patientId?.patientCode || "Patient";
    const patientId = run.patientId?._id;
    const analysis = run.aiAnalysis || {};
    const steps = run.steps || [];
    const decisions = run.decisions || [];
    const decision = decisions.length > 0 ? decisions[0] : null;

    // Map steps
    const stepMap = {};
    steps.forEach((s) => {
      const key = s.step?.toLowerCase();
      if (key) stepMap[key] = s;
    });

    // --- REASONING event ---
    if (analysis.riskLevel || analysis.recommendedAction || analysis.keySignals?.length > 0) {
      const trajectoryChange = stepMap["observe"]?.details?.trajectoryChange;
      const riskChange = analysis.riskScore != null
        ? `${analysis.previousRiskScore ?? "?"} → ${analysis.riskScore}`
        : null;

      events.push({
        id: `reasoning-${run._id}`,
        type: "reasoning",
        timestamp: run.createdAt,
        title: `Sanjeevani analyzed ${patientName}`,
        subtitle: [
          analysis.riskLevel && `Risk: ${fmt(analysis.riskLevel)}`,
          trajectoryChange && `Trajectory: ${fmt(trajectoryChange)}`,
          riskChange && `Score: ${riskChange}`,
        ].filter(Boolean).join(" · ") || "Analysis completed",
        patientId,
        patientName,
        agentRunId: run._id,
        details: [
          { label: "Patient", value: patientName },
          analysis.riskLevel && { label: "Risk level", value: fmt(analysis.riskLevel) },
          trajectoryChange && { label: "Trajectory", value: fmt(trajectoryChange) },
          riskChange && { label: "Risk score", value: riskChange },
          analysis.keySignals?.length > 0 && {
            label: "Key signals",
            value: analysis.keySignals.slice(0, 3).join("; "),
          },
        ].filter(Boolean),
        groupKey: `run-${run._id}`,
      });
    }

    // --- DECISION event ---
    if (analysis.recommendedAction || decision?.decisionType) {
      const action = analysis.recommendedAction || decision?.decisionType;
      const interval = decision?.followUp?.intervalDays || analysis.followUpIntervalDays;
      const priority = decision?.priority || analysis.priority;

      events.push({
        id: `decision-${run._id}`,
        type: "decision",
        timestamp: run.createdAt,
        title: `${fmt(action)} — ${patientName}`,
        subtitle: [
          interval && `Follow-up: every ${interval} days`,
          priority && `Priority: ${fmt(priority)}`,
          analysis.ashaMessage,
        ].filter(Boolean).join(" · ") || "Decision generated",
        patientId,
        patientName,
        agentRunId: run._id,
        details: [
          { label: "Decision", value: fmt(action) },
          interval && { label: "Follow-up", value: `Every ${interval} days` },
          priority && { label: "Priority", value: fmt(priority) },
          analysis.ashaMessage && { label: "Message", value: analysis.ashaMessage },
        ].filter(Boolean),
        groupKey: `run-${run._id}`,
      });
    }

    // --- ACTION event (only if completed) ---
    if (run.status === "completed" && (analysis.recommendedAction || decision)) {
      const actions = [];
      if (run.executedAction) {
        actions.push(fmt(run.executedAction));
      } else if (analysis.recommendedAction) {
        actions.push(fmt(analysis.recommendedAction));
      }

      events.push({
        id: `action-${run._id}`,
        type: "action",
        timestamp: run.completedAt || run.createdAt,
        title: `Care plan updated for ${patientName}`,
        subtitle: [
          actions.join(", "),
          "ASHA worker notified",
        ].filter(Boolean).join(" · "),
        patientId,
        patientName,
        agentRunId: run._id,
        details: [
          { label: "Patient", value: patientName },
          { label: "Action", value: actions.join(", ") || "Completed" },
          { label: "Status", value: "✓ Care plan updated" },
          { label: "Notification", value: "✓ ASHA worker notified" },
        ],
        groupKey: `run-${run._id}`,
      });
    }
  });

  // -------------------------------------------------------
  // 3. FOLLOW-UP DUE events
  // -------------------------------------------------------
  attentionPatients.forEach((patient) => {
    if (patient.followUp?.required && patient.followUp?.nextFollowUpAt) {
      const nextDate = new Date(patient.followUp.nextFollowUpAt);
      const now = new Date();
      const daysUntil = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 7 && daysUntil >= 0) {
        events.push({
          id: `followup-${patient._id}`,
          type: "followup",
          timestamp: patient.followUp.nextFollowUpAt,
          title: `Follow-up due: ${patient.name}`,
          subtitle: `Scheduled in ${daysUntil} day${daysUntil !== 1 ? "s" : ""} · Every ${patient.followUp.intervalDays || 7} days`,
          patientId: patient._id,
          patientName: patient.name,
          details: [
            { label: "Patient", value: patient.name },
            { label: "Next visit", value: nextDate.toLocaleDateString([], { month: "short", day: "numeric" }) },
            { label: "Interval", value: `Every ${patient.followUp.intervalDays || 7} days` },
            { label: "Priority", value: fmt(patient.priority || "normal") },
          ],
          groupKey: `followup-${patient._id}`,
        });
      }
    }
  });

  // -------------------------------------------------------
  // 4. SYSTEM CHECK event
  // -------------------------------------------------------
  const stats = dashboardData?.stats;
  if (stats) {
    events.push({
      id: `system-${Date.now()}`,
      type: "system",
      timestamp: new Date().toISOString(),
      title: "System check completed",
      subtitle: `${stats.totalPatients} patients · ${stats.needsAttention} attention · ${stats.followUpsDue} due · ${stats.urgentCases} urgent`,
      details: [
        { label: "Patients", value: `${stats.totalPatients} total` },
        { label: "Attention", value: `${stats.needsAttention} requiring attention` },
        { label: "Follow-ups", value: `${stats.followUpsDue} due soon` },
        { label: "Urgent", value: `${stats.urgentCases} urgent cases` },
      ],
      groupKey: "system",
    });
  }

  // -------------------------------------------------------
  // SORT by timestamp (newest first)
  // -------------------------------------------------------
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return events;
}

// ============================================================
// FORMAT HELPER
// ============================================================

const fmt = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function EventStream({ onSelectPatient }) {
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading((prev) => prev || events.length === 0);
      setError("");

      // First try the dedicated agent events endpoint
      try {
        const agentEventsData = await getAgentEvents(30);
        if (agentEventsData?.events?.length > 0) {
          // Convert backend agent events to stream events
          const streamEvents = agentEventsData.events.map((evt) => ({
            id: evt._id || `evt-${Date.now()}-${Math.random()}`,
            type: mapAgentEventType(evt.eventType),
            timestamp: evt.timestamp,
            title: evt.title,
            subtitle: evt.subtitle || "",
            patientId: evt.patientId?._id || evt.patientId,
            patientName: evt.patientName || evt.patientId?.name,
            patientCode: evt.patientCode || evt.patientId?.patientCode,
            agentRunId: evt.agentRunId?._id || evt.agentRunId,
            details: buildDetailsFromAgentEvent(evt),
            groupKey: evt.agentRunId ? `run-${evt.agentRunId}` : `evt-${evt._id}`,
          }));
          setEvents(streamEvents);
          setLastRefresh(new Date());
          return;
        }
      } catch {
        // Agent events endpoint not available — fall back to dashboard + runs
      }

      // Fallback: fetch from dashboard + agent runs
      const [dashboardData, patientsData] = await Promise.all([
        getDashboard(),
        getPatients(),
      ]);

      const patients = patientsData?.patients || [];
      const allRuns = [];
      for (const p of patients.slice(0, 10)) {
        try {
          const runsData = await getAgentRunHistory(p._id, 3);
          if (runsData?.runs) {
            runsData.runs.forEach((r) => {
              if (!r.patientId || typeof r.patientId === "string") {
                r.patientId = { _id: p._id, name: p.name, patientCode: p.patientCode };
              }
              allRuns.push(r);
            });
          }
        } catch { /* skip */ }
      }

      allRuns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const streamEvents = buildStreamEvents(dashboardData, allRuns.slice(0, 15));
      setEvents(streamEvents);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Event stream load error:", err);
      if (events.length === 0) {
        setError(err.message || "Failed to load monitoring data");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    loadEvents();

    const interval = setInterval(loadEvents, 15000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  // -------------------------------------------------------
  // LOADING STATE
  // -------------------------------------------------------
  if (loading && events.length === 0) {
    return (
      <div className="stream-loading">
        <div className="stream-loading-icon">
          <Activity size={24} className="spin" />
        </div>
        <div className="stream-loading-title">Sanjeevani is checking</div>
        <div className="stream-loading-subtitle">
          Reviewing recent patient activity...
        </div>
        <style>{`
          .stream-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            text-align: center;
          }
          .stream-loading-icon {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 15px;
            background: var(--teal-light);
            color: var(--teal);
            margin-bottom: 16px;
          }
          .stream-loading-title {
            font-family: "Manrope", sans-serif;
            font-size: 16px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 4px;
          }
          .stream-loading-subtitle {
            font-size: 12px;
            color: var(--muted);
          }
        `}</style>
      </div>
    );
  }

  // -------------------------------------------------------
  // ERROR STATE
  // -------------------------------------------------------
  if (error && events.length === 0) {
    return (
      <div className="stream-error">
        <div className="stream-error-icon">
          <AlertTriangle size={24} />
        </div>
        <div className="stream-error-title">
          Sanjeevani connection interrupted
        </div>
        <div className="stream-error-subtitle">
          We couldn't reach the monitoring service. Your existing patient records are not affected.
        </div>
        <button className="stream-retry-btn" onClick={loadEvents}>
          <RefreshCw size={14} /> Retry
        </button>
        <style>{`
          .stream-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            text-align: center;
          }
          .stream-error-icon {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 15px;
            background: var(--coral-light);
            color: var(--coral);
            margin-bottom: 16px;
          }
          .stream-error-title {
            font-family: "Manrope", sans-serif;
            font-size: 16px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 4px;
          }
          .stream-error-subtitle {
            font-size: 12px;
            color: var(--muted);
            max-width: 380px;
            margin-bottom: 16px;
          }
          .stream-retry-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 9px 18px;
            border-radius: 8px;
            background: var(--gradient-primary);
            color: #fff;
            font-size: 11px;
            font-weight: 600;
          }
        `}</style>
      </div>
    );
  }

  // -------------------------------------------------------
  // EMPTY STATE
  // -------------------------------------------------------
  if (events.length === 0) {
    return (
      <div className="stream-empty">
        <div className="stream-empty-icon">
          <Activity size={28} />
        </div>
        <div className="stream-empty-title">
          Sanjeevani is monitoring
        </div>
        <div className="stream-empty-subtitle">
          All patients are currently stable. The agent is continuously watching
          for changes in longitudinal health patterns.
        </div>
        <div className="stream-empty-status">
          <div className="stream-empty-dot" />
          Monitoring active
        </div>
        <button className="stream-empty-refresh" onClick={loadEvents}>
          <RefreshCw size={13} /> Refresh
        </button>
        <style>{`
          .stream-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            text-align: center;
          }
          .stream-empty-icon {
            width: 64px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 17px;
            background: var(--green-light);
            color: var(--green);
            margin-bottom: 18px;
          }
          .stream-empty-title {
            font-family: "Manrope", sans-serif;
            font-size: 18px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 6px;
          }
          .stream-empty-subtitle {
            font-size: 12px;
            color: var(--muted);
            max-width: 380px;
            line-height: 1.6;
            margin-bottom: 14px;
          }
          .stream-empty-status {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            color: var(--green);
            margin-bottom: 16px;
          }
          .stream-empty-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--green);
            animation: stream-pulse 2s ease-in-out infinite;
          }
          .stream-empty-refresh {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 7px 14px;
            border-radius: 7px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--muted);
            font-size: 10px;
            font-weight: 600;
            transition: all 0.15s ease;
          }
          .stream-empty-refresh:hover {
            border-color: var(--teal);
            color: var(--teal);
          }
          @keyframes stream-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  // -------------------------------------------------------
  // EVENT STREAM
  // -------------------------------------------------------
  return (
    <div className="event-stream">
      <div className="stream-header">
        <div className="stream-header-left">
          <div className="stream-eyebrow">{t("monitor.liveActivity")}</div>
          <h2 className="stream-title">{t("monitor.eventStream")}</h2>
        </div>
        <button className="stream-refresh-btn" onClick={loadEvents} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          {lastRefresh && (
            <span className="stream-refresh-time">
              Updated {new Date(lastRefresh).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </button>
      </div>

      <div className="stream-events">
        {events.map((event, i) => (
          <StreamEvent
            key={event.id}
            event={event}
            isFirst={i === 0}
            isLast={i === events.length - 1}
          />
        ))}
      </div>

      <style>{`
        .event-stream {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .stream-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .stream-header-left {
          display: flex;
          flex-direction: column;
        }

        .stream-eyebrow {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: var(--teal);
        }

        .stream-title {
          margin: 4px 0 0;
          font-family: "Manrope", sans-serif;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.3px;
          color: var(--text);
        }

        .stream-refresh-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 7px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--muted);
          font-size: 10px;
          font-weight: 600;
          transition: all 0.15s ease;
        }

        .stream-refresh-btn:hover {
          border-color: var(--teal);
          color: var(--teal);
        }

        .stream-refresh-time {
          color: var(--muted);
          font-weight: 500;
        }

        .stream-events {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
      `}</style>
    </div>
  );
}
