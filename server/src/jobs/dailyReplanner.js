import Patient from "../models/Patient.js";

import {
  getPatientsRequiringAttention,
} from "./followUpMonitor.js";

import {
  runCareFlowAgent,
} from "../agents/orchestrator.js";

// ============================================================
// DAILY REPLANNER
// ============================================================
//
// Purpose:
//
// The follow-up monitor tells us WHICH patients need attention.
//
// The daily replanner decides WHICH of those patients should
// actually be processed by the CareFlow agent.
//
// Flow:
//
//     Follow-up Monitor
//            ↓
//     Patients requiring attention
//            ↓
//       Daily Replanner
//            ↓
//       CareFlow Agent
//            ↓
//     Observe → Reason → Plan → Execute
//
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_MAX_PATIENTS = 20;


// ============================================================
// DETERMINE WHETHER PATIENT NEEDS REPLANNING
// ============================================================

const needsReplanning = (patient) => {
  // ----------------------------------------------------------
  // Urgent state
  // ----------------------------------------------------------

  if (
    patient.currentState === "urgent"
  ) {
    return true;
  }

  // ----------------------------------------------------------
  // Worsening trajectory
  // ----------------------------------------------------------

  if (
    patient.trajectoryStatus ===
    "worsening"
  ) {
    return true;
  }

  // ----------------------------------------------------------
  // Elevated priority
  // ----------------------------------------------------------

  if (
    [
      "elevated",
      "high",
      "critical",
    ].includes(patient.priority)
  ) {
    return true;
  }

  // ----------------------------------------------------------
  // Follow-up is due
  // ----------------------------------------------------------

  if (
    patient.followUp?.required &&
    patient.followUp?.nextFollowUpAt
  ) {
    const now = new Date();

    const nextFollowUp =
      new Date(
        patient.followUp.nextFollowUpAt
      );

    if (
      nextFollowUp <= now
    ) {
      return true;
    }
  }

  return false;
};


// ============================================================
// PRIORITIZE PATIENTS
// ============================================================

const prioritizePatients = (
  patients
) => {
  const priorityRank = {
    critical: 0,
    high: 1,
    elevated: 2,
    normal: 3,
    low: 4,
  };

  return [...patients].sort(
    (a, b) => {
      const aRank =
        priorityRank[
          a.priority
        ] ?? 99;

      const bRank =
        priorityRank[
          b.priority
        ] ?? 99;

      if (
        aRank !== bRank
      ) {
        return (
          aRank - bRank
        );
      }

      // Worsening patients before stable
      if (
        a.trajectoryStatus ===
          "worsening" &&
        b.trajectoryStatus !==
          "worsening"
      ) {
        return -1;
      }

      if (
        b.trajectoryStatus ===
          "worsening" &&
        a.trajectoryStatus !==
          "worsening"
      ) {
        return 1;
      }

      // Earlier follow-up first
      const aDate =
        a.followUp
          ?.nextFollowUpAt
          ? new Date(
              a.followUp
                .nextFollowUpAt
            ).getTime()
          : Infinity;

      const bDate =
        b.followUp
          ?.nextFollowUpAt
          ? new Date(
              b.followUp
                .nextFollowUpAt
            ).getTime()
          : Infinity;

      return (
        aDate - bDate
      );
    }
  );
};


// ============================================================
// GET DAILY REPLANNING QUEUE
// ============================================================

export const buildDailyReplanningQueue =
  async ({
    maxPatients =
      DEFAULT_MAX_PATIENTS,
  } = {}) => {
    // --------------------------------------------------------
    // Get patients identified by follow-up monitor
    // --------------------------------------------------------

    const candidates =
      await getPatientsRequiringAttention();

    // --------------------------------------------------------
    // Filter patients that genuinely need replanning
    // --------------------------------------------------------

    const patients =
      candidates.filter(
        needsReplanning
      );

    // --------------------------------------------------------
    // Prioritize
    // --------------------------------------------------------

    const prioritized =
      prioritizePatients(
        patients
      );

    // --------------------------------------------------------
    // Limit workload
    // --------------------------------------------------------

    const selected =
      prioritized.slice(
        0,
        maxPatients
      );

    return {
      generatedAt:
        new Date(),

      candidates:
        candidates.length,

      requiringReplanning:
        patients.length,

      selected:
        selected.length,

      patients:
        selected,
    };
  };


// ============================================================
// RUN AGENT FOR ONE PATIENT
// ============================================================

const replanPatient = async (
  patient
) => {
  const patientId =
    patient._id.toString();

  console.log(
    `\n🔄 DAILY REPLANNER → ${patient.patientCode}`
  );

  console.log(
    `   Patient: ${patient.name}`
  );

  console.log(
    `   Trajectory: ${patient.trajectoryStatus}`
  );

  console.log(
    `   Priority: ${patient.priority}`
  );

  try {
    const result =
      await runCareFlowAgent({
        patientId,
        trigger:
          "scheduled_monitor",
      });

    return {
      success: true,

      patientId,

      patientCode:
        patient.patientCode,

      result,
    };
  } catch (error) {
    console.error(
      `❌ Replanning failed for ${patient.patientCode}:`,
      error.message
    );

    return {
      success: false,

      patientId,

      patientCode:
        patient.patientCode,

      error:
        error.message,
    };
  }
};


// ============================================================
// RUN DAILY REPLANNER
// ============================================================

export const runDailyReplanner =
  async ({
    maxPatients =
      DEFAULT_MAX_PATIENTS,
  } = {}) => {
    console.log(
      "\n========================================"
    );

    console.log(
      "🤖 CAREFLOW DAILY REPLANNER"
    );

    console.log(
      "========================================"
    );

    // --------------------------------------------------------
    // Build queue
    // --------------------------------------------------------

    const queue =
      await buildDailyReplanningQueue({
        maxPatients,
      });

    console.log(
      `📋 Candidates: ${queue.candidates}`
    );

    console.log(
      `⚠️ Requiring replanning: ${queue.requiringReplanning}`
    );

    console.log(
      `🎯 Selected: ${queue.selected}`
    );

    // --------------------------------------------------------
    // Nothing to process
    // --------------------------------------------------------

    if (
      queue.patients.length === 0
    ) {
      console.log(
        "✅ No patients require replanning."
      );

      console.log(
        "========================================\n"
      );

      return {
        success: true,

        queue,

        processed: 0,

        successful: 0,

        failed: 0,

        results: [],
      };
    }

    // --------------------------------------------------------
    // Process patients sequentially
    // --------------------------------------------------------
    //
    // We intentionally process sequentially for now.
    //
    // Later we can introduce controlled concurrency,
    // rate limiting and agent scheduling.
    //
    // --------------------------------------------------------

    const results = [];

    for (
      const patient of
        queue.patients
    ) {
      const result =
        await replanPatient(
          patient
        );

      results.push(
        result
      );
    }

    // --------------------------------------------------------
    // Calculate statistics
    // --------------------------------------------------------

    const successful =
      results.filter(
        (result) =>
          result.success
      ).length;

    const failed =
      results.length -
      successful;

    console.log(
      "\n========================================"
    );

    console.log(
      "📊 DAILY REPLANNER COMPLETED"
    );

    console.log(
      `Processed: ${results.length}`
    );

    console.log(
      `Successful: ${successful}`
    );

    console.log(
      `Failed: ${failed}`
    );

    console.log(
      "========================================\n"
    );

    return {
      success:
        failed === 0,

      queue,

      processed:
        results.length,

      successful,

      failed,

      results,
    };
  };


// ============================================================
// RUN REPLANNER FOR A SINGLE PATIENT
// ============================================================

export const replanSinglePatient =
  async (patientId) => {
    const patient =
      await Patient.findById(
        patientId
      );

    if (!patient) {
      throw new Error(
        "Patient not found"
      );
    }

    return replanPatient(
      patient
    );
  };