import Patient from "../models/Patient.js";
import PatientEvent from "../models/PatientEvent.js";


// ============================================================
// TRAJECTORY SERVICE
// ============================================================
//
// Purpose:
//
// Convert a patient's recent longitudinal events into a
// deterministic trajectory signal.
//
// This service does NOT use an LLM.
//
// The AI layer can later reason over this structured signal,
// but the basic clinical trend calculation remains deterministic.
//
// Flow:
//
// Patient Events
//      ↓
// Recent Events
//      ↓
// Risk Comparison
//      ↓
// Symptom Comparison
//      ↓
// Trajectory
//
// Possible results:
//
// stable
// improving
// worsening
//
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_EVENT_LIMIT = 5;

const MIN_EVENTS_FOR_COMPARISON = 2;


// ============================================================
// HELPERS
// ============================================================

const clamp = (
  value,
  min,
  max
) => {
  return Math.max(
    min,
    Math.min(max, value)
  );
};


// ============================================================
// CALCULATE RISK CHANGE
// ============================================================

const calculateRiskChange = (
  latestEvent,
  previousEvent
) => {
  if (
    !latestEvent ||
    !previousEvent
  ) {
    return 0;
  }

  const latestRisk =
    Number(
      latestEvent.riskScore
    ) || 0;

  const previousRisk =
    Number(
      previousEvent.riskScore
    ) || 0;

  return latestRisk -
    previousRisk;
};


// ============================================================
// CALCULATE SYMPTOM SEVERITY
// ============================================================

const calculateSymptomSeverity = (
  event
) => {
  if (
    !event ||
    !Array.isArray(
      event.symptoms
    )
  ) {
    return 0;
  }

  if (
    event.symptoms.length === 0
  ) {
    return 0;
  }

  const total =
    event.symptoms.reduce(
      (sum, symptom) => {
        return (
          sum +
          (
            Number(
              symptom.severity
            ) || 0
          )
        );
      },
      0
    );

  return (
    total /
    event.symptoms.length
  );
};


// ============================================================
// CALCULATE SYMPTOM CHANGE
// ============================================================

const calculateSymptomChange = (
  latestEvent,
  previousEvent
) => {
  const latestSeverity =
    calculateSymptomSeverity(
      latestEvent
    );

  const previousSeverity =
    calculateSymptomSeverity(
      previousEvent
    );

  return (
    latestSeverity -
    previousSeverity
  );
};


// ============================================================
// DETECT NEW SYMPTOMS
// ============================================================

const detectNewSymptoms = (
  latestEvent,
  previousEvent
) => {
  const latestSymptoms =
    Array.isArray(
      latestEvent?.symptoms
    )
      ? latestEvent.symptoms
      : [];

  const previousSymptoms =
    Array.isArray(
      previousEvent?.symptoms
    )
      ? previousEvent.symptoms
      : [];

  const previousNames =
    new Set(
      previousSymptoms.map(
        (symptom) =>
          symptom.name
            ?.toLowerCase()
      )
    );

  return latestSymptoms.filter(
    (symptom) => {
      const name =
        symptom.name
          ?.toLowerCase();

      return (
        name &&
        !previousNames.has(name)
      );
    }
  );
};


// ============================================================
// DETECT MEDICATION ADHERENCE CHANGE
// ============================================================

const calculateMedicationAdherenceChange =
  (
    latestEvent,
    previousEvent
  ) => {
    const latestMedication =
      latestEvent?.medications?.[0];

    const previousMedication =
      previousEvent?.medications?.[0];

    if (
      !latestMedication ||
      !previousMedication
    ) {
      return "unknown";
    }

    const adherenceRank = {
      good: 3,
      partial: 2,
      poor: 1,
    };

    const latestRank =
      adherenceRank[
        latestMedication.adherence
      ] || 0;

    const previousRank =
      adherenceRank[
        previousMedication.adherence
      ] || 0;

    if (
      latestRank <
      previousRank
    ) {
      return "worsening";
    }

    if (
      latestRank >
      previousRank
    ) {
      return "improving";
    }

    return "stable";
  };


// ============================================================
// DETERMINE TRAJECTORY
// ============================================================

const determineTrajectory = ({
  riskChange,
  symptomChange,
  newSymptomsCount,
  medicationChange,
}) => {
  // ----------------------------------------------------------
  // Strong worsening signals
  // ----------------------------------------------------------

  let worseningSignals = 0;

  if (riskChange >= 10) {
    worseningSignals += 2;
  } else if (riskChange >= 5) {
    worseningSignals += 1;
  }

  if (symptomChange >= 1) {
    worseningSignals += 2;
  } else if (symptomChange >= 0.5) {
    worseningSignals += 1;
  }

  if (
    newSymptomsCount > 0
  ) {
    worseningSignals += 2;
  }

  if (
    medicationChange ===
    "worsening"
  ) {
    worseningSignals += 1;
  }

  // ----------------------------------------------------------
  // Improving signals
  // ----------------------------------------------------------

  let improvingSignals = 0;

  if (riskChange <= -10) {
    improvingSignals += 2;
  } else if (riskChange <= -5) {
    improvingSignals += 1;
  }

  if (symptomChange <= -1) {
    improvingSignals += 2;
  } else if (symptomChange <= -0.5) {
    improvingSignals += 1;
  }

  if (
    medicationChange ===
    "improving"
  ) {
    improvingSignals += 1;
  }

  // ----------------------------------------------------------
  // Final classification
  // ----------------------------------------------------------

  if (
    worseningSignals >
    improvingSignals &&
    worseningSignals >= 2
  ) {
    return "worsening";
  }

  if (
    improvingSignals >
    worseningSignals &&
    improvingSignals >= 2
  ) {
    return "improving";
  }

  return "stable";
};


// ============================================================
// CALCULATE CONFIDENCE
// ============================================================

const calculateConfidence = ({
  eventsAnalyzed,
  riskChange,
  symptomChange,
  newSymptomsCount,
  trajectory,
}) => {
  if (
    eventsAnalyzed <
    MIN_EVENTS_FOR_COMPARISON
  ) {
    return 0.3;
  }

  let confidence = 0.5;

  // More events = more evidence
  if (eventsAnalyzed >= 3) {
    confidence += 0.1;
  }

  if (eventsAnalyzed >= 5) {
    confidence += 0.1;
  }

  // Strong risk movement
  if (
    Math.abs(riskChange) >= 10
  ) {
    confidence += 0.1;
  }

  // Strong symptom movement
  if (
    Math.abs(symptomChange) >= 1
  ) {
    confidence += 0.1;
  }

  // New symptom
  if (
    newSymptomsCount > 0
  ) {
    confidence += 0.1;
  }

  return clamp(
    Number(
      confidence.toFixed(2)
    ),
    0.3,
    0.95
  );
};


// ============================================================
// BUILD REASON
// ============================================================

const buildReason = ({
  trajectory,
  riskChange,
  symptomChange,
  newSymptoms,
  medicationChange,
}) => {
  if (
    trajectory ===
    "worsening"
  ) {
    const reasons = [];

    if (riskChange > 0) {
      reasons.push(
        `risk score increased by ${riskChange}`
      );
    }

    if (symptomChange > 0) {
      reasons.push(
        "symptom severity increased"
      );
    }

    if (
      newSymptoms.length > 0
    ) {
      reasons.push(
        `new symptom detected: ${newSymptoms
          .map(
            (symptom) =>
              symptom.name
          )
          .join(", ")}`
      );
    }

    if (
      medicationChange ===
      "worsening"
    ) {
      reasons.push(
        "medication adherence worsened"
      );
    }

    if (
      reasons.length === 0
    ) {
      reasons.push(
        "recent events indicate clinical deterioration"
      );
    }

    return (
      "Patient trajectory is worsening. " +
      reasons.join("; ") +
      "."
    );
  }

  if (
    trajectory ===
    "improving"
  ) {
    const reasons = [];

    if (riskChange < 0) {
      reasons.push(
        `risk score decreased by ${Math.abs(
          riskChange
        )}`
      );
    }

    if (symptomChange < 0) {
      reasons.push(
        "symptom severity decreased"
      );
    }

    if (
      medicationChange ===
      "improving"
    ) {
      reasons.push(
        "medication adherence improved"
      );
    }

    if (
      reasons.length === 0
    ) {
      reasons.push(
        "recent events indicate improvement"
      );
    }

    return (
      "Patient trajectory is improving. " +
      reasons.join("; ") +
      "."
    );
  }

  return (
    "Patient trajectory appears stable."
  );
};


// ============================================================
// ANALYZE PATIENT TRAJECTORY
// ============================================================

export const analyzePatientTrajectory =
  async (
    patientId,
    {
      eventLimit =
        DEFAULT_EVENT_LIMIT,
    } = {}
  ) => {
    // --------------------------------------------------------
    // Validate patient
    // --------------------------------------------------------

    const patient =
      await Patient.findById(
        patientId
      );

    if (!patient) {
      throw new Error(
        "Patient not found"
      );
    }

    // --------------------------------------------------------
    // Get recent events
    // --------------------------------------------------------

    const events =
      await PatientEvent.find({
        patientId,
      })
        .sort({
          timestamp: -1,
        })
        .limit(eventLimit)
        .lean();

    // --------------------------------------------------------
    // No events
    // --------------------------------------------------------

    if (
      events.length === 0
    ) {
      return {
        trajectory:
          "stable",

        riskScore: 0,

        riskChange: 0,

        confidence: 0,

        reason:
          "No patient events are available for trajectory analysis.",

        eventsAnalyzed: 0,

        latestEventAt:
          null,
      };
    }

    // --------------------------------------------------------
    // Only one event
    // --------------------------------------------------------

    if (
      events.length === 1
    ) {
      const latestEvent =
        events[0];

      const riskScore =
        Number(
          latestEvent.riskScore
        ) || 0;

      return {
        trajectory:
          latestEvent.trajectorySignal ||
          "stable",

        riskScore,

        riskChange: 0,

        confidence: 0.3,

        reason:
          "Only one event is available, so trajectory confidence is limited.",

        eventsAnalyzed: 1,

        latestEventAt:
          latestEvent.timestamp,
      };
    }

    // --------------------------------------------------------
    // Most recent events
    // --------------------------------------------------------

    const latestEvent =
      events[0];

    const previousEvent =
      events[1];

    // --------------------------------------------------------
    // Calculate signals
    // --------------------------------------------------------

    const riskChange =
      calculateRiskChange(
        latestEvent,
        previousEvent
      );

    const symptomChange =
      calculateSymptomChange(
        latestEvent,
        previousEvent
      );

    const newSymptoms =
      detectNewSymptoms(
        latestEvent,
        previousEvent
      );

    const medicationChange =
      calculateMedicationAdherenceChange(
        latestEvent,
        previousEvent
      );

    // --------------------------------------------------------
    // Determine trajectory
    // --------------------------------------------------------

    const trajectory =
      determineTrajectory({
        riskChange,
        symptomChange,
        newSymptomsCount:
          newSymptoms.length,
        medicationChange,
      });

    // --------------------------------------------------------
    // Calculate confidence
    // --------------------------------------------------------

    const confidence =
      calculateConfidence({
        eventsAnalyzed:
          events.length,

        riskChange,

        symptomChange,

        newSymptomsCount:
          newSymptoms.length,

        trajectory,
      });

    // --------------------------------------------------------
    // Build explanation
    // --------------------------------------------------------

    const reason =
      buildReason({
        trajectory,

        riskChange,

        symptomChange,

        newSymptoms,

        medicationChange,
      });

    // --------------------------------------------------------
    // Current risk
    // --------------------------------------------------------

    const riskScore =
      Number(
        latestEvent.riskScore
      ) || 0;

    return {
      trajectory,

      riskScore,

      riskChange,

      confidence,

      reason,

      eventsAnalyzed:
        events.length,

      latestEventAt:
        latestEvent.timestamp,

      signals: {
        symptomChange,

        newSymptoms:
          newSymptoms.map(
            (symptom) =>
              symptom.name
          ),

        medicationChange,
      },
    };
  };


// ============================================================
// UPDATE PATIENT TRAJECTORY
// ============================================================
//
// Persists the calculated trajectory back onto the Patient
// document so dashboards and other services can access the
// latest state without recalculating it.
//
// ============================================================

export const updatePatientTrajectory =
  async (patientId) => {
    const trajectory =
      await analyzePatientTrajectory(
        patientId
      );

    const patient =
      await Patient.findById(
        patientId
      );

    if (!patient) {
      throw new Error(
        "Patient not found"
      );
    }

    patient.trajectoryStatus =
      trajectory.trajectory;

    // --------------------------------------------------------
    // Synchronize current state
    // --------------------------------------------------------

    if (
      trajectory.trajectory ===
      "worsening"
    ) {
      patient.currentState =
        "watch";
    } else if (
      trajectory.trajectory ===
      "improving"
    ) {
      patient.currentState =
        "stable";
    } else {
      patient.currentState =
        "stable";
    }

    await patient.save();

    return {
      patient,

      trajectory,
    };
  };

  // ============================================================
// ANALYZE PATIENT TRAJECTORY
// ============================================================

export const analyzeTrajectory = async (patientId) => {
  const context = await buildPatientContext(patientId);

  if (!context) {
    throw new Error("Unable to build patient context");
  }

  return context.trajectory;
};