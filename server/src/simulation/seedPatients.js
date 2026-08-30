import Patient from "../models/Patient.js";

// ============================================================
// SEED PATIENTS
// ============================================================
//
// Creates realistic demo patients for development/testing.
//
// IMPORTANT:
// This file should ONLY be used for development/demo data.
// It should not be used with real patient information.
//
// ============================================================


// ============================================================
// DEMO PATIENTS
// ============================================================

const demoPatients = [
  {
    patientCode: "CT-101",

    name: "Asha Pawar",

    age: 38,

    gender: "female",

    preferredLanguage: "Marathi",

    location: {
      village: "Khed",
      district: "Pune",
      state: "Maharashtra",
    },

    baselineState: "stable",

    currentState: "stable",

    trajectoryStatus: "stable",

    priority: "normal",

    followUp: {
      required: true,
      intervalDays: 7,
      nextFollowUpAt: null,
    },

    lastVisitAt: null,

    isActive: true,
  },

  {
    patientCode: "CT-102",

    name: "Meena Patil",

    age: 62,

    gender: "female",

    preferredLanguage: "Hindi",

    location: {
      village: "Baramati",
      district: "Pune",
      state: "Maharashtra",
    },

    baselineState: "stable",

    currentState: "watch",

    trajectoryStatus: "worsening",

    priority: "elevated",

    followUp: {
      required: true,
      intervalDays: 3,
      nextFollowUpAt: null,
    },

    lastVisitAt: null,

    isActive: true,
  },

  {
    patientCode: "CT-103",

    name: "Suresh Shinde",

    age: 55,

    gender: "male",

    preferredLanguage: "Marathi",

    location: {
      village: "Daund",
      district: "Pune",
      state: "Maharashtra",
    },

    baselineState: "stable",

    currentState: "stable",

    trajectoryStatus: "stable",

    priority: "normal",

    followUp: {
      required: true,
      intervalDays: 14,
      nextFollowUpAt: null,
    },

    lastVisitAt: null,

    isActive: true,
  },

  {
    patientCode: "CT-104",

    name: "Lata Jadhav",

    age: 71,

    gender: "female",

    preferredLanguage: "Marathi",

    location: {
      village: "Shirur",
      district: "Pune",
      state: "Maharashtra",
    },

    baselineState: "stable",

    currentState: "watch",

    trajectoryStatus: "worsening",

    priority: "high",

    followUp: {
      required: true,
      intervalDays: 2,
      nextFollowUpAt: null,
    },

    lastVisitAt: null,

    isActive: true,
  },

  {
    patientCode: "CT-105",

    name: "Rahul More",

    age: 29,

    gender: "male",

    preferredLanguage: "Hindi",

    location: {
      village: "Indapur",
      district: "Pune",
      state: "Maharashtra",
    },

    baselineState: "stable",

    currentState: "stable",

    trajectoryStatus: "improving",

    priority: "low",

    followUp: {
      required: true,
      intervalDays: 14,
      nextFollowUpAt: null,
    },

    lastVisitAt: null,

    isActive: true,
  },
];


// ============================================================
// SEED FUNCTION
// ============================================================

export const seedPatients = async () => {
  console.log(
    "\n========================================"
  );

  console.log(
    "🌱 CAREFLOW PATIENT SEEDER"
  );

  console.log(
    "========================================"
  );

  let created = 0;

  let existing = 0;

  // ----------------------------------------------------------
  // Process each patient
  // ----------------------------------------------------------

  for (
    const patientData of demoPatients
  ) {
    const alreadyExists =
      await Patient.findOne({
        patientCode:
          patientData.patientCode,
      });

    // --------------------------------------------------------
    // Don't create duplicates
    // --------------------------------------------------------

    if (alreadyExists) {
      console.log(
        `⏭️ ${patientData.patientCode} already exists`
      );

      existing++;

      continue;
    }

    // --------------------------------------------------------
    // Create patient
    // --------------------------------------------------------

    const patient =
      await Patient.create(
        patientData
      );

    console.log(
      `✅ Created ${patient.patientCode} — ${patient.name}`
    );

    created++;
  }

  // ----------------------------------------------------------
  // Summary
  // ----------------------------------------------------------

  console.log(
    "\n========================================"
  );

  console.log(
    "📊 SEEDING COMPLETED"
  );

  console.log(
    `Created: ${created}`
  );

  console.log(
    `Already existed: ${existing}`
  );

  console.log(
    `Total demo patients: ${demoPatients.length}`
  );

  console.log(
    "========================================\n"
  );

  return {
    success: true,

    created,

    existing,

    total:
      demoPatients.length,
  };
};


// ============================================================
// EXPORT DEMO DATA
// ============================================================

export {
  demoPatients,
};