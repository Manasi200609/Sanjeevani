import Patient from "../models/Patient.js";
import CareDecision from "../models/CareDecision.js";

const ALLOWED_ACTIONS = [
  "maintain_followup",
  "increase_followup",
  "urgent_review",
  "escalate",
];

const ALLOWED_RISK_LEVELS = [
  "low",
  "moderate",
  "high",
  "critical",
];

const ALLOWED_PRIORITIES = [
  "normal",
  "elevated",
  "high",
  "urgent",
];

const normalizeDecisionType = (value) =>
  ALLOWED_ACTIONS.includes(value)
    ? value
    : "maintain_followup";

const normalizeRiskLevel = (value) =>
  ALLOWED_RISK_LEVELS.includes(value)
    ? value
    : "moderate";

const normalizePriority = (value, riskLevel, decisionType) => {
  if (ALLOWED_PRIORITIES.includes(value)) {
    return value;
  }

  if (
    decisionType === "escalate" ||
    decisionType === "urgent_review" ||
    riskLevel === "critical"
  ) {
    return "urgent";
  }

  if (riskLevel === "high") {
    return "high";
  }

  if (value === "elevated") {
    return "elevated";
  }

  return "normal";
};

const normalizeFollowUpDays = ({
  requestedDays,
  currentDays,
  decisionType,
  riskLevel,
}) => {
  let days = Number(requestedDays);

  if (!Number.isFinite(days)) {
    days = Number(currentDays) || 7;
  }

  days = Math.round(days);
  days = Math.max(1, Math.min(days, 30));

  if (
    riskLevel === "critical" ||
    decisionType === "escalate" ||
    decisionType === "urgent_review"
  ) {
    days = 1;
  }

  return days;
};

const buildContextSnapshot = (context) => {
  const trajectory = context?.trajectory || {};

  return {
    riskScore: trajectory.riskScore ?? null,
    trajectory:
      trajectory.status ??
      trajectory.trajectory ??
      null,
    confidence: trajectory.confidence ?? null,
    eventsAnalyzed:
      trajectory.eventsAnalyzed ?? null,
  };
};

export const createCarePlan = async ({
  patientId,
  analysis,
  context,
}) => {
  const patient = await Patient.findById(patientId);

  if (!patient) {
    throw new Error("Patient not found");
  }

  if (!analysis || typeof analysis !== "object") {
    throw new Error("Valid AI analysis is required");
  }

  const decisionType = normalizeDecisionType(
    analysis.recommendedAction
  );

  const riskLevel = normalizeRiskLevel(
    analysis.riskLevel
  );

  const priority = normalizePriority(
    analysis.priority,
    riskLevel,
    decisionType
  );

  const followUpDays = normalizeFollowUpDays({
    requestedDays: analysis.followUpIntervalDays,
    currentDays: patient.followUp?.intervalDays || 7,
    decisionType,
    riskLevel,
  });

  return CareDecision.create({
    patientId,
    decisionType,
    riskLevel,
    priority,
    previousFollowUpIntervalDays:
      patient.followUp?.intervalDays || null,
    recommendedFollowUpIntervalDays:
      followUpDays,
    assessment:
      analysis.assessment ||
      "AI assessment unavailable.",
    keySignals: Array.isArray(analysis.keySignals)
      ? analysis.keySignals
      : [],
    reasoning:
      analysis.reasoning ||
      "No reasoning provided.",
    ashaMessage:
      analysis.ashaMessage || "",
    status: "proposed",
    contextSnapshot:
      buildContextSnapshot(context),
  });
};

export const createCareDecision = createCarePlan;

export const previewCarePlan = async ({
  patientId,
  analysis,
  context,
}) => {
  const patient = await Patient.findById(patientId).lean();

  if (!patient) {
    throw new Error("Patient not found");
  }

  const decisionType = normalizeDecisionType(
    analysis?.recommendedAction
  );
  const riskLevel = normalizeRiskLevel(
    analysis?.riskLevel
  );
  const priority = normalizePriority(
    analysis?.priority,
    riskLevel,
    decisionType
  );
  const followUpDays = normalizeFollowUpDays({
    requestedDays:
      analysis?.followUpIntervalDays,
    currentDays:
      patient.followUp?.intervalDays || 7,
    decisionType,
    riskLevel,
  });

  return {
    patientId,
    decisionType,
    riskLevel,
    priority,
    previousFollowUpIntervalDays:
      patient.followUp?.intervalDays || null,
    recommendedFollowUpIntervalDays:
      followUpDays,
    assessment:
      analysis?.assessment ||
      "AI assessment unavailable.",
    keySignals:
      Array.isArray(analysis?.keySignals)
        ? analysis.keySignals
        : [],
    reasoning:
      analysis?.reasoning ||
      "No reasoning provided.",
    ashaMessage:
      analysis?.ashaMessage || "",
    status: "preview",
    contextSnapshot:
      buildContextSnapshot(context),
  };
};

export const getPendingCarePlans = async (patientId) => {
  const filter = { status: "proposed" };

  if (patientId) {
    filter.patientId = patientId;
  }

  return CareDecision.find(filter)
    .sort({ createdAt: -1 })
    .lean();
};

export const getCarePlanById = async (decisionId) => {
  const decision =
    await CareDecision.findById(decisionId);

  if (!decision) {
    throw new Error("Care decision not found");
  }

  return decision;
};

// ============================================================
// EXECUTE / APPLY CARE DECISION
// ============================================================

export const applyCareDecision = async (decisionId) => {
  const decision =
    await CareDecision.findById(decisionId);

  if (!decision) {
    throw new Error("Care decision not found");
  }

  if (decision.status !== "proposed") {
    throw new Error(
      `Decision cannot be applied because its status is "${decision.status}"`
    );
  }

  const patient =
    await Patient.findById(decision.patientId);

  if (!patient) {
    throw new Error("Patient not found");
  }

  const intervalDays =
    decision.recommendedFollowUpIntervalDays || 7;

  const nextFollowUpAt = new Date();
  nextFollowUpAt.setDate(
    nextFollowUpAt.getDate() + intervalDays
  );

  patient.followUp = {
    required: true,
    intervalDays,
    nextFollowUpAt,
  };

  patient.priority =
    decision.priority;

  if (decision.contextSnapshot?.trajectory) {
    patient.trajectoryStatus =
      decision.contextSnapshot.trajectory;
  }

  if (
    decision.decisionType === "urgent_review" ||
    decision.decisionType === "escalate"
  ) {
    patient.currentState = "urgent";
  } else if (
    decision.decisionType === "increase_followup"
  ) {
    patient.currentState = "watch";
  } else {
    patient.currentState = "stable";
  }

  await patient.save();

  decision.status = "applied";
  decision.executedAt = new Date();

  await decision.save();

  return {
    decision,
    patient,
    nextFollowUpAt,
  };
};

export const executeCareDecision =
  applyCareDecision;
