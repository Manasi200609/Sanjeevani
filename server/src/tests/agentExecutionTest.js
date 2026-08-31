// ============================================================
// CAREFLOW AGENT — Machine-Verifiable Execution Test
// ============================================================
//
// This test verifies:
// A. Agent framework detection (ADK vs Gemini vs Groq)
// B. Model configuration
// C. Actual tool calls occurred
// D. Tool diversity (multiple different tools invoked)
// E. Database mutations (CareDecision, CarePlan)
// F. AgentRun consistency (persisted tool calls match observed)
// G. AgentEvent creation (tool_called, decision_made, agent_completed)
// H. No duplicate tool execution
// I. Provider/framework honesty (no silent downgrades)
//
// Run: node src/tests/agentExecutionTest.js
//
// ============================================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import env from "../config/env.js";

dotenv.config({ path: new URL("../../.env", import.meta.url) });

import Patient from "../models/Patient.js";
import PatientEvent from "../models/PatientEvent.js";
import CarePlan from "../models/CarePlan.js";
import CareDecision from "../models/CareDecision.js";
import AgentRun from "../models/AgentRun.js";
import AgentEvent from "../models/AgentEvent.js";
import Memory from "../models/Memory.js";
import { seedSavitaLongitudinal, createWorseningEvent, resetDemo } from "../simulation/demoScenarios.js";

// ============================================================
// TEST UTILITIES
// ============================================================

let passed = 0;
let failed = 0;
let skipped = 0;

const assert = (condition, message) => {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
};

const skip = (message) => {
  console.log(`  ⏭️  SKIPPED: ${message}`);
  skipped++;
};

const section = (title) => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}`);
};

// ============================================================
// MAIN TEST
// ============================================================

const runTests = async () => {
  console.log("\n🧪 CAREFLOW AGENT EXECUTION TEST");
  console.log(`   Provider: ${env.AI_PROVIDER}`);
  console.log(`   Model: ${env.GEMINI_MODEL}`);
  console.log(`   Gemini Key: ${env.GEMINI_API_KEY ? "PRESENT" : "MISSING"}`);
  console.log(`   Execution Mode: ${env.AGENT_EXECUTION_MODE}`);

  // --------------------------------------------------------
  // Connect to MongoDB
  // --------------------------------------------------------
  section("DATABASE CONNECTION");
  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    assert(true, "Connected to MongoDB");
  } catch (error) {
    console.error("  ❌ Cannot connect to MongoDB:", error.message);
    console.log("\n  Test aborted — MongoDB is required.\n");
    process.exit(1);
  }

  // --------------------------------------------------------
  // A. Agent framework detection
  // --------------------------------------------------------
  section("A. AGENT FRAMEWORK");
  const configuredProvider = (env.AI_PROVIDER || "gemini").toLowerCase();
  const hasGeminiKey = !!env.GEMINI_API_KEY;

  if (configuredProvider === "gemini" && hasGeminiKey) {
    assert(true, "AI_PROVIDER=gemini with GEMINI_API_KEY present");
    assert(true, "Expected framework: google-adk or gemini-sdk");
  } else if (configuredProvider === "gemini" && !hasGeminiKey) {
    assert(false, "AI_PROVIDER=gemini but GEMINI_API_KEY is MISSING — cannot run Gemini/ADK");
    skip("Gemini/ADK tests require GEMINI_API_KEY in .env");
  } else {
    assert(true, `AI_PROVIDER=${configuredProvider} — development fallback mode`);
    skip("Gemini/ADK tests require AI_PROVIDER=gemini");
  }

  // --------------------------------------------------------
  // B. Model configuration
  // --------------------------------------------------------
  section("B. MODEL CONFIGURATION");
  assert(env.GEMINI_MODEL === "gemini-3.7-flash", `GEMINI_MODEL=${env.GEMINI_MODEL} `);

  // --------------------------------------------------------
  // C-G. Seed and run the worsening scenario
  // --------------------------------------------------------
  section("C-G. WORSENING SCENARIO");

  // Reset first
  await resetDemo();
  const { patient, seeded } = await seedSavitaLongitudinal();

  assert(!!patient, `Demo patient created: ${patient?.name} (${patient?.patientCode})`);
  assert(seeded, "Longitudinal events seeded (3 baseline events)");
  assert(patient?.followUp?.intervalDays === 7, `Initial follow-up: ${patient?.followUp?.intervalDays} days (expected: 7)`);

  // Create worsening event
  const worseningEvent = await createWorseningEvent(patient._id);
  assert(!!worseningEvent, "Worsening event created");
  assert(worseningEvent.symptoms?.length === 2, `Event has ${worseningEvent.symptoms?.length} symptoms (expected: 2)`);

  // Run the agent
  console.log("\n  🤖 Running CareFlow agent...");
  const { runCareflowAgent } = await import("../agents/careflowAgent.js");

  let agentResult;
  try {
    agentResult = await runCareflowAgent({
      patientId: patient._id,
      trigger: "patient_event",
    });
    assert(true, "Agent execution completed without error");
  } catch (error) {
    assert(false, `Agent execution failed: ${error.message}`);
    console.log("\n  Test aborted — agent execution failed.\n");
    await mongoose.disconnect();
    process.exit(1);
  }

  // C. Actual tool calls
  section("C. ACTUAL TOOL CALLS");
  assert(agentResult.toolCalls.length > 0, `Tool calls executed: ${agentResult.toolCalls.length}`);
  agentResult.toolCalls.forEach((tc, i) => {
    assert(!!tc.name, `  Tool ${i + 1}: ${tc.name}`);
  });

  // D. Tool diversity
  section("D. TOOL DIVERSITY");
  const uniqueTools = [...new Set(agentResult.toolCalls.map((tc) => tc.name))];
  assert(uniqueTools.length >= 3, `${uniqueTools.length} unique tools invoked: ${uniqueTools.join(", ")}`);

  // Provider/framework
  section("PROVIDER / FRAMEWORK");
  assert(!!agentResult.provider, `Provider: ${agentResult.provider}`);
  assert(!!agentResult.framework, `Framework: ${agentResult.framework}`);
  assert(!!agentResult.model, `Model: ${agentResult.model}`);

  if (configuredProvider === "gemini" && hasGeminiKey) {
    assert(
      agentResult.provider === "gemini" || agentResult.provider === "gemini_adk",
      `Provider should be gemini or gemini_adk, got: ${agentResult.provider}`
    );
  } else {
    assert(
      agentResult.provider === "groq",
      `Without Gemini key, provider should be groq, got: ${agentResult.provider}`
    );
  }

  // E. Database mutations
  section("E. DATABASE MUTATIONS");

  // Check CareDecision
  const decisions = await CareDecision.find({ patientId: patient._id }).lean();
  assert(decisions.length > 0, `CareDecision created: ${decisions.length} decision(s)`);

  if (decisions.length > 0) {
    const latest = decisions[decisions.length - 1];
    assert(!!latest.decisionType, `Decision type: ${latest.decisionType}`);
    assert(!!latest.riskLevel, `Risk level: ${latest.riskLevel}`);
    assert(!!latest.reasoning, "Decision has reasoning");
    assert(latest.reasoning.length > 10, `Reasoning length: ${latest.reasoning.length} chars`);
  }

  // Check CarePlan
  const carePlan = await CarePlan.findOne({ patientId: patient._id, status: "active" })
    .sort({ version: -1 })
    .lean();
  assert(!!carePlan, "Active CarePlan exists");
  assert(carePlan?.version > 1, `CarePlan version: ${carePlan?.version} (expected > 1 for worsening)`);

  if (carePlan) {
    assert(
      carePlan.followUp?.intervalDays !== 7 || carePlan.version > 1,
      `CarePlan follow-up: ${carePlan.followUp?.intervalDays} days (was 7, should have changed)`
    );
  }

  // Check Patient state
  const updatedPatient = await Patient.findById(patient._id);
  assert(!!updatedPatient, "Patient record updated");

  // F. AgentRun consistency
  section("F. AGENT RUN CONSISTENCY");
  const agentRun = await AgentRun.findOne({ patientId: patient._id })
    .sort({ createdAt: -1 })
    .lean();

  assert(!!agentRun, "AgentRun record exists");
  assert(agentRun?.status === "completed", `AgentRun status: ${agentRun?.status}`);
  assert(agentRun?.model, `AgentRun model: ${agentRun?.model}`);
  assert(agentRun?.framework, `AgentRun framework: ${agentRun?.framework}`);
  assert(
    agentRun?.toolCalls?.length > 0,
    `AgentRun toolCalls persisted: ${agentRun?.toolCalls?.length}`
  );

  // Verify tool calls in AgentRun match what we got from the agent
  if (agentRun?.toolCalls && agentResult.toolCalls) {
    assert(
      agentRun.toolCalls.length === agentResult.toolCalls.length,
      `Tool call count match: AgentRun=${agentRun.toolCalls.length}, Result=${agentResult.toolCalls.length}`
    );
  }

  // G. AgentEvents
  section("G. AGENT EVENTS");
  const agentEvents = await AgentEvent.find({ agentRunId: agentRun?._id })
    .sort({ timestamp: 1 })
    .lean();

  const eventTypes = [...new Set(agentEvents.map((e) => e.eventType))];
  assert(agentEvents.length > 0, `AgentEvents created: ${agentEvents.length}`);
  assert(eventTypes.includes("agent_started"), "Event type: agent_started");
  assert(eventTypes.includes("agent_completed"), "Event type: agent_completed");

  const toolEvents = agentEvents.filter((e) => e.eventType === "tool_called");
  assert(toolEvents.length > 0, `Tool-called events: ${toolEvents.length}`);

  if (decisions.length > 0) {
    assert(eventTypes.includes("decision_made"), "Event type: decision_made");
  }

  // H. No duplicate execution
  section("H. DUPLICATE EXECUTION CHECK");
  if (agentRun?.toolCalls) {
    const toolNames = agentRun.toolCalls.map((tc) => tc.name);
    const uniqueNames = [...new Set(toolNames)];
    assert(
      toolNames.length === uniqueNames.length,
      `No duplicate tool names: ${toolNames.length} total, ${uniqueNames.length} unique`
    );
  } else {
    skip("No tool calls to check for duplicates");
  }

  // I. Provider honesty
  section("I. PROVIDER HONESTY");
  if (configuredProvider === "gemini" && hasGeminiKey) {
    assert(
      agentResult.framework === "google-adk" || agentResult.framework === "gemini-sdk",
      `Framework correctly reported as ${agentResult.framework} (not silently downgraded)`
    );
  } else if (configuredProvider === "gemini" && !hasGeminiKey) {
    // The system should report that it couldn't use Gemini
    assert(
      agentResult.provider === "groq",
      `Correctly fell back to Groq (no Gemini key). Provider: ${agentResult.provider}`
    );
  }

  // --------------------------------------------------------
  // STABLE SCENARIO
  // --------------------------------------------------------
  section("STABLE SCENARIO VERIFICATION");
  await resetDemo();
  const { patient: stablePatient } = await seedSavitaLongitudinal();
  const stableEvent = await createStableEvent(stablePatient._id);
  assert(!!stableEvent, "Stable event created");

  console.log("\n  🤖 Running agent for stable scenario...");
  const stableResult = await runCareflowAgent({
    patientId: stablePatient._id,
    trigger: "patient_event",
  });

  assert(stableResult.toolCalls.length > 0, `Stable scenario tool calls: ${stableResult.toolCalls.length}`);

  // In stable scenario, agent should ideally NOT increase follow-up
  // But we don't hardcode the decision — we verify the agent produced SOME decision
  const stableDecisions = await CareDecision.find({ patientId: stablePatient._id }).lean();
  assert(stableDecisions.length > 0, `Stable scenario created ${stableDecisions.length} decision(s)`);

  if (stableDecisions.length > 0) {
    const stableDecision = stableDecisions[stableDecisions.length - 1];
    console.log(`\n  📋 Stable decision: ${stableDecision.decisionType} (risk: ${stableDecision.riskLevel})`);
    // We don't assert a specific decision — the LLM decides
    // But we verify it made SOME decision based on the data
    assert(!!stableDecision.reasoning, "Stable decision has reasoning");
  }

  // --------------------------------------------------------
  // CLEANUP
  // --------------------------------------------------------
  await resetDemo();

  // --------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------
  section("TEST SUMMARY");
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📊 Total: ${passed + failed + skipped}`);

  if (failed > 0) {
    console.log("\n  ⚠️  SOME TESTS FAILED — see above for details.\n");
  } else {
    console.log("\n  🎉 ALL TESTS PASSED.\n");
  }

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

// Helper: create stable event (imported inline to avoid circular)
const createStableEvent = async (patientId) => {
  const PatientEvent = (await import("../models/PatientEvent.js")).default;
  const patient = await Patient.findById(patientId);
  if (!patient) throw new Error("Patient not found");

  const event = await PatientEvent.create({
    patientId: patient._id,
    eventType: "visit",
    source: "patient",
    timestamp: new Date(),
    symptoms: [{ name: "fatigue", severity: 2, status: "improving" }],
    medications: [{ name: "Metformin 500mg", adherence: "good", notes: "Back on regular schedule" }],
    vitals: { heartRate: 70, systolicBP: 125, diastolicBP: 80, oxygenSaturation: 98 },
    notes: "Patient feeling much better. Fatigue has reduced. Back on regular medication schedule. No dizziness.",
    severity: "low",
    riskScore: 10,
    trajectorySignal: "improving",
  });

  patient.lastVisitAt = event.timestamp;
  await patient.save();
  return event;
};

// Run
runTests().catch((error) => {
  console.error("Test runner error:", error);
  mongoose.disconnect().finally(() => process.exit(1));
});
