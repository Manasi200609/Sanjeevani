import express from "express";
import {
  createVisit,
  getTimeline,
  getRecentVisits,
  getVisitById,
  updateVisit,
} from "../controllers/visitController.js";

const router = express.Router();

router.post("/", createVisit);
router.get("/:patientId/timeline", getTimeline);
router.get("/:patientId/recent", getRecentVisits);
router.get("/event/:eventId", getVisitById);
router.patch("/event/:eventId", updateVisit);

export default router;
