import mongoose from "mongoose";

const careDecisionSchema = new mongoose.Schema(
  {
    // ==========================================================
    // PATIENT
    // ==========================================================

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    // ==========================================================
    // AGENT RUN
    // ==========================================================

    agentRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AgentRun",
      default: null,
    },

    // ==========================================================
    // DECISION
    // ==========================================================

    decisionType: {
      type: String,
      enum: [
        "maintain_followup",
        "increase_followup",
        "urgent_review",
        "escalate",
      ],
      required: true,
    },

    riskLevel: {
      type: String,
      enum: [
        "low",
        "moderate",
        "high",
        "critical",
      ],
      required: true,
    },

    priority: {
      type: String,
      enum: [
        "normal",
        "elevated",
        "high",
        "urgent",
      ],
      required: true,
    },

    // ==========================================================
    // FOLLOW-UP
    // ==========================================================

    previousFollowUpIntervalDays: {
      type: Number,
      default: null,
    },

    recommendedFollowUpIntervalDays: {
      type: Number,
      default: null,
    },

    // ==========================================================
    // REASONING
    // ==========================================================

    assessment: {
      type: String,
      required: true,
    },

    keySignals: {
      type: [String],
      default: [],
    },

    reasoning: {
      type: String,
      required: true,
    },

    // ==========================================================
    // ASHA COMMUNICATION
    // ==========================================================

    ashaMessage: {
      type: String,
      default: "",
    },

    // ==========================================================
    // EXECUTION
    // ==========================================================

    status: {
      type: String,
      enum: [
        "proposed",
        "applied",
        "rejected",
        "superseded",
      ],
      default: "proposed",
    },

    executedAt: {
      type: Date,
      default: null,
    },

    // ==========================================================
    // CONTEXT SNAPSHOT
    // ==========================================================

    contextSnapshot: {
      riskScore: {
        type: Number,
        default: null,
      },

      previousRiskScore: {
        type: Number,
        default: null,
      },

      riskChange: {
        type: Number,
        default: null,
      },

      trajectory: {
        type: String,
        default: null,
      },

      confidence: {
        type: Number,
        default: null,
      },

      eventsAnalyzed: {
        type: Number,
        default: null,
      },

      trajectoryChange: {
        type: String,
        default: null,
      },

      activeSymptomCount: {
        type: Number,
        default: null,
      },

      medicationAdherence: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

const CareDecision = mongoose.model(
  "CareDecision",
  careDecisionSchema
);

export default CareDecision;