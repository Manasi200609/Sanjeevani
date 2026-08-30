import Patient from "../models/Patient.js";

// ============================================================
// CREATE PATIENT
// ============================================================

export const createPatient = async (req, res) => {
  try {
    const {
      patientCode,
      name,
      age,
      gender,
      preferredLanguage,
      location,
      baselineState,
      currentState,
      priority,
      followUp,
    } = req.body;

    if (!patientCode || !name || age === undefined) {
      return res.status(400).json({
        success: false,
        message: "patientCode, name and age are required",
      });
    }

    const existingPatient = await Patient.findOne({ patientCode });

    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: "A patient with this patientCode already exists",
      });
    }

    const patient = await Patient.create({
      patientCode,
      name,
      age,
      gender,
      preferredLanguage,
      location,
      baselineState,
      currentState,
      priority,
      followUp,
    });

    res.status(201).json({
      success: true,
      message: "Patient created successfully",
      patient,
    });
  } catch (error) {
    console.error("Create patient error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create patient",
      error: error.message,
    });
  }
};

// ============================================================
// GET ALL PATIENTS
// ============================================================

export const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find({
      isActive: true,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: patients.length,
      patients,
    });
  } catch (error) {
    console.error("Get patients error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch patients",
      error: error.message,
    });
  }
};

// ============================================================
// GET SINGLE PATIENT
// ============================================================

export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.status(200).json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error("Get patient error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch patient",
      error: error.message,
    });
  }
};

// ============================================================
// UPDATE PATIENT
// ============================================================

export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Patient updated successfully",
      patient,
    });
  } catch (error) {
    console.error("Update patient error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update patient",
      error: error.message,
    });
  }
};

// ============================================================
// DEACTIVATE PATIENT
// ============================================================

export const deactivatePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findByIdAndUpdate(
      id,
      {
        isActive: false,
      },
      {
        new: true,
      }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Patient deactivated successfully",
      patient,
    });
  } catch (error) {
    console.error("Deactivate patient error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to deactivate patient",
      error: error.message,
    });
  }
};