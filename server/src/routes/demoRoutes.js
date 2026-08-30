// ============================================================
// DEMO ROUTES — Test scenarios for hackathon demo
// ============================================================

import express from "express";
import Patient from "../models/Patient.js";
import PatientEvent from "../models/PatientEvent.js";
import CarePlan from "../models/CarePlan.js";
import CareDecision from "../models/CareDecision.js";
import AgentRun from "../models/AgentRun.js";
import AgentEvent from "../models/AgentEvent.js";
import Memory from "../models/Memory.js";

import {
  seedSavitaLongitudinal,
  seedRameshLongitudinal,
  createWorseningEvent,
  createStableEvent,
  createRameshStableEvent,
  resetDemo,
  resetAndReseed,
} from "../simulation/demoScenarios.js";

import { runCareFlowAgent } from "../agents/orchestrator.js";

const router = express.Router();

// ============================================================
// POST /api/demo/reset
// Reset all demo data to clean baseline
// ============================================================
router.post("/reset", async (req, res) => {
  try {
    const result = await resetDemo();
    res.json({ success: true, message: "Demo reset complete", ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// POST /api/demo/seed
// Seed Savita Jadhav with longitudinal history
// ============================================================
router.post("/seed", async (req, res) => {
  try {
    const result = await seedSavitaLongitudinal();
    res.json({ success: true, message: "Demo seeded", ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// POST /api/demo/reset-and-seed
// Full reset + reseed
// ============================================================
router.post("/reset-and-seed", async (req, res) => {
  try {
    const savita = await resetAndReseed();
    const ramesh = await seedRameshLongitudinal();
    res.json({ success: true, message: "Demo reset and reseeded", ...savita, ramesh });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// POST /api/demo/scenario/worsening
// Create worsening event + run agent
// ============================================================
router.post("/scenario/worsening", async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientCode: "CT-200" });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Demo patient not found. Run /api/demo/seed first." });
    }

    console.log("\n🔴 DEMO: Creating worsening scenario...");

    // Create the worsening event
    const event = await createWorseningEvent(patient._id);

    // Run the CareFlow agent
    console.log("🤖 Running CareFlow agent...");
    const agentResult = await runCareFlowAgent({
      patientId: patient._id,
      trigger: "patient_event",
    });

    // Get updated state
    const updatedPatient = await Patient.findById(patient._id);
    const carePlan = await CareDecision.findOne({ patientId: patient._id, status: "proposed" })
      .sort({ createdAt: -1 }).lean();
    const latestPlan = await CarePlan.findOne({ patientId: patient._id, status: "active" })
      .sort({ version: -1 }).lean();
    const agentEvents = await AgentEvent.find({ patientId: patient._id })
      .sort({ timestamp: -1 }).limit(10).lean();
    const agentRuns = await AgentRun.find({ patientId: patient._id })
      .sort({ createdAt: -1 }).limit(5).lean();

    res.json({
      success: true,
      scenario: "worsening",
      message: "Worsening event created and agent executed",
      before: {
        trajectory: "stable",
        riskScore: 22,
        followUpDays: 7,
        priority: "normal",
      },
      after: {
        trajectory: updatedPatient.trajectoryStatus,
        priority: updatedPatient.priority,
        followUpDays: updatedPatient.followUp?.intervalDays,
        currentState: updatedPatient.currentState,
      },
      decision: carePlan,
      carePlan: latestPlan,
      agentEvents: agentEvents.map((e) => ({
        type: e.eventType,
        title: e.title,
        subtitle: e.subtitle,
        timestamp: e.timestamp,
      })),
      agentRun: agentRuns[0] ? {
        status: agentRuns[0].status,
        durationMs: agentRuns[0].durationMs,
        steps: agentRuns[0].steps?.map((s) => s.step),
        executedAction: agentRuns[0].executedAction,
      } : null,
    });
  } catch (error) {
    console.error("Demo scenario error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// POST /api/demo/scenario/stable
// Create stable event + run agent
// ============================================================
router.post("/scenario/ramesh-stable", async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientCode: "CT-201" });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Ramesh not found. Run /api/demo/seed first." });
    }

    console.log("\n🟢 DEMO: Creating stable scenario for Ramesh...");

    const event = await createRameshStableEvent(patient._id);

    console.log("🤖 Running CareFlow agent...");
    const agentResult = await runCareFlowAgent({
      patientId: patient._id,
      trigger: "patient_event",
    });

    const updatedPatient = await Patient.findById(patient._id);
    const careDecision = await CareDecision.findOne({ patientId: patient._id })
      .sort({ createdAt: -1 }).lean();
    const latestPlan = await CarePlan.findOne({ patientId: patient._id, status: "active" })
      .sort({ version: -1 }).lean();
    const agentEvents = await AgentEvent.find({ patientId: patient._id })
      .sort({ timestamp: -1 }).limit(10).lean();
    const agentRuns = await AgentRun.find({ patientId: patient._id })
      .sort({ createdAt: -1 }).limit(5).lean();

    res.json({
      success: true,
      scenario: "ramesh-stable",
      message: "Stable event created and agent executed for Ramesh",
      patient: { name: patient.name, code: patient.patientCode },
      before: {
        trajectory: patient.trajectoryStatus,
        riskScore: 8,
        followUpDays: patient.followUp?.intervalDays,
        priority: patient.priority,
      },
      after: {
        trajectory: updatedPatient.trajectoryStatus,
        priority: updatedPatient.priority,
        followUpDays: updatedPatient.followUp?.intervalDays,
        currentState: updatedPatient.currentState,
      },
      decision: careDecision,
      carePlan: latestPlan,
      agentEvents: agentEvents.map((e) => ({
        type: e.eventType,
        title: e.title,
        subtitle: e.subtitle,
        timestamp: e.timestamp,
      })),
      agentRun: agentRuns[0] ? {
        status: agentRuns[0].status,
        durationMs: agentRuns[0].durationMs,
        steps: agentRuns[0].steps?.map((s) => s.step),
        executedAction: agentRuns[0].executedAction,
      } : null,
    });
  } catch (error) {
    console.error("Demo scenario error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/scenario/stable", async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientCode: "CT-200" });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Demo patient not found. Run /api/demo/seed first." });
    }

    console.log("\n🟢 DEMO: Creating stable scenario...");

    // Create the stable event
    const event = await createStableEvent(patient._id);

    // Run the CareFlow agent
    console.log("🤖 Running CareFlow agent...");
    const agentResult = await runCareFlowAgent({
      patientId: patient._id,
      trigger: "patient_event",
    });

    // Get updated state
    const updatedPatient = await Patient.findById(patient._id);
    const carePlan = await CareDecision.findOne({ patientId: patient._id, status: "proposed" })
      .sort({ createdAt: -1 }).lean();
    const latestPlan = await CarePlan.findOne({ patientId: patient._id, status: "active" })
      .sort({ version: -1 }).lean();
    const agentEvents = await AgentEvent.find({ patientId: patient._id })
      .sort({ timestamp: -1 }).limit(10).lean();
    const agentRuns = await AgentRun.find({ patientId: patient._id })
      .sort({ createdAt: -1 }).limit(5).lean();

    res.json({
      success: true,
      scenario: "stable",
      message: "Stable event created and agent executed",
      before: {
        trajectory: patient.trajectoryStatus,
        riskScore: 22,
        followUpDays: patient.followUp?.intervalDays,
        priority: patient.priority,
      },
      after: {
        trajectory: updatedPatient.trajectoryStatus,
        priority: updatedPatient.priority,
        followUpDays: updatedPatient.followUp?.intervalDays,
        currentState: updatedPatient.currentState,
      },
      decision: carePlan,
      carePlan: latestPlan,
      agentEvents: agentEvents.map((e) => ({
        type: e.eventType,
        title: e.title,
        subtitle: e.subtitle,
        timestamp: e.timestamp,
      })),
      agentRun: agentRuns[0] ? {
        status: agentRuns[0].status,
        durationMs: agentRuns[0].durationMs,
        steps: agentRuns[0].steps?.map((s) => s.step),
        executedAction: agentRuns[0].executedAction,
      } : null,
    });
  } catch (error) {
    console.error("Demo scenario error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET /api/demo/status
// Show current demo patient state
// ============================================================
const getPatientStatus = async (patientCode) => {
  const patient = await Patient.findOne({ patientCode });
  if (!patient) return null;

  const events = await PatientEvent.countDocuments({ patientId: patient._id });
  const decisions = await CareDecision.countDocuments({ patientId: patient._id });
  const runs = await AgentRun.countDocuments({ patientId: patient._id });
  const memories = await Memory.countDocuments({ patientId: patient._id });
  const carePlan = await CarePlan.findOne({ patientId: patient._id, status: "active" }).sort({ version: -1 }).lean();
  const latestDecision = await CareDecision.findOne({ patientId: patient._id }).sort({ createdAt: -1 }).lean();

  return {
    name: patient.name,
    code: patient.patientCode,
    language: patient.preferredLanguage,
    trajectory: patient.trajectoryStatus,
    priority: patient.priority,
    followUpDays: patient.followUp?.intervalDays,
    currentState: patient.currentState,
    carePlan: carePlan ? {
      followUpDays: carePlan.followUp?.intervalDays,
      priority: carePlan.priority,
      version: carePlan.version,
    } : null,
    latestDecision: latestDecision ? {
      type: latestDecision.decisionType,
      riskLevel: latestDecision.riskLevel,
      followUpDays: latestDecision.recommendedFollowUpIntervalDays,
      reasoning: latestDecision.reasoning?.slice(0, 200),
    } : null,
    counts: { events, decisions, runs, memories },
  };
};

router.get("/status", async (req, res) => {
  try {
    const savita = await getPatientStatus("CT-200");
    const ramesh = await getPatientStatus("CT-201");

    res.json({
      success: true,
      patients: {
        savita,
        ramesh,
      },
      message: savita || ramesh ? "Demo patients found" : "No demo patients seeded",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
