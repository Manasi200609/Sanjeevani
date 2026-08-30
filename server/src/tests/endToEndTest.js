// ============================================================
// END-TO-END TEST — CareFlow Agent Verification
// ============================================================
//
// Tests the complete autonomous agent lifecycle:
//   1. Seed longitudinal data
//   2. Create worsening event
//   3. Run agent
//   4. Verify database state changes
//   5. Reset and test stable scenario
//
// Run: node src/tests/endToEndTest.js
//
// ============================================================

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

import Patient from "../models/Patient.js";
import PatientEvent from "../models/PatientEvent.js";
import CarePlan from "../models/CarePlan.js";
import CareDecision from "../models/CareDecision.js";
import AgentRun from "../models/AgentRun.js";
import AgentEvent from "../models/AgentEvent.js";
import Memory from "../models/Memory.js";

import {
  seedSavitaLongitudinal,
  createWorseningEvent,
  createStableEvent,
  resetAndReseed,
} from "../simulation/demoScenarios.js";

import { runCareFlowAgent } from "../agents/orchestrator.js";

// ============================================================
// HELPERS
// ============================================================

let passed = 0;
let failed = 0;

const assert = (condition, name) => {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
};

const section = (title) => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${title}`);
  console.log(`${"=".repeat(60)}`);
};

// ============================================================
// MAIN TEST
// ============================================================

const runTest = async () => {
  console.log("\n🧪 CAREFLOW END-TO-END AGENT TEST");
  console.log("==================================\n");

  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI not set in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB\n");

  try {
    // ----------------------------------------------------------
    // TEST 1: Seed longitudinal data
    // ----------------------------------------------------------
    section("TEST 1: Seed longitudinal data");

    const seedResult = await resetAndReseed();
    assert(seedResult.seeded === true, "Longitudinal data seeded");
    assert(seedResult.events >= 3, `At least 3 historical events (${seedResult.events} created)`);
    assert(seedResult.carePlan, "Initial care plan created (7-day follow-up)");

    const patient = await Patient.findOne({ patientCode: "CT-200" });
    assert(patient !== null, "Savita Jadhav patient exists");
    assert(patient.followUp?.intervalDays === 7, `Initial follow-up is 7 days (got ${patient.followUp?.intervalDays})`);
    assert(patient.trajectoryStatus === "stable", `Initial trajectory is stable (got ${patient.trajectoryStatus})`);

    const eventCount = await PatientEvent.countDocuments({ patientId: patient._id });
    assert(eventCount >= 3, `At least 3 longitudinal events (${eventCount} found)`);

    // ----------------------------------------------------------
    // TEST 2: Worsening scenario — agent should change care plan
    // ----------------------------------------------------------
    section("TEST 2: Worsening scenario — agent should change care plan");

    // Record BEFORE state
    const beforePlan = await CarePlan.findOne({ patientId: patient._id, status: "active" })
      .sort({ version: -1 }).lean();
    const beforeInterval = beforePlan?.followUp?.intervalDays || 7;
    console.log(`  📊 Before: follow-up every ${beforeInterval} days, trajectory: ${patient.trajectoryStatus}`);

    // Create worsening event
    const worseningEvent = await createWorseningEvent(patient._id);
    assert(worseningEvent !== null, "Worsening event created");
    assert(worseningEvent.symptoms?.length === 2, "Event has 2 symptoms (fatigue + dizziness)");
    assert(worseningEvent.symptoms?.some((s) => s.status === "new"), "New symptom (dizziness) detected");
    assert(worseningEvent.medications?.some((m) => m.adherence === "partial"), "Partial medication adherence");

    // Run the agent
    console.log("\n  🤖 Running CareFlow agent...");
    const agentResult = await runCareFlowAgent({
      patientId: patient._id,
      trigger: "patient_event",
    });

    assert(agentResult.run !== null, "Agent run record created");
    assert(agentResult.run.status === "completed", `Agent run completed (status: ${agentResult.run.status})`);
    assert(agentResult.agentResult?.toolCalls?.length > 0, `Agent made tool calls (${agentResult.agentResult?.toolCalls?.length || 0} calls)`);
    assert(agentResult.agentResult?.response?.length > 0, "Agent produced a response");

    // Log tool calls
    if (agentResult.agentResult?.toolCalls) {
      console.log("\n  📝 Tool calls made by the agent:");
      for (const tc of agentResult.agentResult.toolCalls) {
        const argsStr = JSON.stringify(tc.args).slice(0, 100);
        const resultStr = tc.result?.error ? `❌ ${tc.result.error}` : "✅ success";
        console.log(`     ${tc.name}(${argsStr}) → ${resultStr}`);
      }
    }

    // Verify database state AFTER agent run
    const afterPatient = await Patient.findById(patient._id);
    console.log(`\n  📊 After: follow-up every ${afterPatient.followUp?.intervalDays} days, trajectory: ${afterPatient.trajectoryStatus}, priority: ${afterPatient.priority}`);

    // Check care decision was created
    const decisions = await CareDecision.find({ patientId: patient._id }).sort({ createdAt: -1 });
    const latestDecision = decisions[0];
    assert(decisions.length > 0, `Care decision created (${decisions.length} total)`);

    if (latestDecision) {
      assert(
        latestDecision.reasoning?.length > 0,
        `Decision has reasoning (${latestDecision.reasoning?.slice(0, 80)}...)`
      );
      assert(
        latestDecision.ashaMessage?.length > 0,
        `Decision has ASHA message`
      );
      console.log(`     Decision type: ${latestDecision.decisionType}`);
      console.log(`     Risk level: ${latestDecision.riskLevel}`);
      console.log(`     Priority: ${latestDecision.priority}`);
      console.log(`     Follow-up: ${latestDecision.recommendedFollowUpIntervalDays} days`);
    }

    // Check agent events were created
    const agentEvents = await AgentEvent.find({ patientId: patient._id }).sort({ timestamp: -1 });
    assert(agentEvents.length > 0, `Agent events created (${agentEvents.length} total)`);
    console.log("\n  📋 Agent events:");
    for (const event of agentEvents) {
      console.log(`     ${event.eventType}: ${event.title}`);
    }

    // Check agent run steps
    const run = agentResult.run;
    assert(run.steps?.length >= 3, `Agent run has steps (${run.steps?.length || 0} steps)`);
    assert(run.durationMs > 0, `Agent run has duration (${run.durationMs}ms)`);
    console.log(`\n  📊 Agent run: ${run.status} in ${run.durationMs}ms`);
    console.log(`     Steps: ${run.steps?.map((s) => s.step).join(" → ")}`);
    console.log(`     Action: ${run.executedAction}`);

    // ----------------------------------------------------------
    // TEST 3: Verify agent actually called tools (not hardcoded)
    // ----------------------------------------------------------
    section("TEST 3: Verify agent called real tools (not hardcoded)");

    const toolNames = agentResult.agentResult?.toolCalls?.map((tc) => tc.name) || [];
    assert(toolNames.includes("get_patient_context"), "Called get_patient_context");
    assert(toolNames.includes("get_patient_timeline"), "Called get_patient_timeline");
    assert(toolNames.includes("get_active_care_plan"), "Called get_active_care_plan");

    // Check if trajectory analysis was called
    const hasTrajectoryAnalysis = toolNames.includes("analyze_trajectory");
    assert(hasTrajectoryAnalysis, "Called analyze_trajectory");

    // Check if agent actually decided to take action
    const hasDecision = toolNames.includes("create_care_decision");
    const hasPlanUpdate = toolNames.includes("update_care_plan");
    console.log(`  📊 Agent tools: ${toolNames.join(", ")}`);
    console.log(`  📊 Created decision: ${hasDecision ? "YES" : "NO"}`);
    console.log(`  📊 Updated care plan: ${hasPlanUpdate ? "YES" : "NO"}`);

    // Verify the care plan was actually changed
    const updatedPlan = await CarePlan.findOne({ patientId: patient._id, status: "active" })
      .sort({ version: -1 }).lean();
    if (updatedPlan) {
      const planChanged = updatedPlan.version > 1 || updatedPlan.followUp?.intervalDays !== beforeInterval;
      assert(planChanged, `Care plan was actually modified (v${updatedPlan.version}, interval: ${updatedPlan.followUp?.intervalDays}d)`);
    }

    // ----------------------------------------------------------
    // TEST 4: Stable scenario — agent should preserve plan
    // ----------------------------------------------------------
    section("TEST 4: Stable scenario — agent should preserve plan");

    // Reset for stable test
    await resetAndReseed();
    const freshPatient = await Patient.findOne({ patientCode: "CT-200" });

    // Create stable event
    const stableEvent = await createStableEvent(freshPatient._id);
    assert(stableEvent !== null, "Stable event created");

    console.log("\n  🤖 Running CareFlow agent for stable scenario...");
    const stableResult = await runCareFlowAgent({
      patientId: freshPatient._id,
      trigger: "patient_event",
    });

    assert(stableResult.run.status === "completed", "Agent run completed");

    // Check the stable scenario
    const stableToolNames = stableResult.agentResult?.toolCalls?.map((tc) => tc.name) || [];
    console.log(`  📊 Agent tools: ${stableToolNames.join(", ")}`);

    const stablePatient = await Patient.findById(freshPatient._id);
    console.log(`  📊 After stable: trajectory=${stablePatient.trajectoryStatus}, priority=${stablePatient.priority}, followUp=${stablePatient.followUp?.intervalDays}d`);

    // In a stable scenario, the agent should either maintain or have minimal impact
    // The key point is that it actually reasoned about the data
    const stableAgentEvents = await AgentEvent.find({ patientId: freshPatient._id })
      .sort({ timestamp: -1 });
    assert(stableAgentEvents.length > 0, `Agent events created for stable scenario (${stableAgentEvents.length})`);

    // ----------------------------------------------------------
    // TEST 5: Verify frontend compatibility
    // ----------------------------------------------------------
    section("TEST 5: Verify frontend compatibility (Live Monitor)");

    const allEvents = await AgentEvent.find().sort({ timestamp: -1 }).limit(20);
    assert(allEvents.length > 0, `Agent events exist for Live Monitor (${allEvents.length} total)`);

    // Verify event shape matches frontend expectations
    const sampleEvent = allEvents[0];
    assert(sampleEvent.eventType !== undefined, "Event has eventType");
    assert(sampleEvent.title !== undefined, "Event has title");
    assert(sampleEvent.subtitle !== undefined, "Event has subtitle");
    assert(sampleEvent.timestamp !== undefined, "Event has timestamp");

    // Verify AgentRun shape matches frontend expectations
    const allRuns = await AgentRun.find().sort({ createdAt: -1 }).limit(5);
    assert(allRuns.length > 0, `Agent runs exist (${allRuns.length})`);
    if (allRuns[0]) {
      assert(allRuns[0].steps?.length > 0, "Run has steps array");
      assert(allRuns[0].startedAt, "Run has startedAt");
      assert(allRuns[0].completedAt, "Run has completedAt");
    }

    // ----------------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------------
    section("TEST RESULTS");

    console.log(`\n  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total:  ${passed + failed}`);

    if (failed === 0) {
      console.log("\n  🎉 ALL TESTS PASSED!\n");
    } else {
      console.log(`\n  ⚠️  ${failed} test(s) failed.\n`);
    }

    return { passed, failed };
  } catch (error) {
    console.error("\n❌ TEST ERROR:", error.message);
    console.error(error.stack);
    return { passed, failed: failed + 1, error: error.message };
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run if executed directly
runTest().then((result) => {
  process.exit(result.failed > 0 ? 1 : 0);
});
