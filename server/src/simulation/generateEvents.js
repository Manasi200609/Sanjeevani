import Patient from "../models/Patient.js";
import PatientEvent from "../models/PatientEvent.js";

// ============================================================
// EVENT GENERATOR
// ============================================================
//
// Generates realistic patient events for development/demo use.
//
// These events simulate what an ASHA worker might record during
// repeated visits.
//
// Flow:
//
// Patient
//   ↓
// generateEvents()
//   ↓
// PatientEvent timeline
//   ↓
// Trajectory Agent
//   ↓
// CareFlow decision
//
// ============================================================


// ============================================================
// RANDOM HELPERS
// ============================================================

const randomBetween = (
  min,
  max
) => {
  return Math.floor(
    Math.random() *
      (max - min + 1)
  ) + min;
};


const randomChoice = (
  values
) => {
  return values[
    Math.floor(
      Math.random() *
        values.length
    )
  ];
};


// ============================================================
// GENERATE VITALS
// ============================================================

const generateVitals = (
  scenario = "stable"
) => {
  if (scenario === "worsening") {
    return {
      temperature:
        Number(
          (
            37.2 +
            Math.random() * 0.8
          ).toFixed(1)
        ),

      heartRate:
        randomBetween(82, 96),

      systolicBP:
        randomBetween(128, 145),

      diastolicBP:
        randomBetween(82, 94),

      oxygenSaturation:
        randomBetween(95, 98),
    };
  }

  if (scenario === "improving") {
    return {
      temperature:
        Number(
          (
            36.6 +
            Math.random() * 0.4
          ).toFixed(1)
        ),

      heartRate:
        randomBetween(68, 80),

      systolicBP:
        randomBetween(115, 128),

      diastolicBP:
        randomBetween(72, 84),

      oxygenSaturation:
        randomBetween(97, 99),
    };
  }

  return {
    temperature:
      Number(
        (
          36.6 +
          Math.random() * 0.5
        ).toFixed(1)
      ),

    heartRate:
      randomBetween(68, 82),

    systolicBP:
      randomBetween(115, 128),

    diastolicBP:
      randomBetween(72, 84),

    oxygenSaturation:
      randomBetween(97, 99),
  };
};


// ============================================================
// GENERATE SYMPTOMS
// ============================================================

const generateSymptoms = (
  scenario,
  day
) => {
  // ----------------------------------------------------------
  // Stable
  // ----------------------------------------------------------

  if (scenario === "stable") {
    return [
      {
        name: "fatigue",

        severity:
          randomBetween(1, 2),

        status: "stable",
      },
    ];
  }

  // ----------------------------------------------------------
  // Improving
  // ----------------------------------------------------------

  if (scenario === "improving") {
    return [
      {
        name: "fatigue",

        severity:
          Math.max(
            1,
            4 - day
          ),

        status:
          day >= 2
            ? "improving"
            : "stable",
      },
    ];
  }

  // ----------------------------------------------------------
  // Worsening
  // ----------------------------------------------------------

  const symptoms = [
    {
      name: "fatigue",

      severity:
        Math.min(
          5,
          2 + day
        ),

      status:
        day === 0
          ? "stable"
          : "worsening",
    },
  ];

  // New symptom appears later
  if (day >= 2) {
    symptoms.push({
      name: "dizziness",

      severity:
        randomBetween(2, 4),

      status:
        day === 2
          ? "new"
          : "worsening",
    });
  }

  // Occasional additional symptom
  if (day >= 3) {
    symptoms.push({
      name: "weakness",

      severity:
        randomBetween(2, 3),

      status: "new",
    });
  }

  return symptoms;
};


// ============================================================
// GENERATE MEDICATION DATA
// ============================================================

const generateMedications = (
  scenario
) => {
  let adherence = "good";

  let notes =
    "Taking medication regularly.";

  if (scenario === "worsening") {
    adherence =
      randomChoice([
        "partial",
        "partial",
        "poor",
      ]);

    notes =
      adherence === "poor"
        ? "Patient missed medication on several days."
        : "Patient missed medication on some days.";
  }

  if (scenario === "improving") {
    adherence = "good";

    notes =
      "Patient reports consistent medication adherence.";
  }

  return [
    {
      name:
        "Prescribed medication",

      adherence,

      notes,
    },
  ];
};


// ============================================================
// CALCULATE RISK SCORE
// ============================================================

const calculateRiskScore = (
  scenario,
  day
) => {
  if (scenario === "worsening") {
    return Math.min(
      80,
      18 +
        day * 8
    );
  }

  if (scenario === "improving") {
    return Math.max(
      10,
      35 -
        day * 7
    );
  }

  return randomBetween(
    15,
    22
  );
};


// ============================================================
// DETERMINE EVENT SEVERITY
// ============================================================

const determineSeverity = (
  riskScore
) => {
  if (riskScore >= 70) {
    return "critical";
  }

  if (riskScore >= 50) {
    return "high";
  }

  if (riskScore >= 30) {
    return "moderate";
  }

  return "low";
};


// ============================================================
// GENERATE EVENT
// ============================================================

export const generateEvent = ({
  patientId,
  timestamp,
  scenario = "stable",
  day = 0,
}) => {
  const riskScore =
    calculateRiskScore(
      scenario,
      day
    );

  const symptoms =
    generateSymptoms(
      scenario,
      day
    );

  const medications =
    generateMedications(
      scenario
    );

  const trajectorySignal =
    scenario === "worsening"
      ? "worsening"
      : scenario === "improving"
      ? "improving"
      : "stable";

  let notes =
    "Patient is stable. No immediate concerns.";

  if (
    scenario === "worsening"
  ) {
    notes =
      day >= 2
        ? "Symptoms are worsening. New dizziness reported and medication adherence is incomplete."
        : "Patient reports increasing fatigue.";
  }

  if (
    scenario === "improving"
  ) {
    notes =
      "Patient reports improvement in symptoms and good medication adherence.";
  }

  return {
    patientId,

    eventType: "visit",

    source: "simulation",

    timestamp,

    symptoms,

    vitals:
      generateVitals(
        scenario
      ),

    medications,

    notes,

    severity:
      determineSeverity(
        riskScore
      ),

    riskScore,

    trajectorySignal,

    aiAnalysis: null,
  };
};


// ============================================================
// GENERATE MULTIPLE EVENTS
// ============================================================

export const generatePatientEvents =
  async ({
    patientId,
    days = 5,
    scenario = "worsening",
    startDate = new Date(),
  }) => {
    const patient =
      await Patient.findById(
        patientId
      );

    if (!patient) {
      throw new Error(
        "Patient not found"
      );
    }

    const events = [];

    for (
      let day = 0;
      day < days;
      day++
    ) {
      const timestamp =
        new Date(
          startDate
        );

      timestamp.setDate(
        timestamp.getDate() +
          day
      );

      timestamp.setHours(
        9,
        30,
        0,
        0
      );

      const event =
        generateEvent({
          patientId,
          timestamp,
          scenario,
          day,
        });

      events.push(
        event
      );
    }

    const createdEvents =
      await PatientEvent.insertMany(
        events
      );

    // --------------------------------------------------------
    // Update patient's latest visit
    // --------------------------------------------------------

    const latestEvent =
      createdEvents[
        createdEvents.length - 1
      ];

    patient.lastVisitAt =
      latestEvent.timestamp;

    patient.currentState =
      scenario === "worsening"
        ? "watch"
        : scenario === "improving"
        ? "stable"
        : "stable";

    patient.trajectoryStatus =
      scenario;

    await patient.save();

    return {
      patientId,

      patientCode:
        patient.patientCode,

      scenario,

      eventsCreated:
        createdEvents.length,

      events:
        createdEvents,
    };
  };


// ============================================================
// GENERATE EVENTS FOR ALL DEMO PATIENTS
// ============================================================

export const generateDemoEvents =
  async ({
    days = 5,
  } = {}) => {
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

      // Give demo patients different trajectories
      if (
        patient.patientCode ===
        "CT-102"
      ) {
        scenario =
          "worsening";
      } else if (
        patient.patientCode ===
        "CT-104"
      ) {
        scenario =
          "worsening";
      } else if (
        patient.patientCode ===
        "CT-105"
      ) {
        scenario =
          "improving";
      }

      const result =
        await generatePatientEvents(
          {
            patientId:
              patient._id,

            days,

            scenario,

            startDate:
              new Date(
                Date.now() -
                  days *
                    24 *
                    60 *
                    60 *
                    1000
              ),
          }
        );

      results.push(
        result
      );
    }

    return {
      success: true,

      patientsProcessed:
        results.length,

      results,
    };
  };