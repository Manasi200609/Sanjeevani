import mongoose from "mongoose";

const carePlanSchema = new mongoose.Schema(
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
    // PLAN STATUS
    // ==========================================================

    status: {
      type: String,
      enum: [
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      default: "active",
    },

    // ==========================================================
    // FOLLOW-UP
    // ==========================================================

    followUp: {
      required: {
        type: Boolean,
        default: true,
      },

      intervalDays: {
        type: Number,
        min: 1,
        max: 90,
        default: 7,
      },

      nextFollowUpAt: {
        type: Date,
        default: null,
      },
    },

    // ==========================================================
    // CARE PRIORITY
    // ==========================================================

    priority: {
      type: String,
      enum: [
        "normal",
        "elevated",
        "high",
        "urgent",
      ],
      default: "normal",
    },

    // ==========================================================
    // CURRENT CARE STATE
    // ==========================================================

    careState: {
      type: String,
      enum: [
        "stable",
        "watch",
        "urgent",
      ],
      default: "stable",
    },

    // ==========================================================
    // TRAJECTORY
    // ==========================================================

    trajectoryStatus: {
      type: String,
      enum: [
        "stable",
        "improving",
        "worsening",
        "critical",
      ],
      default: "stable",
    },

    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // ==========================================================
    // CARE INSTRUCTIONS
    // ==========================================================

    instructions: {
      type: [String],
      default: [],
    },

    // ==========================================================
    // ASHA WORKER MESSAGE
    // ==========================================================

    ashaMessage: {
      type: String,
      default: "",
    },

    // ==========================================================
    // AI / AGENT REASONING
    // ==========================================================

    reasoning: {
      type: String,
      default: "",
    },

    // ==========================================================
    // SOURCE DECISION
    // ==========================================================

    sourceDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareDecision",
      default: null,
    },

    // ==========================================================
    // PLAN VERSION
    // ==========================================================

    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    // ==========================================================
    // LAST REVIEWED
    // ==========================================================

    lastReviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "CarePlan",
  carePlanSchema
);