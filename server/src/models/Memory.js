import mongoose from "mongoose";

const memorySchema = new mongoose.Schema(
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
    // MEMORY TYPE
    // ==========================================================

    memoryType: {
      type: String,
      enum: [
        "timeline_summary",
        "clinical_pattern",
        "care_history",
        "risk_history",
        "preference",
        "agent_learning",
      ],
      required: true,
    },

    // ==========================================================
    // TIME PERIOD REPRESENTED BY THIS MEMORY
    // ==========================================================

    periodStart: {
      type: Date,
      required: true,
    },

    periodEnd: {
      type: Date,
      required: true,
    },

    // ==========================================================
    // SUMMARY
    // ==========================================================

    summary: {
      type: String,
      required: true,
    },

    // ==========================================================
    // IMPORTANT OBSERVATIONS
    // ==========================================================

    keySignals: {
      type: [String],
      default: [],
    },

    // ==========================================================
    // SYMPTOM HISTORY
    // ==========================================================

    symptomPatterns: {
      type: [
        {
          name: {
            type: String,
          },

          trend: {
            type: String,
            enum: [
              "improving",
              "stable",
              "worsening",
              "new",
              "resolved",
            ],
          },

          severity: {
            type: Number,
            min: 0,
            max: 10,
            default: null,
          },
        },
      ],
      default: [],
    },

    // ==========================================================
    // MEDICATION / ADHERENCE HISTORY
    // ==========================================================

    medicationPatterns: {
      type: [
        {
          medication: {
            type: String,
          },

          adherence: {
            type: String,
            enum: [
              "good",
              "partial",
              "poor",
              "unknown",
            ],
          },

          notes: {
            type: String,
            default: "",
          },
        },
      ],
      default: [],
    },

    // ==========================================================
    // RISK HISTORY
    // ==========================================================

    riskHistory: {
      startingRiskScore: {
        type: Number,
        default: null,
      },

      endingRiskScore: {
        type: Number,
        default: null,
      },

      trend: {
        type: String,
        enum: [
          "improving",
          "stable",
          "worsening",
          "unknown",
        ],
        default: "unknown",
      },
    },

    // ==========================================================
    // CARE HISTORY
    // ==========================================================

    careHistory: {
      decisionsMade: {
        type: Number,
        default: 0,
      },

      followUpChanges: {
        type: Number,
        default: 0,
      },

      lastPriority: {
        type: String,
        default: null,
      },

      lastCareState: {
        type: String,
        default: null,
      },
    },

    // ==========================================================
    // SOURCE EVENTS
    // ==========================================================
    //
    // These are the PatientEvent documents represented
    // by this memory.
    //
    // We don't duplicate the entire events here.
    // We only keep their IDs.
    //

    sourceEventIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PatientEvent",
        },
      ],
      default: [],
    },

    // ==========================================================
    // MEMORY VERSION
    // ==========================================================

    version: {
      type: Number,
      default: 1,
    },

    // ==========================================================
    // ACTIVE MEMORY
    // ==========================================================

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ==========================================================
    // AI GENERATED MEMORY
    // ==========================================================

    generatedBy: {
      type: String,
      enum: [
        "system",
        "groq",
        "gemini",
        "manual",
      ],
      default: "system",
    },

    // ==========================================================
    // CONFIDENCE
    // ==========================================================

    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

memorySchema.index({
  patientId: 1,
  periodEnd: -1,
});

memorySchema.index({
  patientId: 1,
  memoryType: 1,
});

export default mongoose.model(
  "Memory",
  memorySchema
);