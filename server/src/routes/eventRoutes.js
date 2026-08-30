import express from "express";

import {
  createPatientEvent,
  getPatientTimeline,
} from "../controllers/eventController.js";

const router = express.Router();

// ============================================================
// PATIENT TIMELINE
// ============================================================

// Add a new event to a patient's longitudinal timeline
router.post("/:patientId/events", createPatientEvent);

// Get the complete patient timeline
router.get("/:patientId/timeline", getPatientTimeline);

export default router;