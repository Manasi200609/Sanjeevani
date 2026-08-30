import PatientEvent from "../models/PatientEvent.js";
import Patient from "../models/Patient.js";

// ============================================================
// CREATE PATIENT EVENT
// ============================================================

export const createPatientEvent = async (req, res) => {
  try {
    const { patientId } = req.params;

    const {
      eventType,
      source,
      timestamp,
      symptoms,
      vitals,
      medications,
      notes,
      severity,
      riskScore,
      trajectorySignal,
    } = req.body;

    // --------------------------------------------------------
    // CHECK PATIENT
    // --------------------------------------------------------

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // --------------------------------------------------------
    // CREATE EVENT
    // --------------------------------------------------------

    const event = await PatientEvent.create({
      patientId,
      eventType,
      source,
      timestamp,
      symptoms,
      vitals,
      medications,
      notes,
      severity,
      riskScore,
      trajectorySignal,
    });

    // --------------------------------------------------------
    // UPDATE PATIENT'S LATEST STATE
    // --------------------------------------------------------

    const updateData = {
      lastVisitAt: event.timestamp,
    };

    if (trajectorySignal && trajectorySignal !== "unknown") {
      updateData.trajectoryStatus = trajectorySignal;
    }

    if (riskScore !== undefined) {
      if (riskScore >= 80) {
        updateData.currentState = "high_risk";
        updateData.priority = "critical";
      } else if (riskScore >= 60) {
        updateData.currentState = "deteriorating";
        updateData.priority = "high";
      } else if (riskScore >= 30) {
        updateData.currentState = "watch";
        updateData.priority = "normal";
      } else {
        updateData.currentState = "stable";
      }
    }

    await Patient.findByIdAndUpdate(
      patientId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    res.status(201).json({
      success: true,
      message: "Patient event recorded successfully",
      event,
    });
  } catch (error) {
    console.error("Create patient event error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to record patient event",
      error: error.message,
    });
  }
};

// ============================================================
// GET PATIENT TIMELINE
// ============================================================

export const getPatientTimeline = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const events = await PatientEvent.find({
      patientId,
    }).sort({
      timestamp: 1,
    });

    res.status(200).json({
      success: true,
      patientId,
      count: events.length,
      timeline: events,
    });
  } catch (error) {
    console.error("Get patient timeline error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch patient timeline",
      error: error.message,
    });
  }
};