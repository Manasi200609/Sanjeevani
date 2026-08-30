import env from "../config/env.js";

// ============================================================
// AI PROVIDER ABSTRACTION
// ============================================================
//
// CareFlow calls this module rather than directly calling
// Gemini or Groq. This allows the provider to be swapped
// without changing any agent code.
//
// Gemini is the PRIMARY provider.
// Groq is available as a fallback.
// ============================================================

export const analyzeTrajectoryWithAI =
  async (context) => {
    const provider =
      (
        env.AI_PROVIDER ||
        "gemini"
      ).toLowerCase();

    if (provider === "gemini") {
      const { analyzePatientTrajectory } =
        await import("./geminiProvider.js");
      return analyzePatientTrajectory(context);
    }

    if (provider === "groq") {
      const { analyzePatientTrajectory: analyzeWithGroq } =
        await import("./groqProvider.js");
      return analyzeWithGroq(context);
    }

    throw new Error(
      `Unsupported AI provider: ${provider}. Set AI_PROVIDER=gemini in .env.`
    );
  };

// ============================================================
// GENERATE PATIENT-FRIENDLY MESSAGE
// ============================================================

export const generatePatientMessage = async (decision, patientName) => {
  const provider = (env.AI_PROVIDER || "gemini").toLowerCase();

  if (provider === "gemini") {
    const { generatePatientMessage: genMsg } =
      await import("./geminiProvider.js");
    return genMsg(decision, patientName);
  }

  // Fallback: simple message
  return `We've updated your care plan. Your next follow-up is scheduled.`;
};

// ============================================================
// CONSOLIDATE MEMORY WITH AI
// ============================================================

export const consolidateMemoryWithAI = async (patientId, context) => {
  const provider = (env.AI_PROVIDER || "gemini").toLowerCase();

  if (provider === "gemini") {
    const { consolidateMemoryWithAI: consolidate } =
      await import("./geminiProvider.js");
    return consolidate(patientId, context);
  }

  // Fallback: null (system will use deterministic consolidation)
  return null;
};
