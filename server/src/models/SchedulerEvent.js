import mongoose from "mongoose";

// ============================================================
// SCHEDULER EVENT
// ============================================================
//
// Tracks every scheduled agent execution trigger.
// Used for auditing which Cloud Scheduler jobs fired,
// which patients were selected, and what happened.
//
// ============================================================

const schedulerEventSchema = new mongoose.Schema(
  {
    // ============================================================
    // JOB TYPE
    // ============================================================

    jobType: {
      type: String,
      enum: [
        "patient_reassessment",
        "memory_consolidation",
        "follow_up_monitor",
      ],
      required: true,
      index: true,
    },

    // ============================================================
    // TRIGGER SOURCE
    // ============================================================

    triggerSource: {
      type: String,
      enum: ["cloud_scheduler", "pubsub", "manual", "api"],
      default: "cloud_scheduler",
    },

    // ============================================================
    // PUB/SUB MESSAGE ID
    // ============================================================

    pubsubMessageId: {
      type: String,
      default: null,
    },

    // ============================================================
    // STATUS
    // ============================================================

    status: {
      type: String,
      enum: ["triggered", "processing", "completed", "failed"],
      default: "triggered",
    },

    // ============================================================
    // PATIENTS AFFECTED
    // ============================================================

    patientsSelected: {
      type: Number,
      default: 0,
    },

    patientsProcessed: {
      type: Number,
      default: 0,
    },

    patientsFailed: {
      type: Number,
      default: 0,
    },

    // ============================================================
    // RESULTS SUMMARY
    // ============================================================

    results: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ============================================================
    // ERROR
    // ============================================================

    error: {
      type: String,
      default: null,
    },

    // ============================================================
    // TIMING
    // ============================================================

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    durationMs: {
      type: Number,
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

schedulerEventSchema.index({ jobType: 1, createdAt: -1 });
schedulerEventSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("SchedulerEvent", schedulerEventSchema);
