import mongoose from "mongoose";

const agentStepSchema = new mongoose.Schema(
  {
    step: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["started", "completed", "failed"],
      default: "started",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const agentRunSchema = new mongoose.Schema(
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
    // WHY DID THE AGENT RUN?
    // ==========================================================

    trigger: {
      type: String,
      enum: [
        "manual",
        "new_visit",
        "patient_event",
        "trajectory_change",
        "scheduled_monitor",
        "follow_up_due",
        "patient_reassessment",
        "memory_consolidation",
        "system",
      ],
      default: "manual",
    },

    // ==========================================================
    // JOB TYPE (for scheduled/pipeline runs)
    // ==========================================================

    jobType: {
      type: String,
      enum: [
        "patient_reassessment",
        "memory_consolidation",
        null,
      ],
      default: null,
    },

    // ==========================================================
    // BATCH INFO (for bulk scheduled runs)
    // ==========================================================

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchedulerEvent",
      default: null,
    },

    batchSize: {
      type: Number,
      default: null,
    },

    batchIndex: {
      type: Number,
      default: null,
    },

    // ==========================================================
    // AGENT STATUS
    // ==========================================================

    status: {
      type: String,
      enum: [
        "running",
        "completed",
        "failed",
      ],
      default: "running",
    },

    // ==========================================================
    // EXECUTION STEPS
    // ==========================================================

    steps: {
      type: [agentStepSchema],
      default: [],
    },

    // ==========================================================
    // AI OUTPUT
    // ==========================================================

    aiAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ==========================================================
    // CARE DECISION
    // ==========================================================

    decisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareDecision",
      default: null,
    },

    // ==========================================================
    // EXECUTED ACTION
    // ==========================================================

    executedAction: {
      type: String,
      default: null,
    },

    // ==========================================================
    // MODEL + FRAMEWORK
    // ==========================================================

    model: {
      type: String,
      default: null,
    },

    framework: {
      type: String,
      default: null,
    },

    // ==========================================================
    // TOOL CALLS
    // ==========================================================

    toolCalls: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, required: true },
            args: { type: mongoose.Schema.Types.Mixed, default: {} },
            result: { type: mongoose.Schema.Types.Mixed, default: {} },
            success: { type: Boolean, default: true },
            timestamp: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    // ==========================================================
    // EXECUTION TIMING
    // ==========================================================

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

    // ==========================================================
    // ERROR INFORMATION
    // ==========================================================

    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "AgentRun",
  agentRunSchema
);