import Patient from "../models/Patient.js";
import PatientEvent from "../models/PatientEvent.js";
import CareDecision from "../models/CareDecision.js";
import Memory from "../models/Memory.js";

// ============================================================
// BUILD PATIENT PROFILE
// ============================================================

const buildPatientProfile = (patient) => {
  return {
    id: patient._id,
    patientCode: patient.patientCode,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    preferredLanguage:
      patient.preferredLanguage,

    location: patient.location,

    baselineState:
      patient.baselineState,

    currentState:
      patient.currentState,

    trajectoryStatus:
      patient.trajectoryStatus,

    priority:
      patient.priority,

    followUp: {
      required:
        patient.followUp?.required ?? true,

      intervalDays:
        patient.followUp?.intervalDays ?? 7,

      nextFollowUpAt:
        patient.followUp?.nextFollowUpAt ??
        null,
    },

    lastVisitAt:
      patient.lastVisitAt,

    isActive:
      patient.isActive,
  };
};

// ============================================================
// GET RECENT EVENTS
// ============================================================

const getRecentEvents = async (
  patientId,
  limit
) => {
  return await PatientEvent.find({
    patientId,
  })
    .sort({
      timestamp: -1,
    })
    .limit(limit)
    .lean();
};

// ============================================================
// GET RECENT DECISIONS
// ============================================================

const getRecentDecisions = async (
  patientId,
  limit
) => {
  return await CareDecision.find({
    patientId,
  })
    .sort({
      createdAt: -1,
    })
    .limit(limit)
    .lean();
};

// ============================================================
// GET ACTIVE MEMORIES
// ============================================================

const getActiveMemories = async (
  patientId,
  limit
) => {
  return await Memory.find({
    patientId,
    isActive: true,
  })
    .sort({
      periodEnd: -1,
      version: -1,
    })
    .limit(limit)
    .lean();
};

// ============================================================
// CALCULATE RISK TREND
// ============================================================

const calculateRiskTrend = (
  events
) => {
  if (!events.length) {
    return {
      currentRiskScore: 0,
      previousRiskScore: null,
      riskChange: 0,
      direction: "unknown",
    };
  }

  const currentRiskScore =
    Number(events[0].riskScore) || 0;

  const previousRiskScore =
    events.length > 1
      ? Number(events[1].riskScore) || 0
      : currentRiskScore;

  const riskChange =
    currentRiskScore -
    previousRiskScore;

  let direction = "stable";

  if (riskChange > 0) {
    direction = "increasing";
  } else if (riskChange < 0) {
    direction = "decreasing";
  }

  return {
    currentRiskScore,
    previousRiskScore,
    riskChange,
    direction,
  };
};

// ============================================================
// EXTRACT ACTIVE SYMPTOMS
// ============================================================

const extractActiveSymptoms = (
  events
) => {
  const symptoms = [];

  for (const event of events) {
    if (!Array.isArray(event.symptoms)) {
      continue;
    }

    for (const symptom of event.symptoms) {
      if (!symptom?.name) {
        continue;
      }

      symptoms.push({
        name: symptom.name,
        severity:
          symptom.severity ?? null,
        status:
          symptom.status || "unknown",
        timestamp:
          event.timestamp,
      });
    }
  }

  return symptoms;
};

// ============================================================
// EXTRACT MEDICATION ADHERENCE
// ============================================================

const extractMedicationPatterns = (
  events
) => {
  const patterns = [];

  for (const event of events) {
    if (
      !Array.isArray(
        event.medications
      )
    ) {
      continue;
    }

    for (const medication of
      event.medications) {
      if (!medication) {
        continue;
      }

      patterns.push({
        name:
          medication.name ||
          "Unknown medication",

        adherence:
          medication.adherence ||
          "unknown",

        notes:
          medication.notes || "",

        timestamp:
          event.timestamp,
      });
    }
  }

  return patterns;
};

// ============================================================
// COMPUTE TRAJECTORY FROM EVENTS
// ============================================================
//
// Instead of relying solely on patient.trajectoryStatus
// (which may be stale), compute the trajectory from the
// actual longitudinal event history.
//
// ============================================================

const computeTrajectoryFromEvents = (events) => {
  if (!events.length) return "stable";

  // Count worsening vs improving signals across all recent events
  let worseningSignals = 0;
  let improvingSignals = 0;

  for (const event of events) {
    if (event.trajectorySignal === "worsening") worseningSignals++;
    if (event.trajectorySignal === "improving") improvingSignals++;

    // Count worsening/new symptoms
    if (Array.isArray(event.symptoms)) {
      for (const s of event.symptoms) {
        if (s.status === "worsening" || s.status === "new") worseningSignals++;
        if (s.status === "improving") improvingSignals++;
      }
    }

    // Count medication adherence issues
    if (Array.isArray(event.medications)) {
      for (const m of event.medications) {
        if (m.adherence === "partial" || m.adherence === "poor") worseningSignals++;
        if (m.adherence === "good") improvingSignals++;
      }
    }
  }

  if (worseningSignals > improvingSignals && worseningSignals >= 2) return "worsening";
  if (improvingSignals > worseningSignals && improvingSignals >= 2) return "improving";
  return "stable";
};

// ============================================================
// BUILD TRAJECTORY SNAPSHOT
// ============================================================

const buildTrajectorySnapshot = (
  patient,
  events
) => {
  const riskTrend =
    calculateRiskTrend(events);

  // Compute trajectory from actual events rather than stale patient field
  const computedTrajectory = computeTrajectoryFromEvents(events);

  // Only use patient.trajectoryStatus as fallback when we have no events
  const status = events.length > 0
    ? computedTrajectory
    : (patient.trajectoryStatus || "stable");

  // Build risk history trend (all events, oldest first)
  const riskHistory = events.map(e => Number(e.riskScore) || 0).reverse();

  return {
    status,

    currentState:
      patient.currentState || "stable",

    priority:
      patient.priority || "normal",

    riskScore:
      riskTrend.currentRiskScore,

    previousRiskScore:
      riskTrend.previousRiskScore,

    riskChange:
      riskTrend.riskChange,

    riskDirection:
      riskTrend.direction,

    riskHistory,

    eventsAnalyzed:
      events.length,

    latestEventAt:
      events.length
        ? events[0].timestamp
        : null,

    confidence:
      events.length >= 2
        ? 0.7
        : events.length === 1
        ? 0.5
        : 0,
  };
};

// ============================================================
// BUILD MEMORY SNAPSHOT
// ============================================================

const buildMemorySnapshot = (
  memories
) => {
  return memories.map(
    (memory) => ({
      id: memory._id,

      type:
        memory.memoryType,

      version:
        memory.version,

      periodStart:
        memory.periodStart,

      periodEnd:
        memory.periodEnd,

      summary:
        memory.summary,

      keySignals:
        memory.keySignals || [],

      symptomPatterns:
        memory.symptomPatterns || [],

      medicationPatterns:
        memory.medicationPatterns || [],

      riskHistory:
        memory.riskHistory || {},

      careHistory:
        memory.careHistory || {},

      confidence:
        memory.confidence,
    })
  );
};

// ============================================================
// BUILD COMPLETE AGENT CONTEXT
// ============================================================

export const buildPatientContext = async (
  patientId,
  options = {}
) => {
  const {
    recentEventLimit = 10,
    recentDecisionLimit = 5,
    memoryLimit = 5,
  } = options;

  // ----------------------------------------------------------
  // Load patient
  // ----------------------------------------------------------

  const patient =
    await Patient.findById(
      patientId
    ).lean();

  if (!patient) {
    throw new Error(
      "Patient not found"
    );
  }

  // ----------------------------------------------------------
  // Load context sources in parallel
  // ----------------------------------------------------------

  const [
    events,
    decisions,
    memories,
  ] = await Promise.all([
    getRecentEvents(
      patientId,
      recentEventLimit
    ),

    getRecentDecisions(
      patientId,
      recentDecisionLimit
    ),

    getActiveMemories(
      patientId,
      memoryLimit
    ),
  ]);

  // ----------------------------------------------------------
  // Build derived context
  // ----------------------------------------------------------

  const trajectory =
    buildTrajectorySnapshot(
      patient,
      events
    );

  const activeSymptoms =
    extractActiveSymptoms(
      events
    );

  const medicationPatterns =
    extractMedicationPatterns(
      events
    );

  const memorySnapshot =
    buildMemorySnapshot(
      memories
    );

  // ----------------------------------------------------------
  // Final context
  // ----------------------------------------------------------

  return {
    patient:
      buildPatientProfile(
        patient
      ),

    recentTimeline:
      events,

    recentDecisions:
      decisions,

    longTermMemory:
      memorySnapshot,

    activeSymptoms,

    medicationPatterns,

    trajectory,

    contextMetadata: {
      generatedAt:
        new Date(),

      recentEventsCount:
        events.length,

      recentDecisionsCount:
        decisions.length,

      memoriesCount:
        memories.length,

      hasLongTermMemory:
        memories.length > 0,
    },
  };
};

// ============================================================
// BUILD COMPACT AI CONTEXT
// ============================================================

export const buildCompactAIContext =
  async (patientId) => {
    const context =
      await buildPatientContext(
        patientId,
        {
          recentEventLimit: 5,
          recentDecisionLimit: 3,
          memoryLimit: 3,
        }
      );

    return {
      patient:
        context.patient,

      recentEvents:
        context.recentTimeline.map(
          (event) => ({
            timestamp:
              event.timestamp,

            symptoms:
              event.symptoms,

            vitals:
              event.vitals,

            medications:
              event.medications,

            severity:
              event.severity,

            riskScore:
              event.riskScore,

            trajectorySignal:
              event.trajectorySignal,

            notes:
              event.notes,
          })
        ),

      previousDecisions:
        context.recentDecisions.map(
          (decision) => ({
            decisionType:
              decision.decisionType,

            riskLevel:
              decision.riskLevel,

            priority:
              decision.priority,

            followUpIntervalDays:
              decision.recommendedFollowUpIntervalDays,

            reasoning:
              decision.reasoning,
          })
        ),

      longTermMemory:
        context.longTermMemory,

      trajectory:
        context.trajectory,

      activeSymptoms:
        context.activeSymptoms,

      medicationPatterns:
        context.medicationPatterns,
    };
};

// ============================================================
// BUILD HUMAN-READABLE CONTEXT
// ============================================================

export const buildReadableContext =
  async (patientId) => {
    const context =
      await buildPatientContext(
        patientId
      );

    const patient =
      context.patient;

    const trajectory =
      context.trajectory;

    return `
PATIENT
-------
Name: ${patient.name}
Code: ${patient.patientCode}
Age: ${patient.age}
Gender: ${patient.gender}
Language: ${patient.preferredLanguage}

CURRENT STATE
-------------
State: ${patient.currentState}
Trajectory: ${patient.trajectoryStatus}
Priority: ${patient.priority}
Risk Score: ${trajectory.riskScore}
Risk Change: ${trajectory.riskChange}
Risk Direction: ${trajectory.riskDirection}

FOLLOW-UP
---------
Interval: ${patient.followUp.intervalDays} day(s)
Next Follow-up: ${
      patient.followUp.nextFollowUpAt ||
      "Not scheduled"
    }

RECENT SYMPTOMS
---------------
${context.activeSymptoms
  .map(
    (symptom) =>
      `- ${symptom.name} | severity: ${
        symptom.severity
      } | status: ${
        symptom.status
      }`
  )
  .join("\n")}

LONG-TERM MEMORY
----------------
${
  context.longTermMemory.length
    ? context.longTermMemory
        .map(
          (memory) =>
            `- ${memory.summary}`
        )
        .join("\n")
    : "No consolidated memory available."
}

RECENT CARE DECISIONS
---------------------
${
  context.recentDecisions.length
    ? context.recentDecisions
        .map(
          (decision) =>
            `- ${
              decision.decisionType
            } | priority: ${
              decision.priority
            }`
        )
        .join("\n")
    : "No previous decisions."
}
`.trim();
};