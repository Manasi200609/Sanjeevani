// ============================================================
// CAREFLOW ORCHESTRATOR — Agent Lifecycle Manager
// ============================================================
//
// Manages the five-stage agent lifecycle:
//   OBSERVE → REASON → PLAN → EXECUTE → COMMUNICATE
//
// The actual reasoning is delegated to the tool-calling agent
// (careflowAgent.js). The orchestrator creates AgentRun and
// AgentEvent records so the frontend Live Monitor can display
// what the agent is doing.
//
// ============================================================

import Patient from "../models/Patient.js";
import AgentRun from "../models/AgentRun.js";

import { buildPatientContext } from "../memory/contextBuilder.js";
import {
  createAgentEvent,
  createAgentReasonedEvent,
  createDecisionMadeEvent,
  createCarePlanUpdatedEvent,
  createAgentCompletedEvent,
  createAgentFailedEvent,
  createToolCalledEvent,
} from "../services/agentEventService.js";

import CareDecision from "../models/CareDecision.js";

import {
  consolidatePatientMemory,
} from "../memory/memoryConsolidation.js";

import {
  buildNotificationFromDecision,
  sendNotification,
} from "../services/notificationService.js";

const now = () => new Date();

const normalizeTrigger = (trigger) => {
  const allowed = [
    "manual",
    "new_visit",
    "patient_event",
    "trajectory_change",
    "scheduled_monitor",
    "follow_up_due",
    "system",
  ];
  return allowed.includes(trigger) ? trigger : "manual";
};

const recordStep = (run, step, status, startedAt, completedAt, details = {}) => {
  run.steps.push({ step, status, startedAt, completedAt, details });
};

// ============================================================
// MAIN ENTRY POINT
// ============================================================

export const runCareFlowAgent = async ({ patientId, trigger = "manual" }) => {
  const patient = await Patient.findById(patientId);

  if (!patient) {
    throw new Error("Patient not found");
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 CAREFLOW AGENT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Patient: ${patient.name} (${patient.patientCode})`);
  console.log(`Trigger: ${trigger}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Create AgentRun record
  const run = await AgentRun.create({
    patientId,
    trigger: normalizeTrigger(trigger),
    status: "running",
    steps: [],
    startedAt: now(),
  });

  try {
    // Decision variable — set by either anti-spam cache or LLM reasoning
    let decision = null;

    // ----------------------------------------------------------
    // STEP 1 — OBSERVE: Build context deterministically
    // ----------------------------------------------------------
    console.log("🔎 STEP 1: Observing patient context...");
    const observeStartedAt = now();
    const context = await buildPatientContext(patientId);
    const observeCompletedAt = now();

    recordStep(run, "observe", "completed", observeStartedAt, observeCompletedAt, {
      eventsAnalyzed: context.trajectory?.eventsAnalyzed ?? 0,
      trajectory: context.trajectory?.status ?? "unknown",
      riskScore: context.trajectory?.riskScore ?? 0,
    });
    await run.save();

    console.log("\n[CareFlow] ─── OBSERVE ───");
    console.log(`[CareFlow] Patient: ${patient.name} (${patient.patientCode})`);
    console.log(`[CareFlow] Recent events: ${context.trajectory?.eventsAnalyzed || 0}`);
    console.log(`[CareFlow] Current risk: ${context.trajectory?.riskScore || 0}`);
    console.log(`[CareFlow] Previous risk: ${context.trajectory?.previousRiskScore ?? 'N/A'}`);
    console.log(`[CareFlow] Risk change: ${context.trajectory?.riskChange ?? 0}`);
    console.log(`[CareFlow] Risk direction: ${context.trajectory?.riskDirection || 'unknown'}`);
    console.log(`[CareFlow] Trajectory: ${context.trajectory?.status || 'unknown'}`);
    console.log(`[CareFlow] Current follow-up: ${context.patient?.followUp?.intervalDays || 'N/A'} days`);
    console.log(`[CareFlow] Active symptoms: ${context.activeSymptoms?.length || 0}`);
    for (const s of (context.activeSymptoms || []).slice(0, 5)) {
      console.log(`[CareFlow]   - ${s.name}: severity ${s.severity}, status ${s.status}`);
    }
    console.log(`[CareFlow] Medication patterns: ${context.medicationPatterns?.length || 0}`);
    for (const m of (context.medicationPatterns || []).slice(0, 3)) {
      console.log(`[CareFlow]   - ${m.name}: adherence ${m.adherence}`);
    }

    // Record observation event
    await createAgentEvent({
      eventType: "agent_started",
      patientId: patient._id,
      patientName: patient.name,
      patientCode: patient.patientCode,
      agentRunId: run._id,
      title: `CareFlow analyzing ${patient.name}`,
      subtitle: `Reviewing ${context.trajectory?.eventsAnalyzed || 0} longitudinal events · Risk: ${context.trajectory?.riskScore || 0}`,
      data: {
        eventsAnalyzed: context.trajectory?.eventsAnalyzed || 0,
        currentTrajectory: context.trajectory?.status || "unknown",
        riskScore: context.trajectory?.riskScore || 0,
      },
    }).catch(() => {});

    // ─── REMEMBER ───
    console.log("\n[CareFlow] ─── REMEMBER ───");
    console.log(`[CareFlow] Long-term memories loaded: ${context.longTermMemory?.length || 0}`);
    for (const mem of (context.longTermMemory || []).slice(0, 3)) {
      console.log(`[CareFlow]   - ${mem.summary?.slice(0, 100)}...`);
    }
    console.log(`[CareFlow] Previous decisions loaded: ${context.recentDecisions?.length || 0}`);
    for (const dec of (context.recentDecisions || []).slice(0, 3)) {
      console.log(`[CareFlow]   - ${dec.decisionType} | risk: ${dec.riskLevel} | follow-up: ${dec.recommendedFollowUpIntervalDays}d`);
    }

    // ─── ANALYZE ───
    console.log("\n[CareFlow] ─── ANALYZE ───");
    const riskTrend = (context.recentTimeline || []).map(e => e.riskScore ?? 0).reverse();
    console.log(`[CareFlow] Risk trend: ${riskTrend.join(' → ') || 'no events'}`);
    const symptomSummary = (context.activeSymptoms || []).map(s => `${s.name} ${s.status}`).join(', ');
    console.log(`[CareFlow] Symptoms: ${symptomSummary || 'none'}`);
    const medSummary = (context.medicationPatterns || []).map(m => `${m.name}: ${m.adherence}`).join(', ');
    console.log(`[CareFlow] Medication adherence: ${medSummary || 'none'}`);

    // ─── ASSESS ───
    console.log("\n[CareFlow] ─── ASSESS ───");
    const riskScore = context.trajectory?.riskScore || 0;
    const riskLevel = riskScore >= 76 ? 'critical' : riskScore >= 51 ? 'high' : riskScore >= 26 ? 'moderate' : 'low';
    console.log(`[CareFlow] Risk level: ${riskLevel} (${riskScore}/100)`);
    console.log(`[CareFlow] Trajectory: ${context.trajectory?.status || 'unknown'}`);
    console.log(`[CareFlow] Confidence: ${Math.round((context.trajectory?.confidence || 0) * 100)}%`);

    // ─── ANTI-SPAM CHECK ───
    // Before invoking the LLM, check if the current state already matches
    // the most recent decision. If so, we can skip the expensive LLM call.
    const latestDecision = await CareDecision.findOne({ patientId })
      .sort({ createdAt: -1 }).lean();

    const currentRiskLevel = riskLevel;
    const currentTrajectory = context.trajectory?.status || 'unknown';
    const currentFollowUp = context.patient?.followUp?.intervalDays || 7;
    let agentResult = null;

    if (
      latestDecision &&
      latestDecision.status === 'proposed' &&
      latestDecision.riskLevel === currentRiskLevel &&
      latestDecision.contextSnapshot?.trajectory === currentTrajectory &&
      latestDecision.recommendedFollowUpIntervalDays === currentFollowUp
    ) {
      console.log("\n[CareFlow] ─── ANTI-SPAM ───");
      console.log(`[CareFlow] Current state matches previous decision (${latestDecision.decisionType}).`);
      console.log("[CareFlow] No meaningful change detected. Skipping LLM call.");
      console.log("[CareFlow] Reusing existing decision.");

      decision = latestDecision;

      recordStep(run, "reason", "completed", now(), now(), {
        provider: "cached",
        framework: "anti-spam",
        model: null,
        toolCalls: 0,
        rounds: 0,
        responseLength: 0,
        antiSpam: true,
      });

      await run.save();
    } else {

    // ----------------------------------------------------------
    // STEP 2-4 — REASON + PLAN + EXECUTE via tool-calling agent
    // ----------------------------------------------------------
    console.log("\n[CareFlow] ─── DECIDE (LLM) ───");
    console.log("[CareFlow] Gemini/ADK reasoning via tool-calling agent...");
    const reasonStartedAt = now();

    const { runCareflowAgent: executeAgent } = await import("./careflowAgent.js");
    agentResult = await executeAgent({ patientId, trigger });

    const reasonCompletedAt = now();

    // Record reasoning step
    recordStep(run, "reason", "completed", reasonStartedAt, reasonCompletedAt, {
      provider: agentResult.provider,
      framework: agentResult.framework,
      model: agentResult.model,
      toolCalls: agentResult.toolCalls?.length || 0,
      rounds: agentResult.rounds || 0,
      responseLength: agentResult.response?.length || 0,
    });

    // Set model and framework on the run
    run.model = agentResult.model || null;
    run.framework = agentResult.framework || null;
    await run.save();

    // Record agent reasoning event
    await createAgentReasonedEvent(patient, run, {
      riskLevel: context.trajectory?.riskScore > 50 ? "high" : context.trajectory?.riskScore > 25 ? "moderate" : "low",
      riskScore: context.trajectory?.riskScore || 0,
      trajectory: context.trajectory?.status || "stable",
      confidence: context.trajectory?.confidence || 0.5,
      keySignals: context.activeSymptoms?.map((s) => `${s.name} (${s.status})`) || [],
      reasoning: agentResult.response?.slice(0, 500) || "Agent reasoning completed",
    }).catch(() => {});

    // ----------------------------------------------------------
    // STEP 4.5 — Record tool calls in AgentRun + create events
    // ----------------------------------------------------------
    if (agentResult.toolCalls && agentResult.toolCalls.length > 0) {
      console.log(`📋 Recording ${agentResult.toolCalls.length} tool calls...`);
      run.toolCalls = agentResult.toolCalls.map((tc) => ({
        name: tc.name,
        args: tc.args,
        result: tc.result,
        success: tc.result && !tc.result.error,
        timestamp: tc.timestamp,
      }));
      await run.save();

      // Create AgentEvent for each tool call (so Live Monitor can show them)
      for (const tc of agentResult.toolCalls) {
        await createToolCalledEvent(patient, run, tc).catch(() => {});
      }
    }

    } // end else (LLM path)

    // ----------------------------------------------------------
    // STEP 5 — PLAN: Check if agent created a care decision
    // ----------------------------------------------------------
    console.log("📋 STEP 5: Checking for care decision...");
    const planStartedAt = now();

    // Look for care decisions created during this agent run
    // (decision may already be set from anti-spam check above)
    if (!decision) {
      const recentDecision = await CareDecision.findOne({
        patientId,
        status: "proposed",
        createdAt: { $gte: run.startedAt },
      }).sort({ createdAt: -1 }).lean();

      decision = recentDecision || null;
    }

    const planCompletedAt = now();

    if (decision) {
      recordStep(run, "plan", "completed", planStartedAt, planCompletedAt, {
        decisionId: decision._id,
        decisionType: decision.decisionType,
        priority: decision.priority,
        followUpIntervalDays: decision.recommendedFollowUpIntervalDays,
        source: "agent_tool",
      });

      await createDecisionMadeEvent(patient, run, {
        decisionType: decision.decisionType,
        recommendedFollowUpIntervalDays: decision.recommendedFollowUpIntervalDays,
        priority: decision.priority,
        riskLevel: decision.riskLevel,
        reasoning: decision.reasoning,
        ashaMessage: decision.ashaMessage,
      }).catch(() => {});
    } else {
      recordStep(run, "plan", "completed", planStartedAt, planCompletedAt, {
        action: "maintain_followup",
        source: "agent_assessment",
      });
    }

    run.decisionId = decision?._id || null;
    await run.save();

    // ----------------------------------------------------------
    // STEP 6 — EXECUTE: Verify care plan was updated
    // ----------------------------------------------------------
    const executeStartedAt = now();
    const executeCompletedAt = now();

    if (decision) {
      // Check if care plan was actually modified
      const carePlan = await (await import("../models/CarePlan.js")).default.findOne({
        patientId,
        status: "active",
      }).sort({ version: -1 }).lean();

      if (carePlan && carePlan.version > 1) {
        console.log(`⚙️ STEP 6: Care plan updated (v${carePlan.version})`);
        recordStep(run, "execute", "completed", executeStartedAt, executeCompletedAt, {
          action: decision.decisionType,
          carePlanVersion: carePlan.version,
          intervalDays: carePlan.followUp?.intervalDays,
          source: "agent_tool",
        });
      } else {
        console.log(`⚙️ STEP 6: Decision recorded but care plan not modified by agent`);
        recordStep(run, "execute", "completed", executeStartedAt, executeCompletedAt, {
          action: decision.decisionType,
          source: "decision_only",
        });
      }

      await createCarePlanUpdatedEvent(patient, run, {
        recommendedFollowUpIntervalDays: decision.recommendedFollowUpIntervalDays,
        decisionType: decision.decisionType,
        priority: decision.priority,
        ashaMessage: decision.ashaMessage,
      }).catch(() => {});
    } else {
      recordStep(run, "execute", "completed", executeStartedAt, executeCompletedAt, {
        action: "no_action_needed",
      });
    }

    // ----------------------------------------------------------
    // STEP 7 — COMMUNICATE
    // ----------------------------------------------------------
    console.log("📢 STEP 7: Preparing communication...");
    const commStartedAt = now();
    const commCompletedAt = now();      recordStep(run, "communicate", "completed", commStartedAt, commCompletedAt, {
        hasDecision: !!decision,
        agentResponseLength: agentResult?.response?.length || 0,
      });

    // ─── DECIDE ───
    console.log("\n[CareFlow] ─── DECIDE ───");
    if (decision) {
      console.log(`[CareFlow] Decision: ${decision.decisionType}`);
      console.log(`[CareFlow] Risk level: ${decision.riskLevel}`);
      console.log(`[CareFlow] Previous follow-up: ${decision.previousFollowUpIntervalDays || 'N/A'} days`);
      console.log(`[CareFlow] New follow-up: ${decision.recommendedFollowUpIntervalDays} days`);
      console.log(`[CareFlow] Key signals: ${(decision.keySignals || []).join(', ')}`);
    } else {
      console.log("[CareFlow] Decision: maintain_followup (no change needed)");
    }

    // ─── REPLAN ───
    console.log("\n[CareFlow] ─── REPLAN ───");
    if (decision && decision.decisionType !== 'maintain_followup') {
      const carePlan = await (await import('../models/CarePlan.js')).default.findOne({ patientId, status: 'active' }).sort({ version: -1 }).lean();
      if (carePlan) {
        console.log(`[CareFlow] Follow-up: ${carePlan.followUp?.intervalDays || 'N/A'} days`);
        console.log(`[CareFlow] Priority: ${carePlan.priority}`);
        console.log(`[CareFlow] Care state: ${carePlan.careState}`);
        console.log(`[CareFlow] Plan version: ${carePlan.version}`);
      }
    } else {
      console.log("[CareFlow] Current plan is appropriate. No replanning needed.");
    }

    // Complete the run
    run.status = "completed";
    run.completedAt = now();
    run.durationMs = run.completedAt.getTime() - run.startedAt.getTime();
    run.executedAction = decision?.decisionType || "maintain_followup";
    run.decisionId = decision?._id || null;
    run.aiAnalysis = {
      recommendedAction: decision?.decisionType || "maintain_followup",
      riskLevel: decision?.riskLevel || context.trajectory?.riskScore > 50 ? "high" : context.trajectory?.riskScore > 25 ? "moderate" : "low",
      riskScore: context.trajectory?.riskScore || 0,
      trajectory: decision?.trajectory || context.trajectory?.status || "stable",
      reasoning: decision?.reasoning || "Current plan remains appropriate based on longitudinal analysis.",
      ashaMessage: decision?.ashaMessage || null,
      keySignals: decision?.keySignals || context.activeSymptoms?.map(s => `${s.name} (${s.status})`).slice(0, 5) || [],
      followUpIntervalDays: decision?.recommendedFollowUpIntervalDays || context.patient?.followUp?.intervalDays || 7,
      previousFollowUpIntervalDays: decision?.previousFollowUpIntervalDays || null,
      confidence: context.trajectory?.confidence || 0.5,
    };
    run.error = null;
    await run.save();

    await createAgentCompletedEvent(patient, run).catch(() => {});

    // ── MEMORY CONSOLIDATION ──
    // After a meaningful run, consolidate patient memory
    // so future runs have richer longitudinal context.
    if (decision && decision.decisionType !== "maintain_followup") {
      try {
        console.log("[CareFlow] ── CONSOLIDATING MEMORY");
        await consolidatePatientMemory(patientId);
        console.log("[CareFlow]   Memory consolidated successfully");
      } catch (memError) {
        console.warn("[CareFlow]   Memory consolidation failed:", memError.message);
      }
    }

    // ── NOTIFICATION ──
    // Build and log notification for ASHA worker
    if (decision) {
      try {
        const notification = buildNotificationFromDecision({ patient, decision });
        await sendNotification(notification);
        console.log("[CareFlow]   ASHA notification sent");
      } catch (notifError) {
        console.warn("[CareFlow]   Notification failed:", notifError.message);
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ CAREFLOW AGENT COMPLETED`);
    console.log(`   Patient: ${patient.name} (${patient.patientCode})`);
    console.log(`   Duration: ${run.durationMs}ms`);
    console.log(`   Action: ${run.executedAction}`);
    console.log(`   Decision: ${decision ? decision.decisionType : "none"}`);
    console.log(`   Tool calls: ${agentResult.toolCalls?.length || 0}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return {
      run,
      patientId,
      context,
      agentResult,
      decision,
      notification: null,
    };
  } catch (error) {
    console.error("CareFlow agent error:", error);

    run.status = "failed";
    run.completedAt = now();
    run.durationMs = run.completedAt.getTime() - run.startedAt.getTime();
    run.error = error.message;
    await run.save();

    await createAgentFailedEvent(patient, run, error).catch(() => {});

    throw error;
  }
};

// ============================================================
// EXPORTS
// ============================================================

export const runPatientCareAgent = async (patientId, trigger = "manual") =>
  runCareFlowAgent({ patientId, trigger });

export const runCareFlowAgentSafely = async ({
  patientId,
  trigger = "scheduled_monitor",
}) => {
  try {
    const result = await runCareFlowAgent({ patientId, trigger });
    return { success: true, result };
  } catch (error) {
    return { success: false, patientId, error: error.message };
  }
};

export const getLatestAgentRun = async (patientId) =>
  AgentRun.findOne({ patientId })
    .sort({ createdAt: -1 })
    .lean();

export const getAgentRunHistory = async (patientId, limit = 20) =>
  AgentRun.find({ patientId })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
