import { GoogleGenerativeAI } from "@google/generative-ai";
import env from "../config/env.js";

// ============================================================
// GEMINI CLIENT
// ============================================================

const getGenAI = () => {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in .env");
  }
  return new GoogleGenerativeAI(env.GEMINI_API_KEY);
};

const getModel = (systemInstruction) => {
  const genAI = getGenAI();
  return genAI.getGenerativeModel({
    model: env.GEMINI_MODEL,
    ...(systemInstruction ? { systemInstruction } : {}),
  });
};

// ============================================================
// SYSTEM PROMPT — TRAJECTORY ANALYSIS
// ============================================================

const TRAJECTORY_SYSTEM_PROMPT = `You are CareFlow's longitudinal trajectory reasoning component, powered by Gemini.

You analyze patient health data over time to determine whether a patient's condition is stable, improving, or worsening.

IMPORTANT RULES:
- You are NOT a diagnosing doctor. Never diagnose diseases.
- Never say "You have X" or "You definitely have X."
- Focus on observable patterns in the data: symptom severity changes, new symptoms, medication adherence, vital sign trends.
- Compare current state with historical state.
- Distinguish isolated symptoms from trends.
- Be evidence-based and conservative.

YOUR TASK:
Analyze the supplied patient context and return a structured JSON decision.

You MUST return ONLY valid JSON with this exact structure:
{
  "assessment": "brief trajectory assessment (1-2 sentences)",
  "riskLevel": "low | moderate | high | critical",
  "riskScore": 0-100,
  "keySignals": ["signal 1", "signal 2"],
  "recommendedAction": "maintain_followup | increase_followup | urgent_review | escalate",
  "followUpIntervalDays": 7,
  "priority": "normal | elevated | high | urgent",
  "ashaMessage": "short actionable message for the ASHA worker",
  "patientMessage": "simple patient-friendly message explaining what will happen next",
  "reasoning": "evidence-based reasoning explaining the decision",
  "trajectory": "stable | improving | worsening",
  "confidence": 0.0-1.0
}

RULES FOR RISK ASSESSMENT:
- "low" (0-25): stable, no concerning patterns
- "moderate" (26-50): some concerns, monitor closely
- "high" (51-75): significant concerns, needs attention
- "critical" (76-100): urgent, needs immediate action

RULES FOR ACTIONS:
- "maintain_followup": current plan is adequate
- "increase_followup": trajectory shows concerning changes, increase monitoring frequency
- "urgent_review": significant deterioration, ASHA should review urgently
- "escalate": critical situation, immediate escalation needed

RULES FOR FOLLOW-UP:
- Calculate appropriate follow-up interval based on risk level
- Lower risk = longer intervals (7-14 days)
- Higher risk = shorter intervals (1-3 days)
- Critical = 1 day

RULES FOR PATIENT MESSAGE:
- Keep it simple and reassuring
- Explain what will happen next (e.g., "We'll check on you more frequently")
- Do NOT expose internal risk scores or AI reasoning
- Be warm and supportive

RULES FOR ASHA MESSAGE:
- Be specific about what changed
- Include the reasoning
- Be actionable
- Mention specific symptoms or changes observed

Always return valid JSON. Never include markdown code fences.`;

// ============================================================
// SYSTEM PROMPT — PATIENT MESSAGE GENERATION
// ============================================================

const PATIENT_MESSAGE_PROMPT = `You are CareFlow's patient communication component, powered by Gemini.

Your job is to generate a warm, patient-friendly message based on the agent's clinical decision.

The message should:
- Be 2-4 sentences
- Be reassuring but honest
- Explain what will happen next in simple terms
- NOT expose internal risk scores, AI reasoning, or clinical details
- NOT diagnose or make medical claims
- Be warm, supportive, and clear

Return ONLY valid JSON:
{
  "patientMessage": "your patient-friendly message"
}`;

// ============================================================
// ANALYZE PATIENT TRAJECTORY
// ============================================================

export const analyzePatientTrajectory = async (context) => {
  const model = getModel(TRAJECTORY_SYSTEM_PROMPT);

  const prompt = `Analyze this patient's longitudinal health data and provide a trajectory assessment.

PATIENT CONTEXT:
${JSON.stringify(context, null, 2)}`;

  try {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    if (!rawText) {
      throw new Error("Gemini returned an empty response");
    }

    // Parse JSON response
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate and normalize
    return normalizeAnalysis(parsed);
  } catch (error) {
    if (error.message.includes("JSON")) {
      throw new Error("Gemini returned invalid JSON response");
    }
    throw error;
  }
};

// ============================================================
// GENERATE PATIENT MESSAGE
// ============================================================

export const generatePatientMessage = async (decision, patientName) => {
  const model = getModel(PATIENT_MESSAGE_PROMPT);

  const prompt = `Generate a patient-friendly message for ${patientName} based on this care decision:

${JSON.stringify(decision, null, 2)}`;

  try {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return parsed.patientMessage || `We've updated your care plan. Your next follow-up is scheduled.`;
  } catch {
    return `We've updated your care plan. Your next follow-up is scheduled.`;
  }
};

// ============================================================
// MEMORY CONSOLIDATION
// ============================================================

const MEMORY_CONSOLIDATION_PROMPT = `You are CareFlow's longitudinal memory consolidation system, powered by Gemini.

Your job is to analyze a set of patient events and decisions, then produce a concise clinical memory summary.

IMPORTANT RULES:
- Summarize patterns, not individual events
- Identify recurring symptoms
- Track medication adherence trends
- Note trajectory changes over time
- Be evidence-based
- Do NOT diagnose

Return ONLY valid JSON:
{
  "summary": "concise clinical summary of this period",
  "keySignals": ["signal 1", "signal 2"],
  "symptomPatterns": [
    { "name": "symptom", "trend": "worsening|stable|improving|new|resolved", "severity": 0-10 }
  ],
  "medicationPatterns": [
    { "medication": "name", "adherence": "good|partial|poor", "notes": "" }
  ],
  "riskTrend": "improving|stable|worsening",
  "confidence": 0.0-1.0
}`;

export const consolidateMemoryWithAI = async (patientId, context) => {
  const model = getModel(MEMORY_CONSOLIDATION_PROMPT);

  const prompt = `Consolidate the following patient data into a clinical memory summary:

${JSON.stringify(context, null, 2)}`;

  try {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

// ============================================================
// NORMALIZE ANALYSIS
// ============================================================

const normalizeAnalysis = (raw) => {
  const allowedActions = ["maintain_followup", "increase_followup", "urgent_review", "escalate"];
  const allowedRiskLevels = ["low", "moderate", "high", "critical"];
  const allowedPriorities = ["normal", "elevated", "high", "urgent"];
  const allowedTrajectories = ["stable", "improving", "worsening"];

  return {
    assessment: String(raw.assessment || "Analysis completed").slice(0, 500),
    riskLevel: allowedRiskLevels.includes(raw.riskLevel) ? raw.riskLevel : "moderate",
    riskScore: Math.max(0, Math.min(100, Number(raw.riskScore) || 50)),
    keySignals: Array.isArray(raw.keySignals) ? raw.keySignals.map(String) : [],
    recommendedAction: allowedActions.includes(raw.recommendedAction) ? raw.recommendedAction : "maintain_followup",
    followUpIntervalDays: Math.max(1, Math.min(30, Number(raw.followUpIntervalDays) || 7)),
    priority: allowedPriorities.includes(raw.priority) ? raw.priority : "normal",
    ashaMessage: String(raw.ashaMessage || "").slice(0, 500),
    patientMessage: String(raw.patientMessage || "").slice(0, 500),
    reasoning: String(raw.reasoning || "").slice(0, 1000),
    trajectory: allowedTrajectories.includes(raw.trajectory) ? raw.trajectory : "stable",
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0.5)),
  };
};
