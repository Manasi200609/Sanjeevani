import mongoose from "mongoose";

const patientEventSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      enum: [
        "visit",
        "symptom_update",
        "vital_update",
        "medication_update",
        "follow_up",
        "risk_change",
        "agent_decision",
        "other",
      ],
    },

    source: {
      type: String,
      enum: ["asha_worker", "patient", "agent", "system"],
      default: "asha_worker",
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    symptoms: [
      {
        name: {
          type: String,
          trim: true,
        },

        severity: {
          type: Number,
          min: 0,
          max: 10,
        },

        status: {
          type: String,
          enum: ["new", "improving", "stable", "worsening", "resolved"],
        },
      },
    ],

    vitals: {
      temperature: {
        type: Number,
      },

      heartRate: {
        type: Number,
      },

      systolicBP: {
        type: Number,
      },

      diastolicBP: {
        type: Number,
      },

      oxygenSaturation: {
        type: Number,
      },

      weight: {
        type: Number,
      },
    },

    medications: [
      {
        name: {
          type: String,
          trim: true,
        },

        adherence: {
          type: String,
          enum: ["good", "partial", "poor", "unknown"],
          default: "unknown",
        },

        notes: {
          type: String,
          trim: true,
        },
      },
    ],

    notes: {
      type: String,
      trim: true,
    },

    severity: {
      type: String,
      enum: ["low", "moderate", "high", "critical"],
      default: "low",
    },

    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    trajectorySignal: {
      type: String,
      enum: [
        "improving",
        "stable",
        "worsening",
        "unknown",
      ],
      default: "unknown",
    },

    aiAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PatientEvent = mongoose.model(
  "PatientEvent",
  patientEventSchema
);

export default PatientEvent;