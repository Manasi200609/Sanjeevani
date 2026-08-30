import Patient from "../models/Patient.js";

import {
  consolidateRecentMemory,
} from "../memory/memoryConsolidation.js";

// ============================================================
// MEMORY CONSOLIDATION JOB
// ============================================================
//
// Purpose:
//
// Periodically convert a patient's accumulated timeline into
// compact long-term memory.
//
// Flow:
//
// Patient Events
//      ↓
// Memory Consolidation
//      ↓
// Long-term Memory
//      ↓
// Context Builder
//      ↓
// Future Agent Runs
//
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_MAX_PATIENTS = 50;


// ============================================================
// GET PATIENTS FOR MEMORY CONSOLIDATION
// ============================================================

export const getPatientsForMemoryConsolidation =
  async ({
    maxPatients =
      DEFAULT_MAX_PATIENTS,
  } = {}) => {
    const patients =
      await Patient.find({
        isActive: true,
      })
        .sort({
          updatedAt: 1,
        })
        .limit(maxPatients);

    return patients;
  };


// ============================================================
// CONSOLIDATE ONE PATIENT
// ============================================================

const consolidatePatient = async (
  patient
) => {
  const patientId =
    patient._id.toString();

  console.log(
    `\n🧠 MEMORY CONSOLIDATION → ${patient.patientCode}`
  );

  console.log(
    `   Patient: ${patient.name}`
  );

  try {
    const result =
      await consolidateRecentMemory(
        patientId
      );

    if (!result.success) {
      console.log(
        `   ⚠️ ${result.message}`
      );

      return {
        success: false,

        skipped: true,

        patientId,

        patientCode:
          patient.patientCode,

        message:
          result.message,
      };
    }

    console.log(
      `   ✅ Memory created`
    );

    console.log(
      `   Events analyzed: ${result.eventsAnalyzed}`
    );

    console.log(
      `   Decisions analyzed: ${result.decisionsAnalyzed}`
    );

    return {
      success: true,

      patientId,

      patientCode:
        patient.patientCode,

      memoryId:
        result.memory?._id,

      eventsAnalyzed:
        result.eventsAnalyzed,

      decisionsAnalyzed:
        result.decisionsAnalyzed,
    };
  } catch (error) {
    console.error(
      `   ❌ Memory consolidation failed: ${error.message}`
    );

    return {
      success: false,

      skipped: false,

      patientId,

      patientCode:
        patient.patientCode,

      error:
        error.message,
    };
  }
};


// ============================================================
// RUN MEMORY CONSOLIDATION JOB
// ============================================================

export const runMemoryConsolidationJob =
  async ({
    maxPatients =
      DEFAULT_MAX_PATIENTS,
  } = {}) => {
    console.log(
      "\n========================================"
    );

    console.log(
      "🧠 CAREFLOW MEMORY CONSOLIDATION JOB"
    );

    console.log(
      "========================================"
    );

    // --------------------------------------------------------
    // Get active patients
    // --------------------------------------------------------

    const patients =
      await getPatientsForMemoryConsolidation(
        {
          maxPatients,
        }
      );

    console.log(
      `👥 Patients selected: ${patients.length}`
    );

    // --------------------------------------------------------
    // No patients
    // --------------------------------------------------------

    if (
      patients.length === 0
    ) {
      console.log(
        "✅ No active patients found."
      );

      console.log(
        "========================================\n"
      );

      return {
        success: true,

        processed: 0,

        successful: 0,

        skipped: 0,

        failed: 0,

        results: [],
      };
    }

    // --------------------------------------------------------
    // Process sequentially
    // --------------------------------------------------------

    const results = [];

    for (
      const patient of patients
    ) {
      const result =
        await consolidatePatient(
          patient
        );

      results.push(
        result
      );
    }

    // --------------------------------------------------------
    // Statistics
    // --------------------------------------------------------

    const successful =
      results.filter(
        (result) =>
          result.success
      ).length;

    const skipped =
      results.filter(
        (result) =>
          result.skipped
      ).length;

    const failed =
      results.filter(
        (result) =>
          !result.success &&
          !result.skipped
      ).length;

    console.log(
      "\n========================================"
    );

    console.log(
      "📊 MEMORY CONSOLIDATION COMPLETED"
    );

    console.log(
      `Processed: ${results.length}`
    );

    console.log(
      `Successful: ${successful}`
    );

    console.log(
      `Skipped: ${skipped}`
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

      processed:
        results.length,

      successful,

      skipped,

      failed,

      results,
    };
  };


// ============================================================
// CONSOLIDATE ONE PATIENT MANUALLY
// ============================================================

export const consolidateSinglePatient =
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

    return consolidatePatient(
      patient
    );
  };