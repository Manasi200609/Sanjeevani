import mongoose from "mongoose";

const agentEventSchema = new mongoose.Schema(
  {
    // ============================================================
    // EVENT TYPE
    // ============================================================

    eventType: {
      type: String,
      required: true,
      enum: [
        "signal_detected",
        "agent_started",
        "agent_observed",
        "tool_called",
        "agent_reasoned",
        "decision_made",
        "care_plan_updated",
        "asha_notification",
        "patient_message",
        "agent_completed",
        "agent_failed",
        "system_check",
      ],
      index: true,
    },

    // ============================================================
    // PATIENT REFERENCE
    // ============================================================

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      default: null,
      index: true,
    },

    patientName: {
      type: String,
      default: null,
    },

    patientCode: {
      type: String,
      default: null,
    },

    // ============================================================
    // AGENT RUN REFERENCE
    // ============================================================

    agentRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AgentRun",
      default: null,
    },

    // ============================================================
    // EVENT DATA
    // ============================================================

    title: {
      type: String,
      required: true,
    },

    subtitle: {
      type: String,
      default: "",
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ============================================================
    // TIMESTAMP
    // ============================================================

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
agentEventSchema.index({ timestamp: -1 });
agentEventSchema.index({ patientId: 1, timestamp: -1 });

export default mongoose.model("AgentEvent", agentEventSchema);
