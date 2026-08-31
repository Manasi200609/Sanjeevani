import Patient from "../models/Patient.js";
import AgentRun from "../models/AgentRun.js";
import SchedulerEvent from "../models/SchedulerEvent.js";

import { buildPatientContext } from "../memory/contextBuilder.js";
import { runCareFlowAgentSafely } from "../agents/orchestrator.js";

import {
  getPatientsRequiringAttention,
} from "./followUpMonitor.js";

// ============================================================
// PATIENT REASSESSMENT AGENT
// ============================================================
//
// Autonomous execution flow:
//
//   Cloud Scheduler
//        ↓ (every 6 hours)
//   Pub/Sub topic: careflow-patient-reassessment
//        ↓
//   Cloud Run Job: patient-reassessment-job
//        ↓
//   runPatientReassessmentBatch()
//        ↓
//   For each patient needing attention:
//        ↓
//     buildPatientContext()
//        ↓
//     Gemini reasons over longitudinal data
//        ↓
//     CareDecision created (if warranted)
//        ↓
//     CarePlan updated (if warranted)
//        ↓
//     MemorySummary updated
//        ↓
//     AgentRun recorded
//        ↓
//     SchedulerEvent recorded
//
// ============================================================

// ============================================================
// CONFIGURATION
// ============================================================

const MAX_PATIENTS_PER_RUN = Number(process.env.REASSESSMENT_MAX_PATIENTS) || 20;
const BATCH_TIMEOUT_MS = Number(process.env.REASSESSMENT_TIMEOUT_MS) || 300000; // 5 minutes

// ============================================================
// FIND PATIENTS REQUIRING REASSESSMENT
// ============================================================

export const findPatientsForReassessment = async () => {
  // Get all patients that require attention:
  // - follow-up is due
  // - trajectory is worsening
  // - priority is elevated/high/critical
  // - state is urgent
  const candidates = await getPatientsRequiringAttention();

  // Limit batch size
  return candidates.slice(0, MAX_PATIENTS_PER_RUN);
};

// ============================================================
// BUILD PATIENT CONTEXT FOR REASSESSMENT
// ============================================================

export const buildReassessmentContext = async (patientId) => {
  const context = await buildPatientContext(patientId, {
    recentEventLimit: 15,
    recentDecisionLimit: 10,
    memoryLimit: 5,
  });

  // Add assessment-specific metadata
  return {
    ...context,
    assessmentType: "scheduled_reassessment",
    assessedAt: new Date(),
    // Expose timestamp-ordered event data for trajectory reasoning
    timestampedEvents: (context.recentTimeline || [])
      .map((e) => ({
        timestamp: e.timestamp,
        riskScore: e.riskScore,
        severity: e.severity,
        trajectorySignal: e.trajectorySignal,
        symptoms: (e.symptoms || []).map((s) => ({
          name: s.name,
          severity: s.severity,
          status: s.status,
          timestamp: e.timestamp,
        })),
        medications: (e.medications || []).map((m) => ({
          name: m.name,
          adherence: m.adherence,
          timestamp: e.timestamp,
        })),
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
  };
};

// ============================================================
// REASSESS A SINGLE PATIENT
// ============================================================

export const reassessPatient = async (patient, batchId = null) => {
  const patientId = patient._id.toString();

  console.log(`\n🔄 REASSESSING → ${patient.patientCode}`);
  console.log(`   Patient: ${patient.name}`);
  console.log(`   Trajectory: ${patient.trajectoryStatus}`);
  console.log(`   Priority: ${patient.priority}`);
  console.log(`   Follow-up due: ${patient.followUp?.nextFollowUpAt || "N/A"}`);

  try {
    // Build rich context for the agent
    const context = await buildReassessmentContext(patientId);

    // Run the CareFlow agent with reassessment trigger
    // The agent will:
    // 1. Use Gemini to reason over longitudinal data
    // 2. Decide if the current care plan is appropriate
    // 3. Create a CareDecision if warranted
    // 4. Update the CarePlan if warranted
    // 5. Record AgentRun + AgentEvents
    const result = await runCareFlowAgentSafely({
      patientId,
      trigger: "patient_reassessment",
    });

    if (result.success) {
      console.log(`   ✅ Reassessment complete: ${result.result?.run?.executedAction || "no action"}`);
    } else {
      console.log(`   ❌ Reassessment failed: ${result.error}`);
    }

    return {
      success: result.success,
      patientId,
      patientCode: patient.patientCode,
      patientName: patient.name,
      action: result.result?.run?.executedAction || null,
      decisionId: result.result?.decision?._id || null,
      error: result.error || null,
    };
  } catch (error) {
    console.error(`   ❌ Reassessment error for ${patient.patientCode}:`, error.message);
    return {
      success: false,
      patientId,
      patientCode: patient.patientCode,
      patientName: patient.name,
      error: error.message,
    };
  }
};

// ============================================================
// RUN FULL REASSESSMENT BATCH
// ============================================================

export const runPatientReassessmentBatch = async ({
  maxPatients = MAX_PATIENTS_PER_RUN,
} = {}) => {
  const startTime = Date.now();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 PATIENT REASSESSMENT AGENT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Max patients: ${maxPatients}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── Record the batch run ──
  const schedulerEvent = await SchedulerEvent.create({
    jobType: "patient_reassessment",
    triggerSource: "pubsub",
    status: "processing",
    startedAt: new Date(),
  });

  try {
    // ── Find patients ──
    const patients = await findPatientsForReassessment();

    console.log(`📋 Patients requiring reassessment: ${patients.length}`);

    if (patients.length === 0) {
      console.log("✅ No patients require reassessment right now.\n");

      schedulerEvent.status = "completed";
      schedulerEvent.patientsSelected = 0;
      schedulerEvent.completedAt = new Date();
      schedulerEvent.durationMs = Date.now() - startTime;
      await schedulerEvent.save();

      return {
        success: true,
        batchId: schedulerEvent._id,
        patientsSelected: 0,
        patientsProcessed: 0,
        patientsFailed: 0,
        results: [],
        durationMs: schedulerEvent.durationMs,
      };
    }

    // ── Process each patient sequentially ──
    const results = [];

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      console.log(`\n[${i + 1}/${patients.length}] ──────────────────────────`);

      // Timeout guard per patient
      const patientPromise = reassessPatient(patient, schedulerEvent._id);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${BATCH_TIMEOUT_MS}ms`)), BATCH_TIMEOUT_MS)
      );

      try {
        const result = await Promise.race([patientPromise, timeoutPromise]);
        results.push(result);
      } catch (error) {
        console.error(`   ❌ Patient ${patient.patientCode} timed out or failed: ${error.message}`);
        results.push({
          success: false,
          patientId: patient._id,
          patientCode: patient.patientCode,
          patientName: patient.name,
          error: error.message,
        });
      }
    }

    // ── Statistics ──
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const actionsTaken = results.filter((r) => r.success && r.action && r.action !== "maintain_followup").length;

    const durationMs = Date.now() - startTime;

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 REASSESSMENT BATCH COMPLETED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Patients selected: ${patients.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Actions taken: ${actionsTaken}`);
    console.log(`Duration: ${durationMs}ms`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // ── Update scheduler event ──
    schedulerEvent.status = failed > 0 ? "completed" : "completed";
    schedulerEvent.patientsSelected = patients.length;
    schedulerEvent.patientsProcessed = successful;
    schedulerEvent.patientsFailed = failed;
    schedulerEvent.results = {
      successful,
      failed,
      actionsTaken,
      details: results.map((r) => ({
        patientCode: r.patientCode,
        success: r.success,
        action: r.action || null,
        error: r.error || null,
      })),
    };
    schedulerEvent.completedAt = new Date();
    schedulerEvent.durationMs = durationMs;
    await schedulerEvent.save();

    return {
      success: true,
      batchId: schedulerEvent._id,
      patientsSelected: patients.length,
      patientsProcessed: successful,
      patientsFailed: failed,
      actionsTaken,
      results,
      durationMs,
    };
  } catch (error) {
    console.error("\n❌ REASSESSMENT BATCH FAILED:", error.message);

    schedulerEvent.status = "failed";
    schedulerEvent.error = error.message;
    schedulerEvent.completedAt = new Date();
    schedulerEvent.durationMs = Date.now() - startTime;
    await schedulerEvent.save();

    throw error;
  }
};
