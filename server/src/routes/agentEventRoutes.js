import express from "express";
import {
  getRecentAgentEvents,
  getPatientAgentEvents,
} from "../services/agentEventService.js";

const router = express.Router();

// ============================================================
// GET /api/agent/events
//
// Returns recent agent events for the Live Monitor.
// Each event represents a discrete system action:
//   signal_detected, agent_reasoned, decision_made,
//   care_plan_updated, agent_completed, etc.
//
// Query params:
//   limit (default: 30, max: 100)
// ============================================================

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const events = await getRecentAgentEvents(limit);

    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Agent events endpoint error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agent events",
      error: error.message,
    });
  }
});

// ============================================================
// GET /api/agent/events/patient/:patientId
//
// Returns agent events for a specific patient.
// ============================================================

router.get("/patient/:patientId", async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const events = await getPatientAgentEvents(req.params.patientId, limit);

    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient agent events",
      error: error.message,
    });
  }
});

export default router;
