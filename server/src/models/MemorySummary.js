import mongoose from "mongoose";

// ============================================================
// MEMORY SUMMARY
// ============================================================
//
// A compressed, timestamp-aware summary of a patient's health
// over a specific period. Created by the Memory Consolidation
// Agent on a daily/weekly/monthly cadence.
//
// Raw PatientEvents are NEVER deleted — this model stores
// compressed knowledge that Gemini can reason over quickly
// without scanning hundreds of raw events.
//
// ============================================================

const majorEventSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "moderate", "high", "critical"],
      default: "low",
    },
  },
  { _id: false }
);

const interventionSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    outcome: {
      type: String,
      default: "pending",
    },
  },
  { _id: false }
);

const memorySummarySchema = new mongoose.Schema(
  {
    // ============================================================
    // PATIENT
    // ============================================================

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    // ============================================================
    // TIME PERIOD
    // ============================================================

    periodStart: {
      type: Date,
      required: true,
    },

    periodEnd: {
      type: Date,
      required: true,
    },

    // ============================================================
    // GRANULARITY
    // ============================================================

    granularity: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
      index: true,
    },

    // ============================================================
    // TRAJECTORY OVER THIS PERIOD
    // ============================================================

    trajectory: {
      type: String,
      enum: ["improving", "stable", "worsening", "mixed", "unknown"],
      default: "unknown",
    },

    // ============================================================
    // KEY SIGNALS
    // ============================================================

    keySignals: {
      type: [String],
      default: [],
    },

    // ============================================================
    // MAJOR EVENTS
    // ============================================================

    majorEvents: {
      type: [majorEventSchema],
      default: [],
    },

    // ============================================================
    // INTERVENTIONS
    // ============================================================

    interventions: {
      type: [interventionSchema],
      default: [],
    },

    // ============================================================
    // OUTCOMES
    // ============================================================

    outcomes: {
      type: [String],
      default: [],
    },

    // ============================================================
    // RISK PROGRESSION
    // ============================================================

    riskProgression: {
      startScore: {
        type: Number,
        default: null,
      },
      endScore: {
        type: Number,
        default: null,
      },
      peakScore: {
        type: Number,
        default: null,
      },
      trend: {
        type: String,
        enum: ["improving", "stable", "worsening", "unknown"],
        default: "unknown",
      },
    },

    // ============================================================
    // SYMPTOM TIMELINE
    // ============================================================
    //
    // Timestamp-aware symptom tracking so Gemini can reason
    // about progression over time.
    //
    // Example:
    //   Aug 10: fatigue severity 2
    //   Aug 15: fatigue severity 4
    //   Aug 22: fatigue severity 7
    //   → Inference: fatigue increasing over 12 days
    //

    symptomTimeline: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, required: true },
            dataPoints: {
              type: [
                new mongoose.Schema(
                  {
                    date: { type: Date, required: true },
                    severity: { type: Number, min: 0, max: 10 },
                    status: {
                      type: String,
                      enum: ["new", "improving", "stable", "worsening", "resolved"],
                    },
                  },
                  { _id: false }
                ),
              ],
              default: [],
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    // ============================================================
    // MEDICATION ADHERENCE OVER PERIOD
    // ============================================================

    medicationAdherence: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, required: true },
            dataPoints: {
              type: [
                new mongoose.Schema(
                  {
                    date: { type: Date, required: true },
                    adherence: {
                      type: String,
                      enum: ["good", "partial", "poor", "unknown"],
                    },
                  },
                  { _id: false }
                ),
              ],
              default: [],
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    // ============================================================
    // NATURAL LANGUAGE SUMMARY
    // ============================================================
    //
    // Gemini-generated narrative summary of this period.
    //
    // Example:
    //   "Patient remained stable for 2 weeks. Medication
    //    adherence dropped after August 15. Fatigue
    //    progressively increased. One intervention (increased
    //    follow-up) reduced symptom reporting."
    //

    summary: {
      type: String,
      required: true,
    },

    // ============================================================
    // EVENTS ANALYZED
    // ============================================================

    eventsAnalyzed: {
      type: Number,
      default: 0,
    },

    decisionsAnalyzed: {
      type: Number,
      default: 0,
    },

    // ============================================================
    // SOURCE EVENT REFERENCES
    // ============================================================
    //
    // Links back to raw PatientEvent documents.
    // Raw data is NEVER deleted.
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

    sourceDecisionIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CareDecision",
        },
      ],
      default: [],
    },

    // ============================================================
    // GENERATION METADATA
    // ============================================================

    generatedBy: {
      type: String,
      enum: ["system", "gemini", "scheduled_job"],
      default: "system",
    },

    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    // ============================================================
    // ACTIVE STATE
    // ============================================================

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

memorySummarySchema.index({ patientId: 1, periodEnd: -1 });
memorySummarySchema.index({ patientId: 1, granularity: 1 });
memorySummarySchema.index({ patientId: 1, isActive: 1, periodEnd: -1 });

export default mongoose.model("MemorySummary", memorySummarySchema);
