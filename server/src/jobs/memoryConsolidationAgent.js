import Patient from "../models/Patient.js";
import PatientEvent from "../models/PatientEvent.js";
import CareDecision from "../models/CareDecision.js";
import MemorySummary from "../models/MemorySummary.js";
import SchedulerEvent from "../models/SchedulerEvent.js";

import { consolidateMemoryWithAI } from "../ai/aiProvider.js";

// ============================================================
// MEMORY CONSOLIDATION AGENT
// ============================================================
//
// Autonomous execution flow:
//
//   Cloud Scheduler
//        ↓ (daily / weekly / monthly)
//   Pub/Sub topic: careflow-memory-consolidation
//        ↓
//   Cloud Run Job: memory-consolidation-job
//        ↓
//   runMemoryConsolidationBatch()
//        ↓
//   For each active patient:
//        ↓
//     Retrieve old PatientEvents
//        ↓
//     Group chronologically
//        ↓
//     Build timestamp-aware symptom timelines
//        ↓
//     Gemini creates natural language summary
//        ↓
//     Store MemorySummary
//        ↓
//     Raw PatientEvents are NEVER deleted
//
// ============================================================

// ============================================================
// CONFIGURATION
// ============================================================

const MAX_PATIENTS = Number(process.env.MEMORY_CONSOLIDATION_MAX_PATIENTS) || 50;

const PERIOD_CONFIGS = {
  daily: {
    lookbackDays: 1,
    granularity: "daily",
  },
  weekly: {
    lookbackDays: 7,
    granularity: "weekly",
  },
  monthly: {
    lookbackDays: 30,
    granularity: "monthly",
  },
};

// ============================================================
// FIND ACTIVE PATIENTS
// ============================================================

const findActivePatients = async (maxPatients) => {
  return Patient.find({ isActive: true })
    .sort({ updatedAt: 1 })
    .limit(maxPatients)
    .lean();
};

// ============================================================
// BUILD TIMESTAMP-AWARE SYMPTOM TIMELINE
// ============================================================
//
// Example output:
//   [
//     {
//       name: "fatigue",
//       dataPoints: [
//         { date: Aug 10, severity: 2, status: "new" },
//         { date: Aug 15, severity: 4, status: "worsening" },
//         { date: Aug 22, severity: 7, status: "worsening" },
//       ]
//     }
//   ]
//
// This allows Gemini to reason:
//   "fatigue severity increased from 2 → 4 → 7 over 12 days"
//

const buildSymptomTimeline = (events) => {
  const symptomMap = new Map();

  for (const event of events) {
    for (const symptom of event.symptoms || []) {
      if (!symptom?.name) continue;

      const key = symptom.name.toLowerCase();
      if (!symptomMap.has(key)) {
        symptomMap.set(key, {
          name: symptom.name,
          dataPoints: [],
        });
      }

      symptomMap.get(key).dataPoints.push({
        date: event.timestamp,
        severity: symptom.severity ?? null,
        status: symptom.status || "unknown",
      });
    }
  }

  // Sort data points chronologically for each symptom
  for (const symptom of symptomMap.values()) {
    symptom.dataPoints.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }

  return [...symptomMap.values()];
};

// ============================================================
// BUILD MEDICATION ADHERENCE TIMELINE
// ============================================================

const buildMedicationTimeline = (events) => {
  const medMap = new Map();

  for (const event of events) {
    for (const med of event.medications || []) {
      if (!med?.name) continue;

      const key = med.name;
      if (!medMap.has(key)) {
        medMap.set(key, {
          name: med.name,
          dataPoints: [],
        });
      }

      medMap.get(key).dataPoints.push({
        date: event.timestamp,
        adherence: med.adherence || "unknown",
      });
    }
  }

  for (const med of medMap.values()) {
    med.dataPoints.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }

  return [...medMap.values()];
};

// ============================================================
// BUILD MAJOR EVENTS
// ============================================================

const buildMajorEvents = (events, decisions) => {
  const majorEvents = [];

  for (const event of events) {
    // Include high/critical severity events
    if (["high", "critical"].includes(event.severity)) {
      majorEvents.push({
        timestamp: event.timestamp,
        type: event.eventType,
        summary: event.notes || `${event.eventType} event`,
        severity: event.severity,
      });
    }

    // Include worsening trajectory events
    if (event.trajectorySignal === "worsening") {
      majorEvents.push({
        timestamp: event.timestamp,
        type: "trajectory_change",
        summary: `Trajectory worsened (risk: ${event.riskScore || 0})`,
        severity: event.severity || "moderate",
      });
    }
  }

  for (const decision of decisions) {
    if (decision.decisionType !== "maintain_followup") {
      majorEvents.push({
        timestamp: decision.createdAt,
        type: "care_decision",
        summary: `${decision.decisionType}: ${decision.reasoning?.slice(0, 200) || "No reasoning"}`,
        severity: decision.riskLevel === "critical" ? "critical" :
                 decision.riskLevel === "high" ? "high" : "moderate",
      });
    }
  }

  // Sort chronologically
  majorEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return majorEvents;
};

// ============================================================
// BUILD RISK PROGRESSION
// ============================================================

const buildRiskProgression = (events) => {
  if (!events.length) {
    return {
      startScore: null,
      endScore: null,
      peakScore: null,
      trend: "unknown",
    };
  }

  const scores = events.map((e) => Number(e.riskScore) || 0);
  const startScore = scores[0];
  const endScore = scores[scores.length - 1];
  const peakScore = Math.max(...scores);

  let trend = "stable";
  if (endScore > startScore + 5) trend = "worsening";
  else if (endScore < startScore - 5) trend = "improving";

  return { startScore, endScore, peakScore, trend };
};

// ============================================================
// CONSOLIDATE ONE PATIENT
// ============================================================

export const consolidatePatientMemory = async (
  patient,
  granularity = "daily",
  lookbackDays = 1
) => {
  const patientId = patient._id.toString();
  const now = new Date();
  const periodStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const periodEnd = now;

  console.log(`\n🧠 MEMORY CONSOLIDATION → ${patient.patientCode}`);
  console.log(`   Patient: ${patient.name}`);
  console.log(`   Period: ${periodStart.toISOString().split("T")[0]} → ${periodEnd.toISOString().split("T")[0]}`);
  console.log(`   Granularity: ${granularity}`);

  // ── Retrieve raw events and decisions ──
  const [events, decisions] = await Promise.all([
    PatientEvent.find({
      patientId,
      timestamp: { $gte: periodStart, $lte: periodEnd },
    }).sort({ timestamp: 1 }).lean(),
    CareDecision.find({
      patientId,
      createdAt: { $gte: periodStart, $lte: periodEnd },
    }).sort({ createdAt: 1 }).lean(),
  ]);

  console.log(`   Events: ${events.length}, Decisions: ${decisions.length}`);

  if (events.length === 0) {
    console.log(`   ⚠️ No events for this period — skipping`);
    return {
      success: false,
      skipped: true,
      message: "No events available for this period",
      patientCode: patient.patientCode,
    };
  }

  // ── Build timestamp-aware data structures ──
  const symptomTimeline = buildSymptomTimeline(events);
  const medicationTimeline = buildMedicationTimeline(events);
  const majorEvents = buildMajorEvents(events, decisions);
  const riskProgression = buildRiskProgression(events);

  // ── Extract key signals ──
  const keySignals = [];
  for (const symptom of symptomTimeline) {
    const lastPoint = symptom.dataPoints[symptom.dataPoints.length - 1];
    if (lastPoint?.status === "worsening") {
      keySignals.push(`${symptom.name} is worsening`);
    }
    if (lastPoint?.status === "new") {
      keySignals.push(`New symptom: ${symptom.name}`);
    }
  }

  // ── Try AI-powered summary ──
  let aiResult = null;
  try {
    aiResult = await consolidateMemoryWithAI(patientId, {
      patient: { name: patient.name, patientCode: patient.patientCode },
      events: events.map((e) => ({
        timestamp: e.timestamp,
        symptoms: e.symptoms,
        vitals: e.vitals,
        medications: e.medications,
        severity: e.severity,
        riskScore: e.riskScore,
        trajectorySignal: e.trajectorySignal,
      })),
      decisions: decisions.map((d) => ({
        decisionType: d.decisionType,
        riskLevel: d.riskLevel,
        priority: d.priority,
      })),
    });
  } catch {
    // AI consolidation failed — use deterministic fallback
  }

  // ── Build natural language summary ──
  const summary = aiResult?.summary || buildDeterministicSummary({
    patient,
    events,
    decisions,
    symptomTimeline,
    riskProgression,
    majorEvents,
  });

  const confidence = aiResult?.confidence || (events.length >= 3 ? 0.8 : 0.6);

  // ── Store MemorySummary ──
  const memorySummary = await MemorySummary.create({
    patientId,
    periodStart,
    periodEnd,
    granularity,
    trajectory: riskProgression.trend,
    keySignals: aiResult?.keySignals?.length ? aiResult.keySignals : keySignals,
    majorEvents,
    interventions: decisions.map((d) => ({
      timestamp: d.createdAt,
      action: d.decisionType,
      outcome: d.status || "proposed",
    })),
    outcomes: [],
    riskProgression,
    symptomTimeline,
    medicationAdherence: medicationTimeline,
    summary,
    eventsAnalyzed: events.length,
    decisionsAnalyzed: decisions.length,
    sourceEventIds: events.map((e) => e._id),
    sourceDecisionIds: decisions.map((d) => d._id),
    generatedBy: aiResult ? "gemini" : "system",
    confidence,
    isActive: true,
    version: 1,
  });

  console.log(`   ✅ MemorySummary created: ${memorySummary._id}`);
  console.log(`   Events analyzed: ${events.length}`);
  console.log(`   Decisions analyzed: ${decisions.length}`);
  console.log(`   Symptoms tracked: ${symptomTimeline.length}`);

  return {
    success: true,
    patientCode: patient.patientCode,
    memoryId: memorySummary._id,
    eventsAnalyzed: events.length,
    decisionsAnalyzed: decisions.length,
    symptomTimeline: symptomTimeline.length,
    majorEvents: majorEvents.length,
  };
};

// ============================================================
// DETERMINISTIC SUMMARY FALLBACK
// ============================================================

const buildDeterministicSummary = ({
  patient,
  events,
  decisions,
  symptomTimeline,
  riskProgression,
  majorEvents,
}) => {
  const parts = [];

  parts.push(
    `${patient.name} had ${events.length} recorded event(s) over this period.`
  );

  if (riskProgression.trend !== "unknown") {
    parts.push(
      `Risk ${riskProgression.trend} from ${riskProgression.startScore} to ${riskProgression.endScore} (peak: ${riskProgression.peakScore}).`
    );
  }

  const worseningSymptoms = symptomTimeline.filter((s) => {
    const last = s.dataPoints[s.dataPoints.length - 1];
    return last?.status === "worsening" || last?.status === "new";
  });

  if (worseningSymptoms.length > 0) {
    parts.push(
      `Worsening/new symptoms: ${worseningSymptoms.map((s) => s.name).join(", ")}.`
    );
  }

  const medIssues = symptomTimeline.length; // Placeholder
  if (decisions.length > 0) {
    const actions = decisions.filter((d) => d.decisionType !== "maintain_followup");
    if (actions.length > 0) {
      parts.push(
        `${actions.length} care plan adjustment(s) were made: ${actions.map((d) => d.decisionType).join(", ")}.`
      );
    } else {
      parts.push("Current care plan was maintained throughout this period.");
    }
  }

  return parts.join(" ");
};

// ============================================================
// RUN MEMORY CONSOLIDATION BATCH
// ============================================================

export const runMemoryConsolidationBatch = async ({
  granularity = "daily",
  maxPatients = MAX_PATIENTS,
} = {}) => {
  const config = PERIOD_CONFIGS[granularity] || PERIOD_CONFIGS.daily;
  const startTime = Date.now();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧠 MEMORY CONSOLIDATION AGENT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Granularity: ${granularity}`);
  console.log(`Lookback: ${config.lookbackDays} day(s)`);
  console.log(`Max patients: ${maxPatients}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── Record the batch run ──
  const schedulerEvent = await SchedulerEvent.create({
    jobType: "memory_consolidation",
    triggerSource: "pubsub",
    status: "processing",
    startedAt: new Date(),
  });

  try {
    // ── Find active patients ──
    const patients = await findActivePatients(maxPatients);
    console.log(`👥 Active patients: ${patients.length}`);

    if (patients.length === 0) {
      console.log("✅ No active patients.\n");

      schedulerEvent.status = "completed";
      schedulerEvent.completedAt = new Date();
      schedulerEvent.durationMs = Date.now() - startTime;
      await schedulerEvent.save();

      return {
        success: true,
        batchId: schedulerEvent._id,
        processed: 0,
        successful: 0,
        skipped: 0,
        failed: 0,
        results: [],
      };
    }

    // ── Process each patient ──
    const results = [];

    for (const patient of patients) {
      try {
        const result = await consolidatePatientMemory(
          patient,
          config.granularity,
          config.lookbackDays
        );
        results.push(result);
      } catch (error) {
        console.error(`   ❌ Failed for ${patient.patientCode}: ${error.message}`);
        results.push({
          success: false,
          skipped: false,
          patientCode: patient.patientCode,
          error: error.message,
        });
      }
    }

    // ── Statistics ──
    const successful = results.filter((r) => r.success).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => !r.success && !r.skipped).length;

    const durationMs = Date.now() - startTime;

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 MEMORY CONSOLIDATION COMPLETED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Processed: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log(`Duration: ${durationMs}ms`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // ── Update scheduler event ──
    schedulerEvent.status = "completed";
    schedulerEvent.patientsSelected = patients.length;
    schedulerEvent.patientsProcessed = successful;
    schedulerEvent.patientsFailed = failed;
    schedulerEvent.results = { successful, skipped, failed };
    schedulerEvent.completedAt = new Date();
    schedulerEvent.durationMs = durationMs;
    await schedulerEvent.save();

    return {
      success: true,
      batchId: schedulerEvent._id,
      processed: results.length,
      successful,
      skipped,
      failed,
      results,
      durationMs,
    };
  } catch (error) {
    console.error("\n❌ MEMORY CONSOLIDATION BATCH FAILED:", error.message);

    schedulerEvent.status = "failed";
    schedulerEvent.error = error.message;
    schedulerEvent.completedAt = new Date();
    schedulerEvent.durationMs = Date.now() - startTime;
    await schedulerEvent.save();

    throw error;
  }
};
