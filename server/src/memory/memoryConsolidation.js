import Patient from "../models/Patient.js";
import PatientEvent from "../models/PatientEvent.js";
import CareDecision from "../models/CareDecision.js";
import Memory from "../models/Memory.js";

import {
  createMemory,
  deactivateMemoriesForPeriod,
} from "../services/memoryService.js";
import { consolidateMemoryWithAI } from "../ai/aiProvider.js";

const buildEventSummary = (events) => {
  if (!events.length) {
    return "No patient events available for this period.";
  }

  const scores = events.map(
    (event) => Number(event.riskScore) || 0
  );

  const startingRisk = scores[0];
  const endingRisk =
    scores[scores.length - 1];

  const riskChange =
    endingRisk - startingRisk;

  // Build richer symptom summary with severity and status
  const symptomDetails = [];
  for (const event of events) {
    for (const s of event.symptoms || []) {
      if (!s?.name) continue;
      const key = `${s.name}:${s.status}`;
      if (!symptomDetails.find(d => d.key === key)) {
        symptomDetails.push({ key, name: s.name, severity: s.severity, status: s.status });
      }
    }
  }

  // Build medication adherence trend
  const medAdherence = [];
  for (const event of events) {
    for (const m of event.medications || []) {
      if (m?.name && m?.adherence) {
        const existing = medAdherence.find(a => a.name === m.name);
        if (existing) {
          existing.latest = m.adherence;
        } else {
          medAdherence.push({ name: m.name, latest: m.adherence });
        }
      }
    }
  }

  // Build risk trend description
  const riskTrend = riskChange > 10 ? 'significantly increased' : riskChange > 0 ? 'increased' : riskChange < -10 ? 'significantly decreased' : riskChange < 0 ? 'decreased' : 'remained stable';

  const parts = [
    `Patient had ${events.length} recorded event(s) during this period.`,
    `Risk score ${riskTrend} from ${startingRisk} to ${endingRisk}.`,
  ];

  if (symptomDetails.length) {
    parts.push(`Symptoms: ${symptomDetails.map(s => `${s.name} (${s.severity}/10, ${s.status})`).join(', ')}.`);
  } else {
    parts.push('No significant symptoms were recorded.');
  }

  if (medAdherence.length) {
    parts.push(`Medication adherence: ${medAdherence.map(m => `${m.name}: ${m.latest}`).join(', ')}.`);
  }

  const trajectory = events[events.length - 1]?.trajectorySignal || 'unknown';
  parts.push(`Latest trajectory: ${trajectory}.`);

  return parts.join(' ');
};

const extractKeySignals = (events) => {
  const signals = [];

  for (const event of events) {
    if (
      event.trajectorySignal ===
      "worsening"
    ) {
      signals.push(
        "Patient trajectory showed worsening signals."
      );
    }

    if (
      event.trajectorySignal ===
      "improving"
    ) {
      signals.push(
        "Patient trajectory showed improvement."
      );
    }

    for (const symptom of
      event.symptoms || []) {
      if (!symptom?.name) continue;

      if (
        symptom.status === "new"
      ) {
        signals.push(
          `New symptom: ${symptom.name}.`
        );
      }

      if (
        symptom.status ===
        "worsening"
      ) {
        signals.push(
          `Worsening symptom: ${symptom.name}.`
        );
      }
    }

    for (const medication of
      event.medications || []) {
      if (
        medication?.adherence &&
        medication.adherence !== "good"
      ) {
        signals.push(
          `Medication adherence issue: ${medication.adherence}.`
        );
      }
    }
  }

  return [
    ...new Set(signals),
  ];
};

const buildSymptomPatterns = (
  events
) => {
  const map = new Map();

  for (const event of events) {
    for (const symptom of
      event.symptoms || []) {
      if (!symptom?.name) continue;

      const key =
        symptom.name.toLowerCase();

      const current =
        map.get(key);

      if (!current) {
        map.set(key, {
          name: symptom.name,
          trend:
            symptom.status ===
            "worsening"
              ? "worsening"
              : symptom.status ===
                "new"
              ? "new"
              : symptom.status ===
                "improving"
              ? "improving"
              : symptom.status ===
                "resolved"
              ? "resolved"
              : "stable",
          severity:
            Number(
              symptom.severity
            ) || 0,
        });
        continue;
      }

      current.severity =
        Math.max(
          current.severity,
          Number(
            symptom.severity
          ) || 0
        );

      if (
        symptom.status ===
        "worsening"
      ) {
        current.trend =
          "worsening";
      } else if (
        symptom.status === "new" &&
        current.trend !==
          "worsening"
      ) {
        current.trend = "new";
      }
    }
  }

  return [...map.values()];
};

const buildMedicationPatterns = (
  events
) => {
  const map = new Map();

  for (const event of events) {
    for (const medication of
      event.medications || []) {
      if (!medication?.name) continue;

      const key =
        medication.name;

      map.set(key, {
        medication:
          medication.name,
        adherence:
          medication.adherence ||
          "unknown",
        notes:
          medication.notes || "",
      });
    }
  }

  return [...map.values()];
};

const buildRiskHistory = (
  events
) => {
  if (!events.length) {
    return {
      startingRiskScore: null,
      endingRiskScore: null,
      trend: "unknown",
    };
  }

  const start =
    Number(events[0].riskScore) || 0;

  const end =
    Number(
      events[events.length - 1]
        .riskScore
    ) || 0;

  return {
    startingRiskScore: start,
    endingRiskScore: end,
    trend:
      end > start
        ? "worsening"
        : end < start
        ? "improving"
        : "stable",
  };
};

const buildCareHistory = (
  decisions
) => {
  const followUpChanges =
    decisions.filter(
      (decision, index) => {
        if (index === 0) return false;

        return (
          decision
            .recommendedFollowUpIntervalDays !==
          decisions[index - 1]
            .recommendedFollowUpIntervalDays
        );
      }
    ).length;

  const latest =
    decisions[
      decisions.length - 1
    ];

  return {
    decisionsMade:
      decisions.length,
    followUpChanges,
    lastPriority:
      latest?.priority || null,
    lastCareState:
      latest
        ? latest.decisionType
        : null,
  };
};

export const consolidatePatientMemory =
  async ({
    patientId,
    startDate,
    endDate,
    memoryType =
      "timeline_summary",
  }) => {
    const patient =
      await Patient.findById(
        patientId
      );

    if (!patient) {
      throw new Error(
        "Patient not found"
      );
    }

    const periodEnd =
      endDate
        ? new Date(endDate)
        : new Date();

    const periodStart =
      startDate
        ? new Date(startDate)
        : new Date(
            periodEnd.getTime() -
              30 *
                24 *
                60 *
                60 *
                1000
          );

    const events =
      await PatientEvent.find({
        patientId,
        timestamp: {
          $gte: periodStart,
          $lte: periodEnd,
        },
      }).sort({
        timestamp: 1,
      });

    const decisions =
      await CareDecision.find({
        patientId,
        createdAt: {
          $gte: periodStart,
          $lte: periodEnd,
        },
      }).sort({
        createdAt: 1,
      });

    if (!events.length) {
      return {
        success: false,
        message:
          "No events available for memory consolidation.",
        memory: null,
      };
    }

    // ----------------------------------------------------------
    // Try AI-powered memory consolidation first
    // ----------------------------------------------------------

    let aiMemory = null;
    try {
      const contextForAI = {
        patient: { name: patient.name, patientCode: patient.patientCode },
        events: events.map((e) => ({
          timestamp: e.timestamp,
          symptoms: e.symptoms,
          vitals: e.vitals,
          medications: e.medications,
          severity: e.severity,
          riskScore: e.riskScore,
          trajectorySignal: e.trajectorySignal,
        })),
        decisions: decisions.map((d) => ({
          decisionType: d.decisionType,
          riskLevel: d.riskLevel,
          priority: d.priority,
        })),
      };
      aiMemory = await consolidateMemoryWithAI(patientId, contextForAI);
    } catch {
      // AI consolidation failed — fall back to deterministic
    }

    await deactivateMemoriesForPeriod({
      patientId,
      startDate: periodStart,
      endDate: periodEnd,
    });

    // Use AI-generated memory if available, otherwise deterministic
    const summary = aiMemory?.summary || buildEventSummary(events);
    const keySignals = aiMemory?.keySignals?.length ? aiMemory.keySignals : extractKeySignals(events);
    const symptomPatterns = aiMemory?.symptomPatterns?.length ? aiMemory.symptomPatterns : buildSymptomPatterns(events);
    const medicationPatterns = aiMemory?.medicationPatterns?.length ? aiMemory.medicationPatterns : buildMedicationPatterns(events);
    const riskTrend = aiMemory?.riskTrend || buildRiskHistory(events).trend;
    const confidence = aiMemory?.confidence || (events.length >= 3 ? 0.8 : 0.6);

    const memory =
      await createMemory({
        patientId,
        memoryType,
        periodStart,
        periodEnd,
        summary,
        keySignals,
        symptomPatterns,
        medicationPatterns,
        riskHistory: {
          startingRiskScore: buildRiskHistory(events).startingRiskScore,
          endingRiskScore: buildRiskHistory(events).endingRiskScore,
          trend: riskTrend,
        },
        careHistory: buildCareHistory(decisions),
        sourceEventIds: events.map((event) => event._id),
        generatedBy: aiMemory ? "gemini" : "system",
        confidence,
      });

    return {
      success: true,
      patient: {
        id: patient._id,
        patientCode:
          patient.patientCode,
        name: patient.name,
      },
      period: {
        start: periodStart,
        end: periodEnd,
      },
      eventsAnalyzed:
        events.length,
      decisionsAnalyzed:
        decisions.length,
      memory,
    };
  };

export const consolidateRecentMemory =
  async (patientId) =>
    consolidatePatientMemory({
      patientId,
      memoryType:
        "timeline_summary",
    });

export const getConsolidatedMemory =
  async (patientId) =>
    Memory.find({
      patientId,
      isActive: true,
    })
      .sort({
        periodEnd: -1,
        version: -1,
      })
      .limit(5)
      .lean();
