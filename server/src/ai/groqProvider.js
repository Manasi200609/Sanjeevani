import Groq from "groq-sdk";
import env from "../config/env.js";

const getClient = () => {
  if (!env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not configured in .env"
    );
  }

  return new Groq({
    apiKey: env.GROQ_API_KEY,
  });
};

export const analyzePatientTrajectory =
  async (context) => {
    const groq = getClient();

    const prompt = `
You are the longitudinal care reasoning component of CareFlow,
an AI-assisted care coordination system for ASHA workers.

You are NOT a diagnosing doctor.
Do not diagnose diseases.
Do not invent facts.
Use only the supplied patient context.

Your task is to assess whether the patient's follow-up
frequency should change based on longitudinal evidence.

Return ONLY valid JSON with this exact structure:

{
  "assessment": "short trajectory assessment",
  "riskLevel": "low | moderate | high | critical",
  "keySignals": ["signal 1", "signal 2"],
  "recommendedAction": "maintain_followup | increase_followup | urgent_review | escalate",
  "followUpIntervalDays": 7,
  "priority": "normal | elevated | high | urgent",
  "ashaMessage": "short actionable message for the ASHA worker",
  "reasoning": "brief evidence-based reasoning"
}

PATIENT CONTEXT:
${JSON.stringify(context, null, 2)}
`;

    const completion =
      await groq.chat.completions.create({
        model:
          env.GROQ_MODEL ||
          "openai/gpt-oss-20b",
        temperature: 0.2,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "Return only valid JSON. Be cautious and evidence-based.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    const content =
      completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(
        "Groq returned an empty response"
      );
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new Error(
        "Groq returned invalid JSON"
      );
    }
  };
