import Patient from "../models/Patient.js";

// ============================================================
// PATIENT SERVICE
// ============================================================
//
// Responsible for:
// - Creating patients
// - Fetching patients
// - Updating patients
// - Activating/deactivating patients
// - Updating care state
//
// Controllers/routes should call this service instead of
// directly handling MongoDB operations.
//
// ============================================================


// ============================================================
// CREATE PATIENT
// ============================================================

export const createPatient = async (patientData) => {
  // ----------------------------------------------------------
  // Check duplicate patient code
  // ----------------------------------------------------------

  if (patientData.patientCode) {
    const existingPatient =
      await Patient.findOne({
        patientCode:
          patientData.patientCode,
      });

    if (existingPatient) {
      throw new Error(
        `Patient with code ${patientData.patientCode} already exists`
      );
    }
  }

  // ----------------------------------------------------------
  // Create patient
  // ----------------------------------------------------------

  const patient =
    await Patient.create(
      patientData
    );

  return patient;
};


// ============================================================
// GET PATIENT BY ID
// ============================================================

export const getPatientById = async (
  patientId
) => {
  const patient =
    await Patient.findById(
      patientId
    );

  if (!patient) {
    throw new Error(
      "Patient not found"
    );
  }

  return patient;
};


// ============================================================
// GET PATIENT BY CODE
// ============================================================

export const getPatientByCode = async (
  patientCode
) => {
  const patient =
    await Patient.findOne({
      patientCode,
    });

  if (!patient) {
    throw new Error(
      "Patient not found"
    );
  }

  return patient;
};


// ============================================================
// GET ALL ACTIVE PATIENTS
// ============================================================

export const getAllPatients = async ({
  includeInactive = false,
} = {}) => {
  const filter = {};

  if (!includeInactive) {
    filter.isActive = true;
  }

  const patients =
    await Patient.find(filter)
      .sort({
        priority: -1,
        updatedAt: -1,
      });

  return patients;
};


// ============================================================
// UPDATE PATIENT
// ============================================================

export const updatePatient = async (
  patientId,
  updates
) => {
  // ----------------------------------------------------------
  // Prevent accidental modification of immutable/internal
  // fields through a generic update operation.
  // ----------------------------------------------------------

  const protectedFields = [
    "_id",
    "createdAt",
    "updatedAt",
    "__v",
  ];

  const safeUpdates = {
    ...updates,
  };

  protectedFields.forEach(
    (field) => {
      delete safeUpdates[field];
    }
  );

  // ----------------------------------------------------------
  // Update
  // ----------------------------------------------------------

  const patient =
    await Patient.findByIdAndUpdate(
      patientId,
      safeUpdates,
      {
        new: true,
        runValidators: true,
      }
    );

  if (!patient) {
    throw new Error(
      "Patient not found"
    );
  }

  return patient;
};


// ============================================================
// UPDATE CARE STATE
// ============================================================
//
// Used by the agent after a care decision is executed.
//
// Example:
//
// worsening trajectory
//       ↓
// increase_followup
//       ↓
// currentState = watch
//
// ============================================================

export const updateCareState = async ({
  patientId,
  currentState,
  trajectoryStatus,
  priority,
  followUp,
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

  if (
    currentState !== undefined
  ) {
    patient.currentState =
      currentState;
  }

  if (
    trajectoryStatus !==
    undefined
  ) {
    patient.trajectoryStatus =
      trajectoryStatus;
  }

  if (
    priority !== undefined
  ) {
    patient.priority =
      priority;
  }

  if (
    followUp !== undefined
  ) {
    patient.followUp =
      followUp;
  }

  await patient.save();

  return patient;
};


// ============================================================
// UPDATE LAST VISIT
// ============================================================

export const updateLastVisit = async (
  patientId,
  visitDate
) => {
  const patient =
    await Patient.findById(
      patientId
    );

  if (!patient) {
    throw new Error(
      "Patient not found"
    );
  }

  patient.lastVisitAt =
    visitDate || new Date();

  await patient.save();

  return patient;
};


// ============================================================
// DEACTIVATE PATIENT
// ============================================================

export const deactivatePatient = async (
  patientId
) => {
  const patient =
    await Patient.findById(
      patientId
    );

  if (!patient) {
    throw new Error(
      "Patient not found"
    );
  }

  patient.isActive = false;

  await patient.save();

  return patient;
};


// ============================================================
// REACTIVATE PATIENT
// ============================================================

export const reactivatePatient = async (
  patientId
) => {
  const patient =
    await Patient.findById(
      patientId
    );

  if (!patient) {
    throw new Error(
      "Patient not found"
    );
  }

  patient.isActive = true;

  await patient.save();

  return patient;
};


// ============================================================
// GET PATIENT SUMMARY
// ============================================================
//
// Useful for dashboards and the agent.
//
// Keeps the returned object smaller than returning the entire
// MongoDB document.
//
// ============================================================

export const getPatientSummary = async (
  patientId
) => {
  const patient =
    await Patient.findById(
      patientId
    ).lean();

  if (!patient) {
    throw new Error(
      "Patient not found"
    );
  }

  return {
    id:
      patient._id,

    patientCode:
      patient.patientCode,

    name:
      patient.name,

    age:
      patient.age,

    gender:
      patient.gender,

    preferredLanguage:
      patient.preferredLanguage,

    location:
      patient.location,

    currentState:
      patient.currentState,

    trajectoryStatus:
      patient.trajectoryStatus,

    priority:
      patient.priority,

    followUp:
      patient.followUp,

    lastVisitAt:
      patient.lastVisitAt,

    isActive:
      patient.isActive,
  };
};