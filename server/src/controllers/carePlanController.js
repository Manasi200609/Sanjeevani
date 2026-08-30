import CarePlan from "../models/CarePlan.js";
import Patient from "../models/Patient.js";
import CareDecision from "../models/CareDecision.js";

// ============================================================
// GET ACTIVE CARE PLAN
// ============================================================

export const getActiveCarePlan = async (
  req,
  res
) => {
  try {
    const { patientId } = req.params;

    const patient =
      await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const carePlan =
      await CarePlan.findOne({
        patientId,
        status: "active",
      }).sort({
        version: -1,
        updatedAt: -1,
      });

    if (!carePlan) {
      return res.status(200).json({
        success: true,
        patient: {
          id: patient._id,
          patientCode: patient.patientCode,
          name: patient.name,
        },
        carePlan: null,
        message: "No active care plan for this patient",
      });
    }

    return res.status(200).json({
      success: true,
      patient: {
        id: patient._id,
        patientCode: patient.patientCode,
        name: patient.name,
      },
      carePlan,
    });
  } catch (error) {
    console.error(
      "Get active care plan error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// GET ALL CARE PLANS FOR PATIENT
// ============================================================

export const getPatientCarePlans = async (
  req,
  res
) => {
  try {
    const { patientId } = req.params;

    const patient =
      await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const carePlans =
      await CarePlan.find({
        patientId,
      }).sort({
        version: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      patientId,
      count: carePlans.length,
      carePlans,
    });
  } catch (error) {
    console.error(
      "Get patient care plans error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// CREATE CARE PLAN
// ============================================================

export const createCarePlan = async (
  req,
  res
) => {
  try {
    const { patientId } = req.params;

    const patient =
      await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const {
      followUp,
      priority,
      careState,
      trajectoryStatus,
      riskScore,
      instructions,
      ashaMessage,
      reasoning,
      sourceDecisionId,
    } = req.body;

    // ----------------------------------------------------------
    // Determine version
    // ----------------------------------------------------------

    const latestPlan =
      await CarePlan.findOne({
        patientId,
      }).sort({
        version: -1,
      });

    const version =
      latestPlan
        ? latestPlan.version + 1
        : 1;

    // ----------------------------------------------------------
    // Verify source decision if supplied
    // ----------------------------------------------------------

    if (sourceDecisionId) {
      const decision =
        await CareDecision.findById(
          sourceDecisionId
        );

      if (!decision) {
        return res.status(400).json({
          success: false,
          message:
            "Source care decision not found",
        });
      }
    }

    // ----------------------------------------------------------
    // Create plan
    // ----------------------------------------------------------

    const carePlan =
      await CarePlan.create({
        patientId,

        status: "active",

        followUp: {
          required:
            followUp?.required ?? true,

          intervalDays:
            followUp?.intervalDays ??
            patient.followUp?.intervalDays ??
            7,

          nextFollowUpAt:
            followUp?.nextFollowUpAt ??
            null,
        },

        priority:
          priority ||
          patient.priority ||
          "normal",

        careState:
          careState ||
          patient.currentState ||
          "stable",

        trajectoryStatus:
          trajectoryStatus ||
          patient.trajectoryStatus ||
          "stable",

        riskScore:
          riskScore ??
          0,

        instructions:
          Array.isArray(instructions)
            ? instructions
            : [],

        ashaMessage:
          ashaMessage || "",

        reasoning:
          reasoning || "",

        sourceDecisionId:
          sourceDecisionId || null,

        version,

        lastReviewedAt:
          new Date(),
      });

    return res.status(201).json({
      success: true,
      message:
        "Care plan created successfully",
      carePlan,
    });
  } catch (error) {
    console.error(
      "Create care plan error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// UPDATE CARE PLAN
// ============================================================

export const updateCarePlan = async (
  req,
  res
) => {
  try {
    const { carePlanId } = req.params;

    const allowedFields = [
      "status",
      "followUp",
      "priority",
      "careState",
      "trajectoryStatus",
      "riskScore",
      "instructions",
      "ashaMessage",
      "reasoning",
      "lastReviewedAt",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] =
          req.body[field];
      }
    }

    updates.lastReviewedAt =
      new Date();

    const carePlan =
      await CarePlan.findByIdAndUpdate(
        carePlanId,
        {
          $set: updates,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!carePlan) {
      return res.status(404).json({
        success: false,
        message: "Care plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Care plan updated successfully",
      carePlan,
    });
  } catch (error) {
    console.error(
      "Update care plan error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// COMPLETE CARE PLAN
// ============================================================

export const completeCarePlan = async (
  req,
  res
) => {
  try {
    const { carePlanId } = req.params;

    const carePlan =
      await CarePlan.findByIdAndUpdate(
        carePlanId,
        {
          $set: {
            status: "completed",
            lastReviewedAt:
              new Date(),
          },
        },
        {
          new: true,
        }
      );

    if (!carePlan) {
      return res.status(404).json({
        success: false,
        message: "Care plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Care plan completed successfully",
      carePlan,
    });
  } catch (error) {
    console.error(
      "Complete care plan error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};