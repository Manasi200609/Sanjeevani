import Memory from "../models/Memory.js";
import PatientEvent from "../models/PatientEvent.js";
import CareDecision from "../models/CareDecision.js";

// ============================================================
// GET RELEVANT LONG-TERM MEMORIES
// ============================================================

export const retrieveMemories = async (
  patientId,
  options = {}
) => {
  const {
    limit = 5,
    memoryType = null,
  } = options;

  const query = {
    patientId,
    isActive: true,
  };

  if (memoryType) {
    query.memoryType = memoryType;
  }

  return await Memory.find(query)
    .sort({
      periodEnd: -1,
      version: -1,
    })
    .limit(Number(limit));
};

// ============================================================
// GET RECENT EVENTS
// ============================================================

export const retrieveRecentEvents = async (
  patientId,
  limit = 5
) => {
  return await PatientEvent.find({
    patientId,
  })
    .sort({
      timestamp: -1,
    })
    .limit(Number(limit));
};

// ============================================================
// GET RECENT CARE DECISIONS
// ============================================================

export const retrieveRecentDecisions = async (
  patientId,
  limit = 5
) => {
  return await CareDecision.find({
    patientId,
  })
    .sort({
      createdAt: -1,
    })
    .limit(Number(limit));
};

// ============================================================
// BUILD LONGITUDINAL CONTEXT
// ============================================================

export const buildLongitudinalContext =
  async (
    patientId,
    options = {}
  ) => {
    const {
      memoryLimit = 5,
      eventLimit = 5,
      decisionLimit = 5,
    } = options;

    const [
      memories,
      recentEvents,
      recentDecisions,
    ] = await Promise.all([
      retrieveMemories(
        patientId,
        {
          limit: memoryLimit,
        }
      ),

      retrieveRecentEvents(
        patientId,
        eventLimit
      ),

      retrieveRecentDecisions(
        patientId,
        decisionLimit
      ),
    ]);

    return {
      memories,
      recentEvents,
      recentDecisions,
    };
  };

// ============================================================
// EXTRACT IMPORTANT HISTORICAL SIGNALS
// ============================================================

export const extractHistoricalSignals =
  (memories = [], events = []) => {
    const signals = [];

    // ----------------------------------------------------------
    // Signals from long-term memory
    // ----------------------------------------------------------

    for (const memory of memories) {
      if (
        Array.isArray(
          memory.keySignals
        )
      ) {
        signals.push(
          ...memory.keySignals
        );
      }

      if (
        Array.isArray(
          memory.symptomPatterns
        )
      ) {
        for (const pattern of
          memory.symptomPatterns) {
          if (
            typeof pattern === "string"
          ) {
            signals.push(pattern);
          } else if (
            pattern?.summary
          ) {
            signals.push(
              pattern.summary
            );
          }
        }
      }
    }

    // ----------------------------------------------------------
    // Signals from recent events
    // ----------------------------------------------------------

    for (const event of events) {
      if (
        Array.isArray(
          event.symptoms
        )
      ) {
        for (const symptom of
          event.symptoms) {
          if (
            symptom?.name &&
            (
              symptom.status ===
                "worsening" ||
              symptom.status ===
                "new"
            )
          ) {
            signals.push(
              `${symptom.name}: ${symptom.status}`
            );
          }
        }
      }

      if (
        Array.isArray(
          event.medications
        )
      ) {
        for (const medication of
          event.medications) {
          if (
            medication?.adherence &&
            medication.adherence !==
              "good"
          ) {
            signals.push(
              `Medication adherence: ${medication.adherence}`
            );
          }
        }
      }
    }

    return [
      ...new Set(signals),
    ];
  };

// ============================================================
// BUILD AI-FRIENDLY MEMORY CONTEXT
// ============================================================

export const buildMemoryPromptContext =
  async (patientId) => {
    const context =
      await buildLongitudinalContext(
        patientId,
        {
          memoryLimit: 5,
          eventLimit: 5,
          decisionLimit: 5,
        }
      );

    const signals =
      extractHistoricalSignals(
        context.memories,
        context.recentEvents
      );

    return {
      historicalMemories:
        context.memories.map(
          (memory) => ({
            type:
              memory.memoryType,

            period:
              `${memory.periodStart} → ${memory.periodEnd}`,

            summary:
              memory.summary,

            keySignals:
              memory.keySignals,

            riskHistory:
              memory.riskHistory,

            careHistory:
              memory.careHistory,

            confidence:
              memory.confidence,
          })
        ),

      recentEvents:
        context.recentEvents.map(
          (event) => ({
            timestamp:
              event.timestamp,

            symptoms:
              event.symptoms,

            vitals:
              event.vitals,

            medications:
              event.medications,

            severity:
              event.severity,

            riskScore:
              event.riskScore,

            trajectorySignal:
              event.trajectorySignal,

            notes:
              event.notes,
          })
        ),

      recentDecisions:
        context.recentDecisions.map(
          (decision) => ({
            decisionType:
              decision.decisionType,

            riskLevel:
              decision.riskLevel,

            priority:
              decision.priority,

            followUpIntervalDays:
              decision.recommendedFollowUpIntervalDays,

            reasoning:
              decision.reasoning,

            createdAt:
              decision.createdAt,
          })
        ),

      historicalSignals:
        signals,
    };
  };

// ============================================================
// FIND SIMILAR HISTORICAL EVENTS
// ============================================================

export const findSimilarHistoricalEvents =
  async ({
    patientId,
    symptomNames = [],
    limit = 10,
  }) => {
    if (!symptomNames.length) {
      return [];
    }

    return await PatientEvent.find({
      patientId,

      "symptoms.name": {
        $in: symptomNames,
      },
    })
      .sort({
        timestamp: -1,
      })
      .limit(Number(limit));
  };

// ============================================================
// GET PREVIOUS RISK TREND
// ============================================================

export const getHistoricalRiskTrend =
  async (
    patientId,
    limit = 10
  ) => {
    const events =
      await PatientEvent.find({
        patientId,
      })
        .select(
          "timestamp riskScore trajectorySignal"
        )
        .sort({
          timestamp: -1,
        })
        .limit(Number(limit));

    return events
      .reverse()
      .map((event) => ({
        timestamp:
          event.timestamp,

        riskScore:
          event.riskScore,

        trajectory:
          event.trajectorySignal,
      }));
  };

// ============================================================
// GET COMPLETE AGENT MEMORY
// ============================================================

export const getAgentMemory = async (
  patientId
) => {
  const [
    longitudinalContext,
    historicalRiskTrend,
  ] = await Promise.all([
    buildMemoryPromptContext(
      patientId
    ),

    getHistoricalRiskTrend(
      patientId
    ),
  ]);

  return {
    ...longitudinalContext,

    historicalRiskTrend,
  };
};