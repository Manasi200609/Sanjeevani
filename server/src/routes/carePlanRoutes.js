import express from "express";

import {
  getActiveCarePlan,
  getPatientCarePlans,
  createCarePlan,
  updateCarePlan,
  completeCarePlan,
} from "../controllers/carePlanController.js";

const router = express.Router();

// ============================================================
// PATIENT CARE PLANS
// ============================================================

// Get the currently active care plan
router.get(
  "/patient/:patientId",
  getActiveCarePlan
);

// Get complete care-plan history
router.get(
  "/patient/:patientId/history",
  getPatientCarePlans
);

// Create a new care plan
router.post(
  "/patient/:patientId",
  createCarePlan
);

// ============================================================
// INDIVIDUAL CARE PLAN
// ============================================================

// Update a care plan
router.put(
  "/:carePlanId",
  updateCarePlan
);

// Mark care plan as completed
router.patch(
  "/:carePlanId/complete",
  completeCarePlan
);

export default router;