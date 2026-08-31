import express from "express";

import SchedulerEvent from "../models/SchedulerEvent.js";
import MemorySummary from "../models/MemorySummary.js";

// ============================================================
// SCHEDULER ROUTES
// ============================================================
//
// These routes allow:
// 1. Manual triggering of agent jobs (for testing/demo)
// 2. Pub/Sub push endpoints (for Cloud Scheduler)
// 3. Querying scheduler event history
// 4. Querying memory summaries
//
// ============================================================

const router = express.Router();

// ============================================================
// POST /api/scheduler/reassessment
//
// Trigger the Patient Reassessment Agent.
// In production, this is called by Pub/Sub.
// For testing, call directly.
// ============================================================

router.post("/reassessment", async (req, res) => {
  try {
    const { runPatientReassessmentBatch } = await import(
      "../jobs/patientReassessmentAgent.js"
    );

    const result = await runPatientReassessmentBatch({
      maxPatients: req.body.maxPatients || 20,
    });

    res.json({
      success: true,
      message: "Patient reassessment batch completed",
      result,
    });
  } catch (error) {
    console.error("Reassessment trigger failed:", error);
    res.status(500).json({
      success: false,
      message: "Reassessment batch failed",
      error: error.message,
    });
  }
});

// ============================================================
// POST /api/scheduler/memory-consolidation
//
// Trigger the Memory Consolidation Agent.
// ============================================================

router.post("/memory-consolidation", async (req, res) => {
  try {
    const { runMemoryConsolidationBatch } = await import(
      "../jobs/memoryConsolidationAgent.js"
    );

    const result = await runMemoryConsolidationBatch({
      granularity: req.body.granularity || "daily",
      maxPatients: req.body.maxPatients || 50,
    });

    res.json({
      success: true,
      message: "Memory consolidation batch completed",
      result,
    });
  } catch (error) {
    console.error("Memory consolidation trigger failed:", error);
    res.status(500).json({
      success: false,
      message: "Memory consolidation batch failed",
      error: error.message,
    });
  }
});

// ============================================================
// POST /api/scheduler/pubsub-push
//
// Pub/Sub push endpoint.
// Cloud Scheduler → Pub/Sub → This endpoint → Agent Job
//
// The Pub/Sub message body contains:
//   { jobType: "patient_reassessment" | "memory_consolidation", ... }
//
// ============================================================

router.post("/pubsub-push", async (req, res) => {
  try {
    // Pub/Sub push messages have a `message` field
    const pubsubMessage = req.body.message;
    let data = {};

    if (pubsubMessage?.data) {
      // Pub/Sub push format: base64-encoded data
      const decoded = Buffer.from(pubsubMessage.data, "base64").toString("utf-8");
      data = JSON.parse(decoded);
    } else {
      data = req.body;
    }

    const jobType = data.jobType || data.type || data.action;

    console.log(`[PubSub Push] Received job: ${jobType}`);

    if (!jobType) {
      return res.status(400).json({
        success: false,
        message: "Missing jobType in Pub/Sub message",
      });
    }

    let result;

    switch (jobType) {
      case "patient_reassessment": {
        const { runPatientReassessmentBatch } = await import(
          "../jobs/patientReassessmentAgent.js"
        );
        result = await runPatientReassessmentBatch();
        break;
      }

      case "memory_consolidation": {
        const { runMemoryConsolidationBatch } = await import(
          "../jobs/memoryConsolidationAgent.js"
        );
        result = await runMemoryConsolidationBatch({
          granularity: data.granularity || "daily",
        });
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          message: `Unknown job type: ${jobType}`,
        });
    }

    // Acknowledge to Pub/Sub (return 200)
    res.json({
      success: true,
      message: `Job ${jobType} completed`,
      result,
    });
  } catch (error) {
    console.error("[PubSub Push] Error:", error);
    // Return 500 so Pub/Sub retries
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// GET /api/scheduler/events
//
// Query scheduler event history.
// ============================================================

router.get("/events", async (req, res) => {
  try {
    const { jobType, limit = 20, status } = req.query;

    const filter = {};
    if (jobType) filter.jobType = jobType;
    if (status) filter.status = status;

    const events = await SchedulerEvent.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// GET /api/scheduler/events/:eventId
//
// Get a single scheduler event with full details.
// ============================================================

router.get("/events/:eventId", async (req, res) => {
  try {
    const event = await SchedulerEvent.findById(req.params.eventId).lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Scheduler event not found",
      });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// GET /api/scheduler/memory-summaries
//
// Query memory summaries for a patient.
// ============================================================

router.get("/memory-summaries", async (req, res) => {
  try {
    const { patientId, granularity, limit = 20 } = req.query;

    const filter = {};
    if (patientId) filter.patientId = patientId;
    if (granularity) filter.granularity = granularity;

    const summaries = await MemorySummary.find(filter)
      .sort({ periodEnd: -1 })
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      count: summaries.length,
      summaries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// GET /api/scheduler/memory-summaries/:patientId
//
// Get memory summaries for a specific patient.
// ============================================================

router.get("/memory-summaries/:patientId", async (req, res) => {
  try {
    const { granularity, limit = 20 } = req.query;

    const filter = { patientId: req.params.patientId };
    if (granularity) filter.granularity = granularity;

    const summaries = await MemorySummary.find(filter)
      .sort({ periodEnd: -1 })
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      count: summaries.length,
      summaries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
