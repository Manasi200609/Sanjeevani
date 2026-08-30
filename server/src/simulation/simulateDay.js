import Patient from "../models/Patient.js";
import { generateEvent } from "./generateEvents.js";

// ============================================================
// SIMULATE ONE DAY
// ============================================================
//
// Simulates one new patient interaction.
//
// Flow:
//
// Simulated Day
//      ↓
// Patient Event
//      ↓
// MongoDB Timeline
//
// The agent can consume this event separately.
//
// ============================================================


// ============================================================
// SIMULATE DAY FOR ONE PATIENT
// ============================================================

export const simulateDay = async ({
  patientId,
  scenario = "stable",
  date = new Date(),
  day = 0,
}) => {
  // ----------------------------------------------------------
  // Load patient
  // ----------------------------------------------------------

  const patient =
    await Patient.findById(patientId);

  if (!patient) {
    throw new Error(
      "Patient not found"
    );
  }

  // ----------------------------------------------------------
  // Generate event
  // ----------------------------------------------------------

  const event =
    generateEvent({
      patientId:
        patient._id,

      timestamp:
        date,

      scenario,

      day,
    });

  // ----------------------------------------------------------
  // Save event
  // ----------------------------------------------------------

  const PatientEvent =
    (
      await import(
        "../models/PatientEvent.js"
      )
    ).default;

  const savedEvent =
    await PatientEvent.create(
      event
    );

  // ----------------------------------------------------------
  // Update patient
  // ----------------------------------------------------------

  patient.lastVisitAt =
    savedEvent.timestamp;

  if (
    scenario === "worsening"
  ) {
    patient.currentState =
      "watch";

    patient.trajectoryStatus =
      "worsening";
  }

  if (
    scenario === "improving"
  ) {
    patient.currentState =
      "stable";

    patient.trajectoryStatus =
      "improving";
  }

  if (
    scenario === "stable"
  ) {
    patient.currentState =
      "stable";

    patient.trajectoryStatus =
      "stable";
  }

  await patient.save();

  // ----------------------------------------------------------
  // Return simulation result
  // ----------------------------------------------------------

  return {
    success: true,

    patient: {
      id:
        patient._id,

      patientCode:
        patient.patientCode,

      name:
        patient.name,
    },

    event: {
      id:
        savedEvent._id,

      timestamp:
        savedEvent.timestamp,

      severity:
        savedEvent.severity,

      riskScore:
        savedEvent.riskScore,

      trajectorySignal:
        savedEvent.trajectorySignal,

      symptoms:
        savedEvent.symptoms,

      medications:
        savedEvent.medications,
    },
  };
};


// ============================================================
// SIMULATE MULTIPLE DAYS
// ============================================================

export const simulateDays = async ({
  patientId,
  days = 5,
  scenario = "worsening",
  startDate = new Date(),
}) => {
  const results = [];

  for (
    let day = 0;
    day < days;
    day++
  ) {
    const eventDate =
      new Date(
        startDate
      );

    eventDate.setDate(
      eventDate.getDate() +
        day
    );

    eventDate.setHours(
      9,
      30,
      0,
      0
    );

    const result =
      await simulateDay({
        patientId,

        scenario,

        date:
          eventDate,

        day,
      });

    results.push(
      result
    );
  }

  return {
    success: true,

    patientId,

    scenario,

    daysSimulated:
      results.length,

    results,
  };
};


// ============================================================
// SIMULATE A FULL DEMO SCENARIO
// ============================================================
//
// This creates different trajectories for our demo patients.
//
// CT-101 → stable
// CT-102 → worsening
// CT-103 → stable
// CT-104 → worsening
// CT-105 → improving
//
// ============================================================

export const simulateDemoDay =
  async () => {
    const patients =
      await Patient.find({
        isActive: true,
      }).sort({
        patientCode: 1,
      });

    const results = [];

    for (
      const patient of patients
    ) {
      let scenario =
        "stable";

      // ------------------------------------------------------
      // Determine scenario
      // ------------------------------------------------------

      if (
        patient.patientCode ===
        "CT-102"
      ) {
        scenario =
          "worsening";
      }

      if (
        patient.patientCode ===
        "CT-104"
      ) {
        scenario =
          "worsening";
      }

      if (
        patient.patientCode ===
        "CT-105"
      ) {
        scenario =
          "improving";
      }

      // ------------------------------------------------------
      // Simulate today's event
      // ------------------------------------------------------

      const result =
        await simulateDay({
          patientId:
            patient._id,

          scenario,

          date:
            new Date(),

          day: 0,
        });

      results.push(
        result
      );
    }

    return {
      success: true,

      simulatedAt:
        new Date(),

      patientsProcessed:
        results.length,

      results,
    };
  };