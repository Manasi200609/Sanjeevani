import express from "express";
import Patient from "../models/Patient.js";
import PatientEvent from "../models/PatientEvent.js";
import AgentRun from "../models/AgentRun.js";

const router = express.Router();

// ============================================================
// GET /api/dashboard
//
// Returns everything the frontend dashboard needs in one call:
// - stats (counts derived from patient data)
// - attentionPatients (patients requiring attention with risk data)
// - recentAgentRuns (latest agent runs across all patients)
// ============================================================

router.get("/", async (req, res) => {
  try {
    // ----------------------------------------------------------
    // Load all active patients
    // ----------------------------------------------------------

    const patients = await Patient.find({ isActive: true }).sort({
      priority: -1,
      updatedAt: -1,
    });

    // ----------------------------------------------------------
    // Compute stats
    // ----------------------------------------------------------

    const totalPatients = patients.length;

    const needsAttention = patients.filter(
      (p) =>
        p.trajectoryStatus === "worsening" ||
        p.currentState === "urgent" ||
        p.currentState === "watch" ||
        ["elevated", "high", "critical"].includes(p.priority)
    ).length;

    const now = new Date();
    const sevenDaysFromNow = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    const followUpsDue = patients.filter((p) => {
      if (!p.followUp?.required) return false;
      if (!p.followUp?.nextFollowUpAt) return false;
      const next = new Date(p.followUp.nextFollowUpAt);
      return next <= sevenDaysFromNow;
    }).length;

    const urgentCases = patients.filter(
      (p) =>
        p.priority === "urgent" ||
        p.priority === "high" ||
        p.currentState === "urgent"
    ).length;

    // ----------------------------------------------------------
    // Get latest event risk scores for attention patients
    // ----------------------------------------------------------

    const attentionPatientIds = patients
      .filter(
        (p) =>
          p.trajectoryStatus === "worsening" ||
          p.currentState === "urgent" ||
          p.currentState === "watch" ||
          ["elevated", "high", "critical"].includes(p.priority)
      )
      .slice(0, 10)
      .map((p) => p._id);

    // Fetch latest event for each attention patient to get risk scores
    const latestEvents = await Promise.all(
      attentionPatientIds.map(async (patientId) => {
        const event = await PatientEvent.findOne({ patientId })
          .sort({ timestamp: -1 })
          .lean();
        return { patientId: patientId.toString(), event };
      })
    );

    const eventMap = {};
    for (const { patientId, event } of latestEvents) {
      eventMap[patientId] = event;
    }

    const attentionPatients = patients
      .filter((p) => attentionPatientIds.some((id) => id.equals(p._id)))
      .map((p) => {
        const event = eventMap[p._id.toString()];
        return {
          _id: p._id,
          patientCode: p.patientCode,
          name: p.name,
          age: p.age,
          gender: p.gender,
          location: p.location,
          currentState: p.currentState,
          trajectoryStatus: p.trajectoryStatus,
          priority: p.priority,
          followUp: p.followUp,
          lastVisitAt: p.lastVisitAt,
          riskScore: event?.riskScore ?? 0,
          symptoms: event?.symptoms ?? [],
        };
      });

    // ----------------------------------------------------------
    // Recent agent runs (last 10 across all patients)
    // ----------------------------------------------------------

    const recentRuns = await AgentRun.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("patientId", "patientCode name")
      .lean();

    // ----------------------------------------------------------
    // Response
    // ----------------------------------------------------------

    res.json({
      success: true,
      stats: {
        totalPatients,
        needsAttention,
        followUpsDue,
        urgentCases,
      },
      attentionPatients,
      recentAgentRuns: recentRuns,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("Dashboard endpoint error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
      error: error.message,
    });
  }
});

export default router;
