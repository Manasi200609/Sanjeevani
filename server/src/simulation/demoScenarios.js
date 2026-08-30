// ============================================================
// DEMO SCENARIO SEED
// ============================================================
//
// Creates realistic longitudinal patient data for testing
// the CareFlow agent's autonomous decision-making.
//
// Scenario: Savita Jadhav
// - 21-day longitudinal history showing stable → worsening trajectory
// - 3 earlier events with gradually increasing symptoms
// - Latest event triggers agent to change care plan
//
// ============================================================

import Patient from "../models/Patient.js";
import PatientEvent from "../models/PatientEvent.js";
import CarePlan from "../models/CarePlan.js";
import CareDecision from "../models/CareDecision.js";
import AgentRun from "../models/AgentRun.js";
import AgentEvent from "../models/AgentEvent.js";
import Memory from "../models/Memory.js";

// ============================================================
// DEMO PATIENT: SAVITA JADHAV
// ============================================================

const SAVITA_PATIENT = {
  patientCode: "CT-200",
  name: "Savita Jadhav",
  age: 52,
  gender: "female",
  preferredLanguage: "Marathi",
  location: {
    village: "Wadgaon",
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
};

// ============================================================
// LONGITUDINAL EVENTS (spread over 21 days)
// ============================================================

const now = new Date();
const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

const SAVITA_EVENTS = [
  // --------------------------------------------------------
  // DAY -21: Baseline visit — stable, no concerning symptoms
  // --------------------------------------------------------
  {
    daysOffset: -21,
    eventType: "visit",
    source: "asha_worker",
    symptoms: [
      { name: "fatigue", severity: 2, status: "stable" },
    ],
    medications: [
      { name: "Metformin 500mg", adherence: "good", notes: "Regular intake" },
    ],
    vitals: {
      heartRate: 72,
      systolicBP: 128,
      diastolicBP: 82,
      oxygenSaturation: 97,
    },
    notes: "Routine visit. Patient reports feeling well. No new complaints. Medication adherence good.",
    severity: "low",
    riskScore: 12,
    trajectorySignal: "stable",
  },
  // --------------------------------------------------------
  // DAY -14: Mild fatigue developing
  // --------------------------------------------------------
  {
    daysOffset: -14,
    eventType: "visit",
    source: "asha_worker",
    symptoms: [
      { name: "fatigue", severity: 3, status: "worsening" },
    ],
    medications: [
      { name: "Metformin 500mg", adherence: "good", notes: "Continuing regularly" },
    ],
    vitals: {
      heartRate: 76,
      systolicBP: 132,
      diastolicBP: 85,
      oxygenSaturation: 97,
    },
    notes: "Follow-up visit. Patient mentions feeling more tired than usual over the past week. No other changes.",
    severity: "low",
    riskScore: 15,
    trajectorySignal: "stable",
  },
  // --------------------------------------------------------
  // DAY -7: Fatigue continuing, medication adherence declining
  // --------------------------------------------------------
  {
    daysOffset: -7,
    eventType: "visit",
    source: "asha_worker",
    symptoms: [
      { name: "fatigue", severity: 4, status: "worsening" },
    ],
    medications: [
      { name: "Metformin 500mg", adherence: "partial", notes: "Missed 2 doses this week" },
    ],
    vitals: {
      heartRate: 78,
      systolicBP: 135,
      diastolicBP: 86,
      oxygenSaturation: 96,
    },
    notes: "Fatigue continues to increase. Patient missed 2 doses of Metformin. Reports feeling overwhelmed. No dizziness.",
    severity: "moderate",
    riskScore: 22,
    trajectorySignal: "worsening",
  },
];

// ============================================================
// WORSENING SCENARIO — New event triggering agent
// ============================================================

const WORSENING_EVENT = {
  eventType: "symptom_update",
  source: "patient",
  symptoms: [
    { name: "fatigue", severity: 6, status: "worsening" },
    { name: "dizziness", severity: 4, status: "new" },
  ],
  medications: [
    { name: "Metformin 500mg", adherence: "partial", notes: "Missed medicine twice in last 3 days" },
  ],
  vitals: {
    heartRate: 82,
    systolicBP: 138,
    diastolicBP: 88,
    oxygenSaturation: 96,
  },
  notes: "Patient reports feeling much more tired for the last three days. New dizziness reported. Missed medicine twice. Reports feeling overwhelmed and unable to manage daily tasks.",
  severity: "moderate",
  riskScore: 38,
  trajectorySignal: "worsening",
};

// ============================================================
// STABLE SCENARIO — Event that should NOT trigger plan change
// ============================================================

const STABLE_EVENT = {
  eventType: "visit",
  source: "patient",
  symptoms: [
    { name: "fatigue", severity: 2, status: "improving" },
  ],
  medications: [
    { name: "Metformin 500mg", adherence: "good", notes: "Back on regular schedule" },
  ],
  vitals: {
    heartRate: 70,
    systolicBP: 125,
    diastolicBP: 80,
    oxygenSaturation: 98,
  },
  notes: "Patient feeling much better. Fatigue has reduced. Back on regular medication schedule. No dizziness.",
  severity: "low",
  riskScore: 14,
  trajectorySignal: "improving",
};

// ============================================================
// DEMO PATIENT 2: RAMESH PATIL (stable comparison)
// ============================================================

const RAMESH_PATIENT = {
  patientCode: "CT-201",
  name: "Ramesh Patil",
  age: 45,
  gender: "male",
  preferredLanguage: "Hindi",
  location: {
    village: "Shirur",
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
};

const RAMESH_EVENTS = [
  {
    daysOffset: -21,
    eventType: "visit",
    source: "asha_worker",
    symptoms: [
      { name: "fatigue", severity: 1, status: "stable" },
    ],
    medications: [
      { name: "Amlodipine 5mg", adherence: "good", notes: "Regular intake" },
    ],
    vitals: {
      heartRate: 74,
      systolicBP: 130,
      diastolicBP: 84,
      oxygenSaturation: 98,
    },
    notes: "Routine visit. Patient is doing well. Mild occasional fatigue. Medication adherence excellent.",
    severity: "low",
    riskScore: 10,
    trajectorySignal: "stable",
  },
  {
    daysOffset: -7,
    eventType: "visit",
    source: "asha_worker",
    symptoms: [
      { name: "fatigue", severity: 1, status: "stable" },
    ],
    medications: [
      { name: "Amlodipine 5mg", adherence: "good", notes: "Consistent daily use" },
    ],
    vitals: {
      heartRate: 72,
      systolicBP: 128,
      diastolicBP: 82,
      oxygenSaturation: 98,
    },
    notes: "Follow-up. Patient reports feeling good. No new complaints. Blood pressure well controlled.",
    severity: "low",
    riskScore: 8,
    trajectorySignal: "stable",
  },
];

const RAMESH_STABLE_EVENT = {
  eventType: "visit",
  source: "patient",
  symptoms: [
    { name: "fatigue", severity: 1, status: "stable" },
  ],
  medications: [
    { name: "Amlodipine 5mg", adherence: "good", notes: "No missed doses" },
  ],
  vitals: {
    heartRate: 70,
    systolicBP: 126,
    diastolicBP: 80,
    oxygenSaturation: 98,
  },
  notes: "Patient feeling well. No new symptoms. Consistent with previous visits.",
  severity: "low",
  riskScore: 7,
  trajectorySignal: "stable",
};

// ============================================================
// SEED LONGITUDINAL HISTORY
// ============================================================

export const seedSavitaLongitudinal = async () => {
  console.log("\n========================================");
  console.log("🌱 DEMO SCENARIO: Savita Jadhav");
  console.log("========================================");

  // 1. Create or find patient
  let patient = await Patient.findOne({ patientCode: SAVITA_PATIENT.patientCode });
  if (!patient) {
    patient = await Patient.create(SAVITA_PATIENT);
    console.log(`✅ Created patient: ${patient.name} (${patient.patientCode})`);
  } else {
    console.log(`⏭️ Patient already exists: ${patient.name}`);
  }

  // 2. Check if longitudinal events already exist
  const existingEvents = await PatientEvent.countDocuments({ patientId: patient._id });
  if (existingEvents >= SAVITA_EVENTS.length) {
    console.log(`⏭️ Longitudinal history already seeded (${existingEvents} events)`);
    return { patient, seeded: false, events: existingEvents };
  }

  // 3. Clear existing events for this patient (for clean re-seed)
  await PatientEvent.deleteMany({ patientId: patient._id });

  // 4. Create longitudinal events
  const createdEvents = [];
  for (const eventData of SAVITA_EVENTS) {
    const event = await PatientEvent.create({
      patientId: patient._id,
      eventType: eventData.eventType,
      source: eventData.source,
      timestamp: daysAgo(Math.abs(eventData.daysOffset)),
      symptoms: eventData.symptoms,
      medications: eventData.medications,
      vitals: eventData.vitals,
      notes: eventData.notes,
      severity: eventData.severity,
      riskScore: eventData.riskScore,
      trajectorySignal: eventData.trajectorySignal,
    });
    createdEvents.push(event);
  }
  console.log(`✅ Created ${createdEvents.length} longitudinal events`);

  // 5. Create initial care plan (7-day follow-up)
  let carePlan = await CarePlan.findOne({ patientId: patient._id, status: "active" });
  if (!carePlan) {
    carePlan = await CarePlan.create({
      patientId: patient._id,
      status: "active",
      followUp: {
        required: true,
        intervalDays: 7,
        nextFollowUpAt: daysAgo(-7), // 7 days from now
      },
      priority: "normal",
      careState: "stable",
      instructions: [
        "Continue current medication",
        "Monitor fatigue levels",
        "Routine follow-up in 7 days",
      ],
      ashaMessage: "Savita is stable. Continue routine monitoring.",
      lastReviewedAt: daysAgo(0),
    });
    console.log("✅ Created initial care plan (7-day follow-up)");
  }

  // 6. Update patient state
  patient.lastVisitAt = createdEvents[createdEvents.length - 1].timestamp;
  patient.followUp = {
    required: true,
    intervalDays: 7,
    nextFollowUpAt: daysAgo(-7),
  };
  await patient.save();
  console.log("✅ Updated patient state");

  console.log(`\n📊 Baseline state for ${patient.name}:`);
  console.log(`   Trajectory: ${patient.trajectoryStatus}`);
  console.log(`   Priority: ${patient.priority}`);
  console.log(`   Follow-up: every ${patient.followUp.intervalDays} days`);
  console.log(`   Risk score (latest event): ${createdEvents[createdEvents.length - 1].riskScore}`);
  console.log(`   Events: ${createdEvents.length}`);

  return { patient, seeded: true, events: createdEvents.length, carePlan };
};

// ============================================================
// SEED RAMESH (STABLE PATIENT)
// ============================================================

export const seedRameshLongitudinal = async () => {
  console.log("\n========================================");
  console.log("🌱 DEMO SCENARIO: Ramesh Patil (stable)");
  console.log("========================================");

  let patient = await Patient.findOne({ patientCode: RAMESH_PATIENT.patientCode });
  if (!patient) {
    patient = await Patient.create(RAMESH_PATIENT);
    console.log(`✅ Created patient: ${patient.name} (${patient.patientCode})`);
  } else {
    console.log(`⏭️ Patient already exists: ${patient.name}`);
  }

  const existingEvents = await PatientEvent.countDocuments({ patientId: patient._id });
  if (existingEvents >= RAMESH_EVENTS.length) {
    console.log(`⏭️ Longitudinal history already seeded (${existingEvents} events)`);
    return { patient, seeded: false, events: existingEvents };
  }

  await PatientEvent.deleteMany({ patientId: patient._id });

  const createdEvents = [];
  for (const eventData of RAMESH_EVENTS) {
    const event = await PatientEvent.create({
      patientId: patient._id,
      eventType: eventData.eventType,
      source: eventData.source,
      timestamp: daysAgo(Math.abs(eventData.daysOffset)),
      symptoms: eventData.symptoms,
      medications: eventData.medications,
      vitals: eventData.vitals,
      notes: eventData.notes,
      severity: eventData.severity,
      riskScore: eventData.riskScore,
      trajectorySignal: eventData.trajectorySignal,
    });
    createdEvents.push(event);
  }
  console.log(`✅ Created ${createdEvents.length} longitudinal events`);

  let carePlan = await CarePlan.findOne({ patientId: patient._id, status: "active" });
  if (!carePlan) {
    carePlan = await CarePlan.create({
      patientId: patient._id,
      status: "active",
      followUp: {
        required: true,
        intervalDays: 14,
        nextFollowUpAt: daysAgo(-14),
      },
      priority: "normal",
      careState: "stable",
      instructions: [
        "Continue current medication",
        "Routine follow-up in 14 days",
      ],
      ashaMessage: "Ramesh is stable. Continue routine monitoring.",
      lastReviewedAt: daysAgo(0),
    });
    console.log("✅ Created initial care plan (14-day follow-up)");
  }

  patient.lastVisitAt = createdEvents[createdEvents.length - 1].timestamp;
  patient.followUp = {
    required: true,
    intervalDays: 14,
    nextFollowUpAt: daysAgo(-14),
  };
  await patient.save();
  console.log("✅ Updated patient state");

  return { patient, seeded: true, events: createdEvents.length, carePlan };
};

// ============================================================
// CREATE STABLE EVENT FOR RAMESH
// ============================================================

export const createRameshStableEvent = async (patientId) => {
  const patient = await Patient.findById(patientId);
  if (!patient) throw new Error("Patient not found");

  const event = await PatientEvent.create({
    patientId: patient._id,
    ...RAMESH_STABLE_EVENT,
    timestamp: new Date(),
  });

  patient.lastVisitAt = event.timestamp;
  await patient.save();

  console.log(`\n🟢 Created STABLE event for ${patient.name}`);
  return event;
};

// ============================================================
// CREATE WORSENING EVENT
// ============================================================

export const createWorseningEvent = async (patientId) => {
  const patient = await Patient.findById(patientId);
  if (!patient) throw new Error("Patient not found");

  const event = await PatientEvent.create({
    patientId: patient._id,
    ...WORSENING_EVENT,
    timestamp: new Date(),
  });

  patient.lastVisitAt = event.timestamp;
  await patient.save();

  console.log(`\n🔴 Created WORSENING event for ${patient.name}`);
  console.log(`   Symptoms: fatigue (6, worsening), dizziness (4, new)`);
  console.log(`   Medication adherence: partial`);
  console.log(`   Notes: "feeling much more tired, new dizziness, missed medicine twice"`);

  return event;
};

// ============================================================
// CREATE STABLE EVENT
// ============================================================

export const createStableEvent = async (patientId) => {
  const patient = await Patient.findById(patientId);
  if (!patient) throw new Error("Patient not found");

  const event = await PatientEvent.create({
    patientId: patient._id,
    ...STABLE_EVENT,
    timestamp: new Date(),
  });

  patient.lastVisitAt = event.timestamp;
  await patient.save();

  console.log(`\n🟢 Created STABLE event for ${patient.name}`);
  console.log(`   Symptoms: fatigue (2, improving)`);
  console.log(`   Medication adherence: good`);
  console.log(`   Notes: "feeling much better, back on regular schedule"`);

  return event;
};

// ============================================================
// RESET DEMO — Clean all agent-generated data for Savita
// ============================================================

const resetPatientDemo = async (patientCode) => {
  const patient = await Patient.findOne({ patientCode });
  if (!patient) return;

  await AgentRun.deleteMany({ patientId: patient._id });
  await AgentEvent.deleteMany({ patientId: patient._id });
  await CareDecision.deleteMany({ patientId: patient._id });
  await Memory.deleteMany({ patientId: patient._id });
  await CarePlan.deleteMany({ patientId: patient._id });
  await PatientEvent.deleteMany({ patientId: patient._id });

  patient.trajectoryStatus = "stable";
  patient.currentState = "stable";
  patient.priority = "normal";
  patient.followUp = {
    required: true,
    intervalDays: patientCode === "CT-201" ? 14 : 7,
    nextFollowUpAt: null,
  };
  await patient.save();

  console.log(`✅ Reset complete for ${patient.name} (${patientCode})`);
};

export const resetDemo = async () => {
  console.log("\n========================================");
  console.log("🔄 RESETTING DEMO STATE");
  console.log("========================================");

  await resetPatientDemo("CT-200");
  await resetPatientDemo("CT-201");

  // Also clean any global agent events
  await AgentEvent.deleteMany({ patientId: null });

  console.log("   All demo patients reset to baseline");

  return { success: true };
};

// ============================================================
// FULL RESET + RESEED
// ============================================================

export const resetAndReseed = async () => {
  await resetDemo();
  await seedRameshLongitudinal();
  return seedSavitaLongitudinal();
};
