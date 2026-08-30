import {
  createPatientEvent,
  getPatientTimeline,
  getRecentPatientEvents,
  getEventById,
  updatePatientEvent,
} from "../services/eventService.js";

import {
  computeEventRiskScore,
  computeTrajectorySignal,
} from "../services/computeEventRiskScore.js";

// ============================================================
// CREATE VISIT
// ============================================================

export const createVisit = async (req, res) => {
  try {
    const {
      patientId,
      timestamp,
      symptoms,
      vitals,
      medications,
      notes,
      severity,
      riskScore,
      trajectorySignal,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "patientId is required",
      });
    }

    // Compute risk score using shared scorer
    const computedRiskScore = riskScore !== undefined ? riskScore : computeEventRiskScore({ symptoms, vitals, severity });

    // Determine trajectory signal using shared scorer
    const computedTrajectory = trajectorySignal || computeTrajectorySignal({ symptoms });

    const event = await createPatientEvent({
      patientId,

      eventType: "visit",

      source: "asha_worker",

      timestamp,

      symptoms: symptoms || [],

      vitals: vitals || {},

      medications: medications || [],

      notes: notes || "",

      severity: severity || "low",

      riskScore: computedRiskScore,

      trajectorySignal: computedTrajectory,
    });

    return res.status(201).json({
      success: true,
      message: "Visit recorded successfully",
      event,
    });
  } catch (error) {
    console.error(
      "Create visit error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// GET PATIENT TIMELINE
// ============================================================

export const getTimeline = async (
  req,
  res
) => {
  try {
    const { patientId } = req.params;

    const timeline =
      await getPatientTimeline(
        patientId
      );

    return res.status(200).json({
      success: true,
      patientId,
      count: timeline.length,
      timeline,
    });
  } catch (error) {
    console.error(
      "Get timeline error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// GET RECENT VISITS
// ============================================================

export const getRecentVisits = async (
  req,
  res
) => {
  try {
    const { patientId } = req.params;

    const limit = Number(
      req.query.limit || 10
    );

    const events =
      await getRecentPatientEvents(
        patientId,
        limit
      );

    return res.status(200).json({
      success: true,
      patientId,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error(
      "Get recent visits error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// GET SINGLE EVENT
// ============================================================

export const getVisitById = async (
  req,
  res
) => {
  try {
    const { eventId } = req.params;

    const event =
      await getEventById(eventId);

    return res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    console.error(
      "Get visit error:",
      error
    );

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// UPDATE VISIT
// ============================================================

export const updateVisit = async (
  req,
  res
) => {
  try {
    const { eventId } = req.params;

    const event =
      await updatePatientEvent(
        eventId,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Visit updated successfully",
      event,
    });
  } catch (error) {
    console.error(
      "Update visit error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};