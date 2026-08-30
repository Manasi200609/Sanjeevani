import PatientEvent from "../models/PatientEvent.js";
import Patient from "../models/Patient.js";

// ============================================================
// EVENT SERVICE
// ============================================================
//
// Responsible for:
// - Creating patient events
// - Retrieving timelines
// - Retrieving recent events
// - Getting the latest event
// - Updating the patient's last visit
//
// Flow:
//
// ASHA Worker / Simulation
//          ↓
//     eventService
//          ↓
//     PatientEvent
//          ↓
//   Longitudinal Timeline
//          ↓
//   Trajectory Agent
//
// ============================================================


// ============================================================
// CREATE PATIENT EVENT
// ============================================================

export const createPatientEvent = async (
  eventData
) => {
  // ----------------------------------------------------------
  // Validate patient
  // ----------------------------------------------------------

  const patient =
    await Patient.findById(
      eventData.patientId
    );

  if (!patient) {
    throw new Error(
      "Patient not found"
    );
  }

  // ----------------------------------------------------------
  // Create event
  // ----------------------------------------------------------

  const event =
    await PatientEvent.create({
      ...eventData,

      timestamp:
        eventData.timestamp ||
        new Date(),
    });

  // ----------------------------------------------------------
  // Update patient's last visit
  // ----------------------------------------------------------

  if (
    event.eventType === "visit"
  ) {
    patient.lastVisitAt =
      event.timestamp;

    await patient.save();
  }

  return event;
};


// ============================================================
// GET EVENT BY ID
// ============================================================

export const getEventById = async (
  eventId
) => {
  const event =
    await PatientEvent.findById(
      eventId
    );

  if (!event) {
    throw new Error(
      "Patient event not found"
    );
  }

  return event;
};


// ============================================================
// GET PATIENT TIMELINE
// ============================================================

export const getPatientTimeline = async (
  patientId,
  {
    limit = 50,
    skip = 0,
  } = {}
) => {
  // ----------------------------------------------------------
  // Validate patient
  // ----------------------------------------------------------

  const patient =
    await Patient.findById(
      patientId
    );

  if (!patient) {
    throw new Error(
      "Patient not found"
    );
  }

  // ----------------------------------------------------------
  // Retrieve events
  // ----------------------------------------------------------

  const events =
    await PatientEvent.find({
      patientId,
    })
      .sort({
        timestamp: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

  return events;
};


// ============================================================
// GET RECENT EVENTS
// ============================================================
//
// Used heavily by the trajectory agent.
//
// Example:
//
// "Analyze the last 5 visits."
//
// ============================================================

export const getRecentEvents = async (
  patientId,
  limit = 5
) => {
  const events =
    await PatientEvent.find({
      patientId,
    })
      .sort({
        timestamp: -1,
      })
      .limit(limit)
      .lean();

  return events;
};


// ============================================================
// GET EVENTS IN DATE RANGE
// ============================================================

export const getEventsInRange = async ({
  patientId,
  startDate,
  endDate,
}) => {
  const filter = {
    patientId,
  };

  if (startDate || endDate) {
    filter.timestamp = {};
  }

  if (startDate) {
    filter.timestamp.$gte =
      new Date(startDate);
  }

  if (endDate) {
    filter.timestamp.$lte =
      new Date(endDate);
  }

  const events =
    await PatientEvent.find(
      filter
    )
      .sort({
        timestamp: 1,
      })
      .lean();

  return events;
};


// ============================================================
// GET LATEST EVENT
// ============================================================

export const getLatestEvent = async (
  patientId
) => {
  const event =
    await PatientEvent.findOne({
      patientId,
    })
      .sort({
        timestamp: -1,
      })
      .lean();

  return event;
};


// ============================================================
// COUNT PATIENT EVENTS
// ============================================================

export const countPatientEvents =
  async (patientId) => {
    return PatientEvent.countDocuments({
      patientId,
    });
  };


// ============================================================
// DELETE EVENT
// ============================================================
//
// Normally we should avoid deleting medical timeline data.
// This function is mainly useful for development/testing.
//
// ============================================================

export const deleteEvent = async (
  eventId
) => {
  const event =
    await PatientEvent.findByIdAndDelete(
      eventId
    );

  if (!event) {
    throw new Error(
      "Patient event not found"
    );
  }

  return event;
};

// ============================================================
// GET RECENT PATIENT EVENTS
// ============================================================

export const getRecentPatientEvents = async (
  patientId,
  limit = 10
) => {
  const events = await PatientEvent.find({
    patientId,
  })
    .sort({
      timestamp: -1,
    })
    .limit(Number(limit))
    .lean();

  return events;
};

// ============================================================
// UPDATE PATIENT EVENT
// ============================================================

export const updatePatientEvent = async (
  eventId,
  updateData
) => {
  const event = await PatientEvent.findByIdAndUpdate(
    eventId,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!event) {
    throw new Error("Patient event not found");
  }

  return event;
};