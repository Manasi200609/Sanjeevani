import express from "express";
import { seedPatients } from "../simulation/seedPatients.js";
import { generateDemoEvents } from "../simulation/generateEvents.js";
import { runCareFlowAgentSafely } from "../agents/orchestrator.js";

const router = express.Router();

// ============================================================
// POST /api/simulation/seed
//
// Seeds demo patients into the database.
// Safe to call multiple times (skips existing patients).
// ============================================================

router.post("/seed", async (req, res) => {
  try {
    const result = await seedPatients();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to seed patients",
      error: error.message,
    });
  }
});

// ============================================================
// POST /api/simulation/generate-events
//
// Generates simulated patient events for all demo patients.
// Body: { days?: number } (default 5)
// ============================================================

router.post("/generate-events", async (req, res) => {
  try {
    const days = req.body?.days || 5;
    const result = await generateDemoEvents({ days });
    res.json(result);
  } catch (error) {
    console.error("Event generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate events",
      error: error.message,
    });
  }
});

// ============================================================
// POST /api/simulation/setup
//
// Full demo setup: seed patients + generate events.
// This is the one-click button for the hackathon demo.
// ============================================================

router.post("/setup", async (req, res) => {
  try {
    const days = req.body?.days || 5;

    console.log("\n🎬 SIMULATION: Starting full demo setup...");

    const seedResult = await seedPatients();

    const eventResult = await generateDemoEvents({ days });

    console.log("✅ SIMULATION: Demo setup complete.\n");

    res.json({
      success: true,
      message: "Demo simulation setup complete",
      seeding: seedResult,
      events: eventResult,
    });
  } catch (error) {
    console.error("Simulation setup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set up simulation",
      error: error.message,
    });
  }
});

// ============================================================
// POST /api/simulation/run-all-agents
//
// Runs the CareFlow agent for all active patients.
// Useful for demo: seed → generate events → run agents → dashboard
// ============================================================

router.post("/run-all-agents", async (req, res) => {
  try {
    const Patient = (await import("../models/Patient.js")).default;
    const patients = await Patient.find({ isActive: true });

    console.log(
      `\n🤖 Running CareFlow agent for ${patients.length} patients...`
    );

    const results = [];
    for (const patient of patients) {
      const result = await runCareFlowAgentSafely({
        patientId: patient._id.toString(),
        trigger: "scheduled_monitor",
      });
      results.push(result);
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `✅ Agent runs complete: ${successful} successful, ${failed} failed\n`
    );

    res.json({
      success: true,
      processed: results.length,
      successful,
      failed,
      results,
    });
  } catch (error) {
    console.error("Run all agents error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to run agents",
      error: error.message,
    });
  }
});

export default router;
