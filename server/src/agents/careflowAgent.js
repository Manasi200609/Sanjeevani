// ============================================================
// CAREFLOW AGENT — Real Autonomous Tool-Calling Agent
// ============================================================
//
// Three execution paths, clearly separated:
//
// 1. ADK PATH (primary when GEMINI_API_KEY is set):
//    Gemini 3.7 Flash → Google ADK LlmAgent + FunctionTool
//    → InMemoryRunner.runEphemeral() → autonomous tool calling
//
// 2. GEMINI PATH (fallback if ADK import fails):
//    Gemini 3.7 Flash → @google/generative-ai function calling
//    → manual tool loop → results back to Gemini
//
// 3. GROQ PATH (development fallback):
//    Groq → function calling → manual tool loop
//
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import { buildPatientContext } from "../memory/contextBuilder.js";
import Patient from "../models/Patient.js";
import PatientEvent from "../models/PatientEvent.js";
import CareDecision from "../models/CareDecision.js";
import CarePlan from "../models/CarePlan.js";
import Memory from "../models/Memory.js";
import { analyzePatientTrajectory } from "../services/trajectoryService.js";
import env from "../config/env.js";

// ============================================================
// SYSTEM INSTRUCTION
// ============================================================

const CAREFLOW_INSTRUCTION = `You are CareFlow — an autonomous longitudinal care coordination agent.

Your role is to monitor patient health over time, reason about trajectory changes using longitudinal data, and make care decisions that help ASHA workers provide timely care.

You are NOT a diagnosing doctor. You NEVER diagnose diseases or make medical claims. Your role is care coordination and monitoring.

YOUR APPROACH:
1. Always start by calling get_patient_context to understand the patient's current state.
2. Call get_patient_timeline to examine historical events and detect trends over time.
3. Call get_patient_memory to understand long-term patterns.
4. Call analyze_trajectory to get a deterministic risk signal.
5. Call get_active_care_plan to understand current care cadence.
6. Call get_previous_decisions to understand care history.
7. REASON over the data — this is the most important step.
8. If a meaningful trajectory change is detected, call create_care_decision and update_care_plan.
9. If no change is needed, explicitly state that the current plan is appropriate.
10. Return a final summary of your findings and actions.

LONGITUDINAL REASONING (Critical):
You must compare the patient's CURRENT state against their PREVIOUS state across multiple dimensions:

a) SYMPTOM TRAJECTORY:
   - Is any symptom getting worse over time?
   - Have new symptoms appeared?
   - Is severity increasing across visits?
   Example: fatigue severity 2 → 3 → 4 → 6 across visits = clear worsening trend

b) RISK TRAJECTORY:
   - Compare riskScore across events (use get_patient_timeline)
   - Risk 12 → 15 → 22 → 38 = significant upward trend
   - Risk 38 → 38 = stable at concerning level
   - Risk 38 → 14 = improving

c) MEDICATION ADHERENCE:
   - Is adherence declining? (good → partial → poor)
   - This is an important self-management signal

d) NEW SYMPTOMS:
   - A new symptom (status: 'new') is more significant than a stable one
   - If a symptom appeared since the last visit, that's a trajectory change

e) COMBINED SIGNALS:
   - Single worsening symptom: moderate concern
   - Multiple worsening symptoms + new symptoms + poor adherence: high concern
   - The COMBINATION matters more than any single signal

RISK ASSESSMENT:
- low (0-25): stable, no concerning patterns
- moderate (26-50): some concerns, monitor closely
- high (51-75): significant concerns, needs attention
- critical (76-100): urgent, needs immediate action

ACTION GUIDELINES:
- maintain_followup: current plan is adequate, trajectory is stable
- increase_followup: trajectory shows concerning changes, need closer monitoring
- urgent_review: significant deterioration, ASHA should visit soon
- escalate: critical situation, immediate clinical attention needed

FOLLOW-UP INTERVALS:
- Low risk, stable: 7-14 days
- Moderate risk, worsening: 3-7 days
- High risk: 1-3 days
- Critical: 1 day

ANTI-SPAM RULE:
If the patient's state has NOT meaningfully changed since the last decision, do NOT create a new decision. State that the current plan is appropriate.

CRITICAL RULES:
- Never invent symptoms, vitals, or clinical facts.
- Never claim certainty about diagnoses.
- If trajectory is worsening, increase follow-up frequency.
- If trajectory is stable and current plan is appropriate, maintain it.
- Always support your decision with specific evidence from the data.
- Be concise and actionable.`;

// ============================================================
// TOOL DEFINITIONS (JSON Schema — used by all paths)
// ============================================================

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "get_patient_context",
      description: "Retrieve the full longitudinal patient context including profile, recent events, trajectory, symptoms, medication patterns, active care decisions, and long-term memory. Always call this FIRST.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "MongoDB ObjectId of the patient" },
        },
        required: ["patientId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_patient_timeline",
      description: "Retrieve chronological patient events (visits, symptoms, vitals, medication updates). Use this to examine longitudinal history and detect trends over time.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "MongoDB ObjectId of the patient" },
          limit: { type: "number", description: "Maximum events to return (default 10)" },
        },
        required: ["patientId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_patient_memory",
      description: "Retrieve the patient's long-term consolidated memory — summaries of previous periods, clinical patterns, risk history. Critical for longitudinal trends.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "MongoDB ObjectId of the patient" },
          limit: { type: "number", description: "Maximum memories to return (default 5)" },
        },
        required: ["patientId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_trajectory",
      description: "Perform a deterministic trajectory analysis comparing recent events. Returns risk score, change direction, confidence, and key signals.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "MongoDB ObjectId of the patient" },
        },
        required: ["patientId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_active_care_plan",
      description: "Retrieve the current active care plan for a patient — follow-up interval, priority, instructions, and reasoning.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "MongoDB ObjectId of the patient" },
        },
        required: ["patientId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_previous_decisions",
      description: "Retrieve recent care decisions for the patient. Shows what actions were taken previously.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "MongoDB ObjectId of the patient" },
          limit: { type: "number", description: "Maximum decisions to return (default 5)" },
        },
        required: ["patientId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_care_plan",
      description: "UPDATE the patient's care plan in the database. Changes follow-up interval, priority, and care state. ONLY call when you have determined the current plan is no longer appropriate.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "MongoDB ObjectId of the patient" },
          intervalDays: { type: "number", description: "New follow-up interval in days (1-30)" },
          priority: { type: "string", enum: ["normal", "elevated", "high", "urgent"], description: "New care priority" },
          careState: { type: "string", enum: ["stable", "watch", "urgent"], description: "New care state" },
          instructions: { type: "array", items: { type: "string" }, description: "Care instructions for ASHA worker" },
          ashaMessage: { type: "string", description: "Brief message for the ASHA worker" },
        },
        required: ["patientId", "intervalDays", "priority", "careState"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_care_decision",
      description: "Create a formal care decision record in the database. Persists the agent's recommended decision with follow-up recommendation, priority, and reasoning.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "MongoDB ObjectId of the patient" },
          decisionType: { type: "string", enum: ["maintain_followup", "increase_followup", "urgent_review", "escalate"], description: "Type of care decision" },
          riskLevel: { type: "string", enum: ["low", "moderate", "high", "critical"], description: "Assessed risk level" },
          priority: { type: "string", enum: ["normal", "elevated", "high", "urgent"], description: "Care priority" },
          followUpIntervalDays: { type: "number", description: "Recommended follow-up interval in days" },
          reasoning: { type: "string", description: "Evidence-based reasoning for the decision" },
          ashaMessage: { type: "string", description: "Actionable message for the ASHA worker" },
          keySignals: { type: "array", items: { type: "string" }, description: "Key signals that drove this decision" },
        },
        required: ["patientId", "decisionType", "riskLevel", "priority", "followUpIntervalDays", "reasoning", "ashaMessage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_patient_event",
      description: "Record a new patient event in the longitudinal timeline.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "MongoDB ObjectId of the patient" },
          eventType: { type: "string", enum: ["visit", "symptom_update", "vital_update", "medication_update", "agent_decision", "other"], description: "Type of event" },
          notes: { type: "string", description: "Event notes" },
          severity: { type: "string", enum: ["low", "moderate", "high", "critical"], description: "Event severity" },
        },
        required: ["patientId", "eventType", "notes"],
      },
    },
  },
];

// ============================================================
// TOOL EXECUTION (shared by all paths)
// ============================================================

const executeTool = async (name, args) => {
  const { patientId } = args;

  switch (name) {
    case "get_patient_context": {
      const context = await buildPatientContext(patientId);
      return {
        patient: context.patient,
        trajectory: context.trajectory,
        activeSymptoms: context.activeSymptoms,
        medicationPatterns: context.medicationPatterns,
        recentDecisions: context.recentDecisions,
        longTermMemory: context.longTermMemory,
        recentEventCount: context.recentTimeline?.length || 0,
      };
    }

    case "get_patient_timeline": {
      const limit = args.limit || 10;
      const events = await PatientEvent.find({ patientId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      return events.map((e) => ({
        timestamp: e.timestamp,
        eventType: e.eventType,
        source: e.source,
        symptoms: e.symptoms,
        vitals: e.vitals,
        medications: e.medications,
        severity: e.severity,
        riskScore: e.riskScore,
        trajectorySignal: e.trajectorySignal,
        notes: e.notes,
      }));
    }

    case "get_patient_memory": {
      const memLimit = args.limit || 5;
      const memories = await Memory.find({ patientId, isActive: true })
        .sort({ periodEnd: -1, version: -1 })
        .limit(memLimit)
        .lean();
      return memories.map((m) => ({
        type: m.memoryType,
        period: `${m.periodStart} → ${m.periodEnd}`,
        summary: m.summary,
        keySignals: m.keySignals,
        riskHistory: m.riskHistory,
        careHistory: m.careHistory,
        confidence: m.confidence,
      }));
    }

    case "analyze_trajectory": {
      return analyzePatientTrajectory(patientId);
    }

    case "get_active_care_plan": {
      const plan = await CarePlan.findOne({ patientId, status: "active" })
        .sort({ version: -1 })
        .lean();
      return plan || { message: "No active care plan found" };
    }

    case "get_previous_decisions": {
      const decLimit = args.limit || 5;
      const decisions = await CareDecision.find({ patientId })
        .sort({ createdAt: -1 })
        .limit(decLimit)
        .lean();
      return decisions.map((d) => ({
        decisionType: d.decisionType,
        riskLevel: d.riskLevel,
        priority: d.priority,
        previousFollowUp: d.previousFollowUpIntervalDays,
        newFollowUp: d.recommendedFollowUpIntervalDays,
        reasoning: d.reasoning,
        status: d.status,
        createdAt: d.createdAt,
      }));
    }

    case "update_care_plan": {
      const days = Math.max(1, Math.min(30, args.intervalDays));
      let plan = await CarePlan.findOne({ patientId, status: "active" });
      const previousInterval = plan?.followUp?.intervalDays || 7;

      // Also get the latest trajectory for the plan record
      let trajectoryContext = null;
      try {
        const { analyzePatientTrajectory } = await import("../services/trajectoryService.js");
        trajectoryContext = await analyzePatientTrajectory(patientId);
      } catch {}

      if (plan) {
        plan.followUp.intervalDays = days;
        plan.followUp.nextFollowUpAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        plan.priority = args.priority;
        plan.careState = args.careState;
        plan.instructions = args.instructions || [];
        plan.ashaMessage = args.ashaMessage || "";
        plan.lastReviewedAt = new Date();
        plan.version = (plan.version || 1) + 1;
        // Store risk context on the plan for auditability
        if (trajectoryContext) {
          plan.riskScore = trajectoryContext.riskScore || 0;
          plan.trajectoryStatus = trajectoryContext.trajectory || 'stable';
          plan.reasoning = args.ashaMessage || `CareFlow replanned: follow-up changed from ${previousInterval}d to ${days}d`;
        }
        await plan.save();
      } else {
        plan = await CarePlan.create({
          patientId,
          status: "active",
          followUp: {
            required: true,
            intervalDays: days,
            nextFollowUpAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
          },
          priority: args.priority,
          careState: args.careState,
          instructions: args.instructions || [],
          ashaMessage: args.ashaMessage || "",
          lastReviewedAt: new Date(),
        });
      }

      // Update patient state too
      const patient = await Patient.findById(patientId);
      if (patient) {
        patient.followUp = {
          required: true,
          intervalDays: days,
          nextFollowUpAt: plan.followUp.nextFollowUpAt,
        };
        patient.priority = args.priority;
        patient.currentState = args.careState;
        await patient.save();
      }

      return {
        success: true,
        previousIntervalDays: previousInterval,
        newIntervalDays: days,
        priority: args.priority,
        careState: args.careState,
      };
    }

    case "create_care_decision": {
      const decision = await CareDecision.create({
        patientId,
        decisionType: args.decisionType,
        riskLevel: args.riskLevel,
        priority: args.priority,
        recommendedFollowUpIntervalDays: args.followUpIntervalDays,
        reasoning: args.reasoning,
        ashaMessage: args.ashaMessage,
        assessment: args.reasoning,
        keySignals: args.keySignals || [],
        status: "proposed",
      });
      return {
        decisionId: String(decision._id),
        decisionType: decision.decisionType,
        riskLevel: decision.riskLevel,
        priority: decision.priority,
        followUpInterval: decision.recommendedFollowUpIntervalDays,
      };
    }

    case "record_patient_event": {
      const event = await PatientEvent.create({
        patientId,
        eventType: args.eventType,
        source: "agent",
        timestamp: new Date(),
        notes: args.notes,
        severity: args.severity || "low",
      });
      return {
        eventId: String(event._id),
        eventType: event.eventType,
        timestamp: event.timestamp,
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
};

// ============================================================
// MAIN ENTRY POINT
// ============================================================

const MAX_TOOL_ROUNDS = 15;

export const runCareflowAgent = async ({ patientId, trigger = "manual" }) => {
  const startTime = Date.now();
  console.log(`\n🤖 CAREFLOW AGENT STARTED (patient: ${patientId}, trigger: ${trigger})`);

  // Verify patient exists
  const patient = await Patient.findById(patientId);
  if (!patient) throw new Error("Patient not found");

  // Build initial user message
  const userMessage = `A CareFlow agent run has been triggered for patient ${patientId} (name: ${patient.name}, code: ${patient.patientCode}).

Trigger: ${trigger}

Please perform a complete longitudinal care assessment:
1. Retrieve the patient context and history
2. Examine recent events and long-term memory
3. Analyze the trajectory
4. If a meaningful change is detected, create a care decision and update the care plan
5. If no change is needed, state that the current plan is appropriate
6. Provide a summary of your findings and actions

Begin by calling get_patient_context with patientId "${patientId}".`;

  // --------------------------------------------------------
  // PATH SELECTION
  // --------------------------------------------------------
  // Priority: ADK (Gemini) → Gemini direct → Groq fallback
  //
  // The ADK path requires:
  //   1. GEMINI_API_KEY in process.env
  //   2. @google/adk package installed
  //
  // If AI_PROVIDER=gemini and key exists, try ADK first.
  // If ADK import fails, fall back to direct Gemini function calling.
  // If no Gemini key, fall back to Groq.
  // --------------------------------------------------------

  const provider = (env.AI_PROVIDER || "gemini").toLowerCase();

  if (provider === "gemini" && env.GEMINI_API_KEY) {
    // Try ADK first
    try {
      const adk = await import("@google/adk");
      console.log("📦 Using Google ADK execution path");
      return await runWithADK({ patientId, patient, userMessage, trigger, startTime, adk });
    } catch (adkError) {
      console.log(`⚠️ ADK unavailable (${adkError.message}), falling back to direct Gemini`);
      return runWithGemini({ patientId, patient, userMessage, trigger, startTime });
    }
  }

  if (provider === "gemini" && !env.GEMINI_API_KEY) {
    console.warn("⚠️ AI_PROVIDER=gemini but GEMINI_API_KEY is missing. Cannot use Gemini or ADK.");
    console.warn("⚠️ Falling back to Groq. Add GEMINI_API_KEY to .env for Gemini/ADK execution.");
  }

  // Groq fallback
  const { default: Groq } = await import("groq-sdk");
  return runWithGroq({ patientId, patient, userMessage, trigger, startTime, Groq });
};

// ============================================================
// PATH 1: GOOGLE ADK EXECUTION (Primary)
// ============================================================
//
// This is the real Google Agent Development Kit path.
// The ADK's InMemoryRunner.runEphemeral() returns an async
// generator of session events. The LlmAgent internally decides
// which FunctionTools to call, calls them via FunctionTool.execute(),
// feeds results back to Gemini, and continues reasoning.
//
// We do NOT manually orchestrate tool calls — the ADK runner does.
// ============================================================

const runWithADK = async ({ patientId, patient, userMessage, trigger, startTime, adk }) => {
  const { LlmAgent, FunctionTool, InMemoryRunner } = adk;

  // Ensure GEMINI_API_KEY is in process.env (ADK reads it from there)
  if (!process.env.GEMINI_API_KEY && env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }

  // Build ADK FunctionTools — use JSON Schema directly (ADK accepts it)
  // IMPORTANT: ADK's runEphemeral() does NOT expose tool calls in the event stream.
  // Tool calls are executed internally by ADK. We wrap each tool's execute callback
  // to capture the actual tool invocations for tracing and AgentEvent creation.
  const toolCallsLog = [];

  const tools = TOOL_DEFINITIONS.map((def) => {
    const name = def.function.name;
    return new FunctionTool({
      name,
      description: def.function.description,
      parameters: def.function.parameters,
      execute: async (args) => {
        const startMs = Date.now();
        console.log(`  🔧 ADK tool call: ${name}`);
        let result;
        let success = true;
        try {
          result = await executeTool(name, args);
          console.log(`  ✅ ADK tool result: ${name}`);
        } catch (error) {
          result = { error: error.message };
          success = false;
          console.log(`  ❌ ADK tool error: ${name}: ${error.message}`);
        }
        toolCallsLog.push({
          name,
          args,
          result,
          success,
          timestamp: new Date(),
          durationMs: Date.now() - startMs,
        });
        return result;
      },
    });
  });

  const agent = new LlmAgent({
    name: "careflow_agent",
    model: env.GEMINI_MODEL || "gemini-3-flash-preview",
    description: "CareFlow autonomous longitudinal care agent",
    instruction: CAREFLOW_INSTRUCTION,
    tools,
  });

  const runner = new InMemoryRunner({ name: "careflow", agent });

  let finalText = "";

  // runEphemeral() returns an async iterable of session events
  // Events contain: invocationId, author, actions, errorCode, errorMessage
  // The actual tool calls are captured via wrapped execute callbacks above.
  const events = runner.runEphemeral({
    userId: "careflow-worker",
    newMessage: { role: "user", parts: [{ text: userMessage }] },
  });

  for await (const event of events) {
    // ADK session events — log errors, capture final state
    if (event.errorCode) {
      console.error(`  ⚠️ ADK event error: ${event.errorCode} - ${event.errorMessage?.slice(0, 200)}`);
    }
    // The last event's actions may contain state deltas
    if (event.actions?.stateDelta && Object.keys(event.actions.stateDelta).length > 0) {
      finalText = JSON.stringify(event.actions.stateDelta);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`  📝 ADK agent completed: ${toolCallsLog.length} tool calls, ${durationMs}ms`);

  return {
    agent: "careflow",
    provider: "gemini_adk",
    framework: "google-adk",
    model: env.GEMINI_MODEL || "gemini-3-flash-preview",
    patientId,
    trigger,
    response: finalText || `CareFlow agent completed ${toolCallsLog.length} tool calls successfully`,
    toolCalls: toolCallsLog,
    rounds: toolCallsLog.length > 0 ? 1 : 0,
    durationMs,
  };
};

// ============================================================
// PATH 2: DIRECT GEMINI FUNCTION CALLING (Fallback if ADK fails)
// ============================================================
//
// Uses @google/generative-ai SDK directly.
// The tool loop is manual: call Gemini → get function calls →
// execute tools → send results back → repeat.
// ============================================================

const runWithGemini = async ({ patientId, patient, userMessage, trigger, startTime }) => {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const modelName = env.GEMINI_MODEL || "gemini-3-flash-preview";

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: CAREFLOW_INSTRUCTION,
    tools: [{
      functionDeclarations: TOOL_DEFINITIONS.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    }],
  });

  const chat = model.startChat();
  const toolCallsLog = [];
  let result = await chat.sendMessage(userMessage);
  let round = 0;

  while (round < MAX_TOOL_ROUNDS) {
    round++;
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      const finalText = response.text();
      const durationMs = Date.now() - startTime;
      return {
        agent: "careflow",
        provider: "gemini",
        framework: "gemini-sdk",
        model: modelName,
        patientId,
        trigger,
        response: finalText,
        toolCalls: toolCallsLog,
        rounds: round,
        durationMs,
      };
    }

    // Execute each tool ONCE, capture result for both logging and response
    const functionResponses = [];
    for (const fc of functionCalls) {
      console.log(`  🔧 Tool call: ${fc.name}`, JSON.stringify(fc.args).slice(0, 200));
      let toolResult;
      try {
        toolResult = await executeTool(fc.name, fc.args);
        console.log(`  ✅ Tool result:`, JSON.stringify(toolResult).slice(0, 200));
      } catch (error) {
        toolResult = { error: error.message };
        console.log(`  ❌ Tool error:`, error.message);
      }

      toolCallsLog.push({ name: fc.name, args: fc.args, result: toolResult, timestamp: new Date() });

      functionResponses.push({
        functionResponse: {
          name: fc.name,
          response: toolResult,
        },
      });
    }

    result = await chat.sendMessage(functionResponses);
  }

  const durationMs = Date.now() - startTime;
  return {
    agent: "careflow",
    provider: "gemini",
    framework: "gemini-sdk",
    model: modelName,
    patientId,
    trigger,
    response: "Agent exceeded maximum tool rounds",
    toolCalls: toolCallsLog,
    rounds: round,
    durationMs,
  };
};

// ============================================================
// PATH 3: GROQ EXECUTION (Development fallback)
// ============================================================

const runWithGroq = async ({ patientId, patient, userMessage, trigger, startTime, Groq }) => {
  const groq = new Groq({ apiKey: env.GROQ_API_KEY });
  const model = env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const messages = [
    { role: "system", content: CAREFLOW_INSTRUCTION },
    { role: "user", content: userMessage },
  ];

  const toolCallsLog = [];
  let finalText = "";
  let round = 0;

  while (round < MAX_TOOL_ROUNDS) {
    round++;
    console.log(`🔄 Agent round ${round}...`);

    let response;
    try {
      response = await groq.chat.completions.create({
        model,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens: 4096,
      });
    } catch (llmError) {
      // If we already have tool calls, return partial result instead of crashing
      if (toolCallsLog.length > 0) {
        console.log(`⚠️ LLM error after ${toolCallsLog.length} tool calls: ${llmError.message.slice(0, 100)}`);
        console.log(`  Returning partial result with ${toolCallsLog.length} completed tool calls`);
        const durationMs = Date.now() - startTime;
        return {
          agent: "careflow",
          provider: "groq",
          framework: "groq-function-calling",
          model,
          patientId,
          trigger,
          response: `Agent completed ${toolCallsLog.length} tool calls before LLM error: ${llmError.message.slice(0, 100)}`,
          toolCalls: toolCallsLog,
          rounds: round - 1,
          durationMs,
          partial: true,
          error: llmError.message,
        };
      }
      throw llmError;
    }

    const choice = response.choices[0];
    if (!choice) throw new Error("No response from LLM");

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs;
        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          toolArgs = {};
        }

        console.log(`  🔧 Tool call: ${toolName}`, JSON.stringify(toolArgs).slice(0, 200));

        let toolResult;
        try {
          toolResult = await executeTool(toolName, toolArgs);
          console.log(`  ✅ Tool result:`, JSON.stringify(toolResult).slice(0, 200));
        } catch (error) {
          toolResult = { error: error.message };
          console.log(`  ❌ Tool error:`, error.message);
        }

        toolCallsLog.push({ name: toolName, args: toolArgs, result: toolResult, timestamp: new Date() });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    } else {
      finalText = choice.message.content || "";
      console.log(`\n📝 Final response (${finalText.length} chars)`);
      break;
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`\n✅ Agent completed in ${durationMs}ms (${round} rounds, ${toolCallsLog.length} tool calls)`);

  return {
    agent: "careflow",
    provider: "groq",
    framework: "groq-function-calling",
    model,
    patientId,
    trigger,
    response: finalText,
    toolCalls: toolCallsLog,
    rounds: round,
    durationMs,
  };
};

// ============================================================
// EXPORTS
// ============================================================

export const runCareflowAgentSafely = async ({ patientId, trigger = "manual" }) => {
  try {
    const result = await runCareflowAgent({ patientId, trigger });
    return { success: true, result };
  } catch (error) {
    console.error("CareFlow agent error:", error.message);
    return { success: false, patientId, error: error.message };
  }
};
