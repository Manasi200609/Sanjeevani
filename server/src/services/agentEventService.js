import AgentEvent from "../models/AgentEvent.js";

// ============================================================
// CREATE AGENT EVENT
// ============================================================

export const createAgentEvent = async ({
  eventType,
  patientId = null,
  patientName = null,
  patientCode = null,
  agentRunId = null,
  title,
  subtitle = "",
  data = {},
  timestamp = new Date(),
}) => {
  return AgentEvent.create({
    eventType,
    patientId,
    patientName,
    patientCode,
    agentRunId,
    title,
    subtitle,
    data,
    timestamp,
  });
};

// ============================================================
// GET RECENT AGENT EVENTS
// ============================================================

export const getRecentAgentEvents = async (limit = 30) => {
  return AgentEvent.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("patientId", "patientCode name")
    .populate("agentRunId", "status trigger durationMs")
    .lean();
};

// ============================================================
// GET AGENT EVENTS FOR PATIENT
// ============================================================

export const getPatientAgentEvents = async (patientId, limit = 20) => {
  return AgentEvent.find({ patientId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("agentRunId", "status trigger durationMs")
    .lean();
};

// ============================================================
// HELPER: CREATE SIGNAL DETECTED EVENT
// ============================================================

export const createSignalDetectedEvent = async (patient, event, reason) => {
  return createAgentEvent({
    eventType: "signal_detected",
    patientId: patient._id,
    patientName: patient.name,
    patientCode: patient.patientCode,
    title: `${patient.name} — ${reason}`,
    subtitle: `Patient ${patient.patientCode} · Source: ${event.source || "system"}`,
    data: {
      eventSource: event.source,
      symptoms: event.symptoms,
      severity: event.severity,
    },
  });
};

// ============================================================
// HELPER: CREATE AGENT REASONING EVENT
// ============================================================

export const createAgentReasonedEvent = async (patient, run, analysis) => {
  return createAgentEvent({
    eventType: "agent_reasoned",
    patientId: patient._id,
    patientName: patient.name,
    patientCode: patient.patientCode,
    agentRunId: run._id,
    title: `CareFlow analyzed ${patient.name}`,
    subtitle: `Risk: ${analysis.riskLevel} · Trajectory: ${analysis.trajectory} · Confidence: ${Math.round((analysis.confidence || 0.5) * 100)}%`,
    data: {
      riskLevel: analysis.riskLevel,
      riskScore: analysis.riskScore,
      trajectory: analysis.trajectory,
      confidence: analysis.confidence,
      keySignals: analysis.keySignals,
      reasoning: analysis.reasoning,
    },
  });
};

// ============================================================
// HELPER: CREATE DECISION MADE EVENT
// ============================================================

export const createDecisionMadeEvent = async (patient, run, decision) => {
  return createAgentEvent({
    eventType: "decision_made",
    patientId: patient._id,
    patientName: patient.name,
    patientCode: patient.patientCode,
    agentRunId: run._id,
    title: `${formatAction(decision.decisionType)} — ${patient.name}`,
    subtitle: `Follow-up: every ${decision.recommendedFollowUpIntervalDays} days · Priority: ${decision.priority}`,
    data: {
      decisionType: decision.decisionType,
      riskLevel: decision.riskLevel,
      priority: decision.priority,
      previousFollowUp: decision.previousFollowUpIntervalDays,
      newFollowUp: decision.recommendedFollowUpIntervalDays,
      reasoning: decision.reasoning,
      ashaMessage: decision.ashaMessage,
    },
  });
};

// ============================================================
// HELPER: CREATE CARE PLAN UPDATED EVENT
// ============================================================

export const createCarePlanUpdatedEvent = async (patient, run, decision) => {
  return createAgentEvent({
    eventType: "care_plan_updated",
    patientId: patient._id,
    patientName: patient.name,
    patientCode: patient.patientCode,
    agentRunId: run._id,
    title: `Care plan updated for ${patient.name}`,
    subtitle: `Follow-up changed to every ${decision.recommendedFollowUpIntervalDays} days · ${decision.ashaMessage || "ASHA notified"}`,
    data: {
      action: decision.decisionType,
      followUpInterval: decision.recommendedFollowUpIntervalDays,
      priority: decision.priority,
      ashaMessage: decision.ashaMessage,
    },
  });
};

// ============================================================
// HELPER: CREATE AGENT COMPLETED EVENT
// ============================================================

export const createAgentCompletedEvent = async (patient, run) => {
  return createAgentEvent({
    eventType: "agent_completed",
    patientId: patient._id,
    patientName: patient.name,
    patientCode: patient.patientCode,
    agentRunId: run._id,
    title: `Agent cycle completed for ${patient.name}`,
    subtitle: `Duration: ${run.durationMs || 0}ms · Action: ${run.executedAction || "completed"}`,
    data: {
      durationMs: run.durationMs,
      executedAction: run.executedAction,
      status: run.status,
    },
  });
};

// ============================================================
// HELPER: CREATE AGENT FAILED EVENT
// ============================================================

export const createAgentFailedEvent = async (patient, run, error) => {
  return createAgentEvent({
    eventType: "agent_failed",
    patientId: patient?._id || null,
    patientName: patient?.name || null,
    patientCode: patient?.patientCode || null,
    agentRunId: run?._id || null,
    title: `Agent failed for ${patient?.name || "patient"}`,
    subtitle: error?.message || "Unknown error",
    data: {
      error: error?.message,
      durationMs: run?.durationMs,
    },
  });
};

// ============================================================
// HELPER: CREATE TOOL CALLED EVENT
// ============================================================

export const createToolCalledEvent = async (patient, run, toolCall) => {
  const toolName = toolCall.name;
  const success = toolCall.result && !toolCall.result.error;

  // Build a concise summary of what the tool returned
  let resultSummary = "";
  const result = toolCall.result || {};
  if (result.error) {
    resultSummary = `Error: ${result.error}`;
  } else if (toolName.includes("timeline") || toolName.includes("context")) {
    // For context/timeline tools, show counts
    const count = result.recentEventCount || result.recentTimeline?.length || result.eventsAnalyzed || 0;
    resultSummary = count > 0 ? `${count} items retrieved` : "Data retrieved";
  } else if (toolName.includes("memory")) {
    const count = Array.isArray(result) ? result.length : 0;
    resultSummary = count > 0 ? `${count} memories found` : "No memories";
  } else if (toolName.includes("trajectory")) {
    resultSummary = result.trajectory ? `${result.trajectory} (risk: ${result.riskScore ?? 0})` : "Analyzed";
  } else if (toolName.includes("plan")) {
    if (result.success) {
      resultSummary = result.newIntervalDays ? `${result.previousIntervalDays}d → ${result.newIntervalDays}d` : "Updated";
    } else if (result.followUp) {
      resultSummary = `Every ${result.followUp.intervalDays} days`;
    } else {
      resultSummary = "Retrieved";
    }
  } else if (toolName.includes("decision")) {
    resultSummary = result.decisionId ? `${result.decisionType} (${result.riskLevel})` : "Created";
  } else if (toolName.includes("event")) {
    resultSummary = result.eventId ? `Event recorded (${result.eventType})` : "Recorded";
  } else {
    resultSummary = success ? "Completed" : "Failed";
  }

  return createAgentEvent({
    eventType: "tool_called",
    patientId: patient._id,
    patientName: patient.name,
    patientCode: patient.patientCode,
    agentRunId: run._id,
    title: toolName,
    subtitle: resultSummary,
    data: {
      toolName,
      args: Object.keys(toolCall.args || {}).length > 0 ? toolCall.args : undefined,
      resultSummary,
      success,
      timestamp: toolCall.timestamp,
    },
  });
};

// ============================================================
// HELPER: CREATE SYSTEM CHECK EVENT
// ============================================================

export const createSystemCheckEvent = async (stats) => {
  return createAgentEvent({
    eventType: "system_check",
    title: "System check completed",
    subtitle: `${stats.totalPatients} patients · ${stats.needsAttention} attention · ${stats.followUpsDue} due · ${stats.urgentCases} urgent`,
    data: stats,
  });
};

// ============================================================
// FORMAT HELPERS
// ============================================================

const formatAction = (action) => {
  const map = {
    maintain_followup: "Follow-up maintained",
    increase_followup: "Follow-up increased",
    urgent_review: "Urgent review required",
    escalate: "Escalation initiated",
  };
  return map[action] || String(action).replace(/_/g, " ");
};
