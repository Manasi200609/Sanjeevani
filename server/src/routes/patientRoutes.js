import express from "express";

import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deactivatePatient,
} from "../controllers/patientController.js";

const router = express.Router();

// Create patient
router.post("/", createPatient);

// Get all active patients
router.get("/", getPatients);

// Get single patient
router.get("/:id", getPatientById);

// Update patient
router.put("/:id", updatePatient);

// Deactivate patient
router.delete("/:id", deactivatePatient);

export default router;