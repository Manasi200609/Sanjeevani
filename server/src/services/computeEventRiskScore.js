// ============================================================
// EVENT RISK SCORE COMPUTATION
// ============================================================
//
// Shared deterministic risk scoring for PatientEvents.
//
// Used by:
// - Vaidya (patient chat events)
// - Record Visit (ASHA-recorded events)
// - Demo scenarios (seeded events)
//
// This score is NOT a clinical risk score.
// It is an internal prioritization signal for the CareFlow agent.
//
// Score ranges:
//   0-25  = low
//  26-50  = moderate
//  51-75  = high
//  76-100 = critical
//
// ============================================================

// ============================================================
// SYMPTOM RISK CONTRIBUTION
// ============================================================

const SYMPTOM_WEIGHTS = {
  // High-impact symptoms
  dizziness: 8,
  chest_pain: 15,
  breathing_difficulty: 12,
  fainting: 15,
  severe_bleeding: 15,
  "severe headache": 10,
  confusion: 12,

  // Common tracked symptoms
  fatigue: 4,
  headache: 3,
  nausea: 4,
  pain: 5,
  "joint pain": 3,
  "muscle pain": 3,
  cough: 2,
  fever: 5,
  "body ache": 3,
  weakness: 4,
  anxiety: 3,
  depression: 4,
  insomnia: 3,
  "loss of appetite": 4,
  vomiting: 6,
  "abdominal pain": 5,
  "back pain": 3,
  "skin rash": 2,
  "eye problems": 3,
  "urinary problems": 4,
};

const SEVERITY_MULTIPLIER = {
  // severity 1-3 = mild → 1x
  // severity 4-6 = moderate → 1.5x
  // severity 7-9 = severe → 2.5x
  // severity 10 = extreme → 3.5x
};

const getSeverityMultiplier = (severity) => {
  const s = Number(severity) || 3;
  if (s <= 3) return 1.0;
  if (s <= 6) return 1.5;
  if (s <= 9) return 2.5;
  return 3.5;
};

const SYMPTOM_STATUS_BONUS = {
  new: 4,
  worsening: 5,
  stable: 0,
  improving: -2,
  resolved: -1,
};

// ============================================================
// VITALS RISK CONTRIBUTION
// ============================================================

const computeVitalsRisk = (vitals) => {
  if (!vitals || typeof vitals !== "object") return 0;

  let risk = 0;

  // Blood pressure
  const systolic = Number(vitals.systolicBP) || 0;
  const diastolic = Number(vitals.diastolicBP) || 0;

  if (systolic >= 180 || diastolic >= 120) {
    risk += 20; // hypertensive crisis
  } else if (systolic >= 140 || diastolic >= 90) {
    risk += 8; // hypertension
  } else if (systolic >= 130 || diastolic >= 85) {
    risk += 4; // elevated
  } else if (systolic < 90 || diastolic < 60) {
    risk += 10; // hypotension
  }

  // Heart rate
  const hr = Number(vitals.heartRate) || 0;
  if (hr > 0) {
    if (hr > 120 || hr < 40) {
      risk += 12;
    } else if (hr > 100 || hr < 50) {
      risk += 5;
    } else if (hr > 90) {
      risk += 2;
    }
  }

  // SpO2
  const spo2 = Number(vitals.oxygenSaturation) || 0;
  if (spo2 > 0) {
    if (spo2 < 90) {
      risk += 15;
    } else if (spo2 < 94) {
      risk += 8;
    } else if (spo2 < 96) {
      risk += 3;
    }
  }

  // Temperature
  const temp = Number(vitals.temperature) || 0;
  if (temp > 0) {
    if (temp >= 40 || temp < 35) {
      risk += 12;
    } else if (temp >= 38.5) {
      risk += 5;
    } else if (temp >= 37.5) {
      risk += 2;
    }
  }

  return risk;
};

// ============================================================
// MEDICATION ADHERENCE RISK
// ============================================================

const MEDICATION_RISK = {
  good: 0,
  partial: 5,
  poor: 10,
  unknown: 2,
};

// ============================================================
// COMPUTE RISK SCORE FROM EVENT DATA
// ============================================================

export const computeEventRiskScore = ({ symptoms = [], vitals = {}, medications = [], severity = "low" } = {}) => {
  let score = 0;

  // Base severity contribution
  const severityBase = {
    low: 2,
    moderate: 8,
    high: 18,
    critical: 30,
  };
  score += severityBase[severity] || 2;

  // Symptom contribution
  for (const symptom of symptoms) {
    if (!symptom?.name) continue;

    const name = symptom.name.toLowerCase().trim();
    const baseWeight = SYMPTOM_WEIGHTS[name] || 4; // default 4 for unknown symptoms
    const severityMult = getSeverityMultiplier(symptom.severity);
    const statusBonus = SYMPTOM_STATUS_BONUS[symptom.status] || 0;

    score += Math.round(baseWeight * severityMult + statusBonus);
  }

  // Vitals contribution
  score += computeVitalsRisk(vitals);

  // Medication contribution
  for (const med of medications) {
    if (med?.adherence && MEDICATION_RISK[med.adherence] !== undefined) {
      score += MEDICATION_RISK[med.adherence];
    }
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
};

// ============================================================
// COMPUTE TRAJECTORY SIGNAL FROM SYMPTOMS
// ============================================================

export const computeTrajectorySignal = ({ symptoms = [] } = {}) => {
  if (!symptoms.length) return "stable";

  let worseningCount = 0;
  let improvingCount = 0;
  let newCount = 0;

  for (const symptom of symptoms) {
    switch (symptom.status) {
      case "worsening":
        worseningCount++;
        break;
      case "new":
        newCount++;
        break;
      case "improving":
        improvingCount++;
        break;
    }
  }

  // New symptoms + worsening → worsening
  if (worseningCount > 0 || newCount > 0) {
    return "worsening";
  }

  if (improvingCount > 0 && worseningCount === 0) {
    return "improving";
  }

  return "stable";
};

// ============================================================
// RISK LEVEL FROM SCORE
// ============================================================

export const getRiskLevel = (score) => {
  if (score >= 76) return "critical";
  if (score >= 51) return "high";
  if (score >= 26) return "moderate";
  return "low";
};

export default computeEventRiskScore;
