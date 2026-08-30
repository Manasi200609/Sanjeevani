import env from "../config/env.js";
import Patient from "../models/Patient.js";
import PatientEvent from "../models/PatientEvent.js";

import {
  createSignalDetectedEvent,
} from "./agentEventService.js";

import {
  publishAgentTrigger,
  subscribeToTopic,
  TOPICS,
} from "./pubsubService.js";

import {
  translatePatientMessage,
  translateResponseToPatient,
} from "./sarvamService.js";

import {
  searchKnowledgeBase,
} from "../data/healthKnowledgeBase.js";

import {
  computeEventRiskScore,
  computeTrajectorySignal,
} from "./computeEventRiskScore.js";

import {
  getSymptomContext,
} from "./adaptionDatasetService.js";

// ============================================================
// CAREFLOW AGENT TRIGGER
// ============================================================
//
// Local mode:
//   Vaidya directly triggers CareFlow.
//
// Pub/Sub mode:
//   Vaidya publishes an event and the CareFlow worker handles it.
//
// ============================================================

const triggerCareFlowAgent = async (patientId, trigger) => {
  if (env.AGENT_EXECUTION_MODE === "pubsub") {
    return publishAgentTrigger({
      patientId,
      trigger,
    });
  }

  const {
    runCareFlowAgentSafely,
  } = await import("../agents/orchestrator.js");

  return runCareFlowAgentSafely({
    patientId,
    trigger,
  });
};

// ============================================================
// SUBSCRIBE TO CAREFLOW AGENT TRIGGERS
// ============================================================

export const subscribeToAgentTriggers = async () => {
  await subscribeToTopic(
    TOPICS.AGENT_TRIGGER,
    async (data) => {
      console.log(
        `[PubSub] Agent trigger received for patient ${data.patientId}`
      );

      const {
        runCareFlowAgentSafely,
      } = await import("../agents/orchestrator.js");

      const result = await runCareFlowAgentSafely({
        patientId: data.patientId,
        trigger: data.trigger || "patient_event",
      });

      console.log(
        `[PubSub] Agent run result:`,
        result.success ? "success" : result.error
      );
    }
  );
};

// ============================================================
// SARVAM LLM CLIENT
// ============================================================
//
// Vaidya uses Sarvam's OpenAI-compatible Chat Completion API.
//
// Important:
// - We explicitly disable reasoning.
// - We require JSON output.
// - We NEVER use reasoning_content as the patient response.
// - We retry transient failures.
// ============================================================

const SARVAM_CHAT_URL =
  "https://api.sarvam.ai/v1/chat/completions";

const callSarvamChat = async ({
  messages,
  temperature = 0.2,
  maxTokens = 1500,
}) => {
  if (!env.SARVAM_API_KEY) {
    throw new Error(
      "SARVAM_API_KEY is not configured in .env"
    );
  }

  const MAX_RETRIES = 2;
  let lastError = null;

  for (
    let attempt = 0;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      // ------------------------------------------------------
      // Retry delay
      // ------------------------------------------------------

      if (attempt > 0) {
        console.log(
          `[Sarvam LLM] Retry attempt ${attempt}/${MAX_RETRIES}...`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * attempt)
        );
      }

      // ------------------------------------------------------
      // API REQUEST
      // ------------------------------------------------------

      const response = await fetch(
        SARVAM_CHAT_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "api-subscription-key":
              env.SARVAM_API_KEY,
          },

          body: JSON.stringify({
            model: "sarvam-105b",
            messages,
            temperature,
            max_tokens: maxTokens,
            reasoning_effort: null,
            response_format: {
              type: "json_object"
            }
          }),

          signal: AbortSignal.timeout(60000),
        }
      );

      // ------------------------------------------------------
      // HTTP ERROR
      // ------------------------------------------------------

      if (!response.ok) {
        const errorText =
          await response
            .text()
            .catch(() => "Unknown error");

        throw new Error(
          `Sarvam LLM error (${response.status}): ${errorText.slice(
            0,
            500
          )}`
        );
      }

      // ------------------------------------------------------
      // PARSE API RESPONSE
      // ------------------------------------------------------

      const data = await response.json();

      const choice = data?.choices?.[0];

      const message = choice?.message;

      console.log(
        "[Sarvam LLM] finish_reason:",
        choice?.finish_reason
      );

      console.log(
        "[Sarvam LLM] content available:",
        Boolean(message?.content)
      );

      // ------------------------------------------------------
      // IMPORTANT
      // ------------------------------------------------------
      //
      // DO NOT FALL BACK TO reasoning_content.
      //
      // reasoning_content is NOT the patient-facing answer
      // and is not guaranteed to contain valid JSON.
      //
      // ------------------------------------------------------

      const content = message?.content;

      if (!content) {
        throw new Error(
          `Sarvam returned no visible content. finish_reason=${choice?.finish_reason}`
        );
      }

      return content;

    } catch (error) {
      lastError = error;

      console.error(
        `[Sarvam LLM] Attempt ${attempt + 1} failed:`,
        error.message
      );
    }
  }

  throw (
    lastError ||
    new Error("Sarvam LLM failed after retries")
  );
};

// ============================================================
// VAIDYA SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `
You are Vaidya, a calm, empathetic health companion for patients in the CareFlow system.

IMPORTANT RULES:

- You are NOT a diagnosing doctor.
- Never diagnose diseases.
- Never say "You have X" or "You definitely have X."
- Acknowledge the symptoms the patient describes.
- Ask clarifying questions when needed.
- Encourage appropriate medical care when necessary.
- Surface urgent concerns appropriately.
- Avoid claiming clinical certainty.
- Be warm, supportive, respectful, and clear.

CARE GUIDANCE:

When relevant health information is provided with the patient's message, use it to give informed and helpful guidance.

The guidance may include:

- Common symptoms and possible general causes
- Self-care advice such as rest, hydration, and nutrition
- General medication information
- When professional care should be considered
- Monitoring guidance

Always frame care advice as suggestions, not prescriptions.

URGENCY RULES:

- For severe symptoms such as chest pain, severe breathing difficulty, fainting, severe bleeding, or other potentially life-threatening symptoms, encourage immediate medical help.
- For moderate symptoms, suggest contacting the ASHA worker or appropriate healthcare professional.
- For mild symptoms, provide self-care advice and monitoring guidance.

RESPONSE STYLE:

- Usually 2-4 sentences.
- Patient-friendly language.
- Avoid unnecessary medical jargon.
- Supportive and caring.
- Actionable when appropriate.
- Do not overwhelm the patient.

STRUCTURED HEALTH ANALYSIS:

When the patient describes health information, you must ALSO return structured JSON analysis.

RESPONSE FORMAT:

Return ONLY valid JSON.

The JSON must follow exactly this structure:

{
  "response": "your conversational response to the patient",
  "analysis": {
    "hasHealthUpdate": true,
    "eventType": "symptom_update",
    "symptoms": [
      {
        "name": "symptom name",
        "severity": 0,
        "status": "new"
      }
    ],
    "medications": [
      {
        "name": "medication name if mentioned",
        "adherence": "good",
        "notes": "any relevant notes"
      }
    ],
    "vitals": {
      "temperature": null,
      "heartRate": null,
      "systolicBP": null,
      "diastolicBP": null
    },
    "severity": "low",
    "riskSignals": [],
    "summary": "brief summary of what the patient reported"
  }
}

RULES FOR hasHealthUpdate:

Set hasHealthUpdate to TRUE ONLY when the patient provides meaningful health information, such as:

- Symptoms
- Vitals
- Medication changes
- Medication adherence problems
- New health concerns
- Worsening or improving symptoms
- Relevant health events

Set hasHealthUpdate to FALSE for:

- Greetings
- Thank you messages
- Casual conversation
- General non-personal questions
- Simple acknowledgements

RULES FOR symptoms:

- ONLY include symptoms actually mentioned by the patient.
- Never invent symptoms.
- Estimate severity from the patient's description.

Severity guidance:

1-3 = mild
4-6 = moderate
7-9 = severe
10 = extremely severe

Status must be one of:

"new"
"worsening"
"stable"
"improving"
"resolved"

RULES FOR medications:

Only include medications when the patient actually mentions medication use, adherence, missed doses, changes, or related concerns.

Allowed adherence values:

"good"
"partial"
"poor"
"unknown"

RULES FOR vitals:

Only include vitals actually provided by the patient.

Use null for unavailable values.

RULES FOR severity:

"low" =
minor complaint with no obvious urgency

"moderate" =
noticeable concern that should be monitored

"high" =
significant concern requiring prompt attention

"critical" =
potentially urgent situation requiring immediate medical attention

RULES FOR riskSignals:

Only include risks supported by the patient's message or the supplied health information.

Do not invent risk factors.

RULES FOR summary:

Provide a short factual summary of what the patient reported.

Do not diagnose the patient.

FINAL RULE:

Return valid JSON only.
Never use markdown code fences.
Never return explanatory text outside the JSON object.
`;

// ============================================================
// PROCESS PATIENT MESSAGE
// ============================================================

export const processPatientMessage = async ({
  patientId,
  message,
}) => {
  const _t0 = Date.now();

  const _ts = (label) => {
    console.log(
      `[Vaidya] ${label}: ${Date.now() - _t0}ms`
    );
  };

  // ==========================================================
  // VALIDATE PATIENT
  // ==========================================================

  const patient = await Patient.findById(patientId);

  if (!patient) {
    throw new Error("Patient not found");
  }

  if (!message?.trim()) {
    throw new Error("Message is required");
  }

  // ==========================================================
  // LANGUAGE DETECTION / TRANSLATION
  // ==========================================================

  const patientLang =
    patient.preferredLanguage || "English";

  let originalLanguage = "en-IN";

  let messageForLLM = message.trim();

  let wasTranslated = false;

  try {
    const langResult =
      await translatePatientMessage(
        message.trim(),
        patientLang
      );

    messageForLLM =
      langResult.translatedMessage;

    originalLanguage =
      langResult.originalLanguage;

    wasTranslated =
      langResult.wasTranslated;

    _ts(
      `Language processing (detected: ${originalLanguage}, translated: ${wasTranslated})`
    );

  } catch (langError) {
    console.warn(
      "Language processing failed, using original message:",
      langError.message
    );
  }

  // ==========================================================
  // KNOWLEDGE BASE
  // ==========================================================

  let knowledgeContext = "";

  try {
    const kbResults =
      searchKnowledgeBase(messageForLLM);

    if (kbResults.length > 0) {
      knowledgeContext =
        "\n\nRELEVANT HEALTH INFORMATION:\n";

      for (
        const item of kbResults.slice(0, 3)
      ) {
        knowledgeContext +=
          `\n- ${item.name}: ${item.description}\n`;

        if (item.commonCauses) {
          knowledgeContext +=
            `  Common causes: ${item.commonCauses.join(
              ", "
            )}\n`;
        }

        if (item.whenToSeekHelp) {
          knowledgeContext +=
            `  When to seek help: ${item.whenToSeekHelp.join(
              "; "
            )}\n`;
        }

        if (item.keyPoints) {
          knowledgeContext +=
            `  Key points: ${item.keyPoints
              .slice(0, 3)
              .join("; ")}\n`;
        }
      }

      knowledgeContext += `
Use this information to provide informed care guidance.
Always frame the guidance as suggestions, not diagnoses.
`;
    }

  } catch (kbError) {
    console.warn(
      "Knowledge base search failed:",
      kbError.message
    );
  }

  // ==========================================================
  // ADAPTION DATASET
  // ==========================================================

  let adaptionContext = "";

  try {
    adaptionContext =
      getSymptomContext(
        messageForLLM,
        originalLanguage
      );

    if (adaptionContext) {
      knowledgeContext += adaptionContext;
    }

  } catch (adaptionError) {
    console.warn(
      "Adaption dataset search failed:",
      adaptionError.message
    );
  }

  // ==========================================================
  // CALL SARVAM
  // ==========================================================

  const messages = [
    {
      role: "system",
      content:
        SYSTEM_PROMPT +
        knowledgeContext,
    },

    {
      role: "user",
      content: messageForLLM,
    },
  ];

  const rawText =
    await callSarvamChat({
      messages,
    });

  _ts("Sarvam LLM response");

  if (!rawText) {
    throw new Error(
      "Sarvam LLM returned an empty response"
    );
  }

  // ==========================================================
  // PARSE SARVAM JSON
  // ==========================================================

  let parsed;

  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    parsed = JSON.parse(cleaned);

  } catch (parseError) {
    console.error(
      "[Vaidya] Failed to parse Sarvam JSON:",
      parseError.message
    );

    console.error(
      "[Vaidya] Raw Sarvam response:",
      rawText
    );

    throw new Error(
      "Vaidya received an invalid response from the AI model."
    );
  }

  // ==========================================================
  // VALIDATE BASIC RESPONSE STRUCTURE
  // ==========================================================

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    throw new Error(
      "Vaidya received an invalid response structure."
    );
  }

  if (
    typeof parsed.response !== "string" ||
    !parsed.response.trim()
  ) {
    throw new Error(
      "Vaidya received an empty conversational response."
    );
  }

  // ==========================================================
  // TRANSLATE RESPONSE BACK TO PATIENT
  // ==========================================================

  let finalResponse =
    parsed.response.trim();

  if (
    wasTranslated &&
    originalLanguage !== "en-IN"
  ) {
    try {
      const langResult =
        await translateResponseToPatient(
          finalResponse,
          originalLanguage
        );

      if (langResult.wasTranslated) {
        finalResponse =
          langResult.translatedResponse;
      }

      _ts("Response translation");

    } catch (transError) {
      console.warn(
        "Response translation failed, using English:",
        transError.message
      );
    }
  }

  // ==========================================================
  // NORMALIZE ANALYSIS
  // ==========================================================

  const analysis =
    normalizeAnalysis(parsed.analysis);

  // ==========================================================
  // CREATE PATIENT EVENT
  // ==========================================================

  let event = null;

  if (analysis.hasHealthUpdate) {
    event = await PatientEvent.create({
      patientId: patient._id,

      eventType:
        analysis.eventType ||
        "symptom_update",

      source: "patient",

      timestamp: new Date(),

      symptoms:
        analysis.symptoms || [],

      medications:
        analysis.medications || [],

      vitals:
        analysis.vitals || {},

      notes:
        analysis.summary || "",

      severity:
        analysis.severity || "low",

      riskScore: computeEventRiskScore({
        symptoms: analysis.symptoms || [],
        vitals: analysis.vitals || {},
        medications: analysis.medications || [],
        severity: analysis.severity || "low",
      }),

      trajectorySignal: computeTrajectorySignal({
        symptoms: analysis.symptoms || [],
      }),

      aiAnalysis: {
        generatedBy: "vaidya",
        model: "sarvam-105b",
        riskSignals:
          analysis.riskSignals || [],
        rawAnalysis: analysis,
      },
    });

    patient.lastVisitAt =
      event.timestamp;

    await patient.save();

    console.log(
      `[Vaidya] Event created: riskScore=${event.riskScore}, trajectory=${event.trajectorySignal}, severity=${event.severity}`
    );
  }

  // ==========================================================
  // TRIGGER CAREFLOW
  // ==========================================================

  let agentTriggered = false;

  if (
    event &&
    analysis.hasHealthUpdate
  ) {
    // --------------------------------------------------------
    // Create live signal event
    // --------------------------------------------------------

    const signalReason = [];

    if (
      analysis.symptoms?.length > 0
    ) {
      signalReason.push(
        analysis.symptoms
          .map(
            (s) =>
              `${s.name} (${s.status})`
          )
          .join(", ")
      );
    }

    if (
      analysis.medications?.length > 0
    ) {
      signalReason.push(
        "medication update"
      );
    }

    await createSignalDetectedEvent(
      patient,
      event,
      signalReason.join(" · ") ||
        "health update reported"
    ).catch((error) => {
      console.warn(
        "[Vaidya] Signal event creation failed:",
        error.message
      );
    });

    // --------------------------------------------------------
    // Trigger CareFlow asynchronously
    // --------------------------------------------------------

    triggerCareFlowAgent(
      patient._id,
      "patient_event"
    )
      .then(() => {
        console.log(
          `🤖 CareFlow agent triggered for ${patient.name} after Vaidya chat`
        );
      })
      .catch((err) => {
        console.error(
          `⚠️ CareFlow agent trigger failed for ${patient.name}:`,
          err.message
        );
      });

    agentTriggered = true;
  }

  // ==========================================================
  // TOTAL PROCESSING TIME
  // ==========================================================

  _ts("Total processing");

  // ==========================================================
  // RETURN TO FRONTEND
  // ==========================================================

  return {
    response: finalResponse,

    eventCreated: !!event,

    event: event
      ? {
          id: event._id,
          type: event.eventType,
          timestamp: event.timestamp,
        }
      : null,

    agentTriggered,

    language: wasTranslated
      ? originalLanguage
      : "en-IN",

    sarvamUsed: true,

    knowledgeBaseUsed:
      knowledgeContext.length > 0,
  };
};

// ============================================================
// NORMALIZE ANALYSIS
// ============================================================

const normalizeAnalysis = (raw) => {
  if (
    !raw ||
    typeof raw !== "object"
  ) {
    return {
      hasHealthUpdate: false,
      eventType: "other",
      symptoms: [],
      medications: [],
      vitals: {},
      severity: "low",
      riskSignals: [],
      summary: "",
    };
  }

  const allowedEventTypes = [
    "visit",
    "symptom_update",
    "vital_update",
    "medication_update",
    "follow_up",
    "risk_change",
    "other",
  ];

  const allowedSeverities = [
    "low",
    "moderate",
    "high",
    "critical",
  ];

  const allowedSymptomStatuses = [
    "new",
    "improving",
    "stable",
    "worsening",
    "resolved",
  ];

  const allowedAdherence = [
    "good",
    "partial",
    "poor",
    "unknown",
  ];

  // ==========================================================
  // SYMPTOMS
  // ==========================================================

  const symptoms =
    Array.isArray(raw.symptoms)
      ? raw.symptoms
          .filter(
            (s) =>
              s &&
              s.name
          )
          .map((s) => ({
            name: String(
              s.name
            ).trim(),

            severity: Math.max(
              0,
              Math.min(
                10,
                Number(s.severity) || 3
              )
            ),

            status:
              allowedSymptomStatuses.includes(
                s.status
              )
                ? s.status
                : "stable",
          }))
      : [];

  // ==========================================================
  // MEDICATIONS
  // ==========================================================

  const medications =
    Array.isArray(raw.medications)
      ? raw.medications
          .filter(
            (m) =>
              m &&
              m.name
          )
          .map((m) => ({
            name: String(
              m.name
            ).trim(),

            adherence:
              allowedAdherence.includes(
                m.adherence
              )
                ? m.adherence
                : "unknown",

            notes: String(
              m.notes || ""
            ).trim(),
          }))
      : [];

  // ==========================================================
  // VITALS
  // ==========================================================

  const vitals = {};

  if (
    raw.vitals &&
    typeof raw.vitals === "object"
  ) {
    if (
      raw.vitals.temperature != null
    ) {
      const value = Number(
        raw.vitals.temperature
      );

      if (Number.isFinite(value)) {
        vitals.temperature = value;
      }
    }

    if (
      raw.vitals.heartRate != null
    ) {
      const value = Number(
        raw.vitals.heartRate
      );

      if (Number.isFinite(value)) {
        vitals.heartRate = value;
      }
    }

    if (
      raw.vitals.systolicBP != null
    ) {
      const value = Number(
        raw.vitals.systolicBP
      );

      if (Number.isFinite(value)) {
        vitals.systolicBP = value;
      }
    }

    if (
      raw.vitals.diastolicBP != null
    ) {
      const value = Number(
        raw.vitals.diastolicBP
      );

      if (Number.isFinite(value)) {
        vitals.diastolicBP = value;
      }
    }
  }

  // ==========================================================
  // FINAL NORMALIZED OBJECT
  // ==========================================================

  return {
    hasHealthUpdate:
      Boolean(
        raw.hasHealthUpdate
      ),

    eventType:
      allowedEventTypes.includes(
        raw.eventType
      )
        ? raw.eventType
        : "symptom_update",

    symptoms,

    medications,

    vitals,

    severity:
      allowedSeverities.includes(
        raw.severity
      )
        ? raw.severity
        : "low",

    riskSignals:
      Array.isArray(
        raw.riskSignals
      )
        ? raw.riskSignals
            .map(String)
            .slice(0, 20)
        : [],

    summary: String(
      raw.summary || ""
    ).slice(0, 1000),
  };
};