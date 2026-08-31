// ============================================================
// CLOUD RUN JOB RUNNER
// ============================================================
//
// This is the standalone entry point for Cloud Run Jobs.
// It connects to MongoDB, subscribes to Pub/Sub topics,
// and executes the appropriate agent when a message arrives.
//
// Usage:
//   node src/jobs/runner.js
//
// Environment variables required:
//   MONGO_URI — MongoDB connection string
//   GEMINI_API_KEY — Gemini API key
//   GOOGLE_CLOUD_PROJECT — GCP project ID
//   AGENT_EXECUTION_MODE — "local" or "pubsub"
//   JOB_TYPE — "patient_reassessment" or "memory_consolidation"
//              (if set, runs once and exits — used for Cloud Run Jobs)
//
// When JOB_TYPE is set, the runner executes the job once and exits.
// When JOB_TYPE is not set, the runner subscribes to Pub/Sub and
// processes messages continuously (used for Cloud Run Service).
//
// ============================================================

import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db.js";
import env from "../config/env.js";

// ============================================================
// LOGGING
// ============================================================

const log = (msg) => console.log(`[JobRunner] ${msg}`);
const logError = (msg, err) => console.error(`[JobRunner] ❌ ${msg}`, err?.message || err);

// ============================================================
// JOB HANDLERS
// ============================================================

const JOB_HANDLERS = {
  patient_reassessment: async () => {
    const { runPatientReassessmentBatch } = await import("./patientReassessmentAgent.js");
    return runPatientReassessmentBatch();
  },

  memory_consolidation: async (payload) => {
    const { runMemoryConsolidationBatch } = await import("./memoryConsolidationAgent.js");
    const granularity = payload?.granularity || "daily";
    return runMemoryConsolidationBatch({ granularity });
  },
};

// ============================================================
// PROCESS A SINGLE PUB/SUB MESSAGE
// ============================================================

const processMessage = async (message) => {
  let data;
  try {
    data = JSON.parse(message.data.toString());
  } catch {
    logError("Failed to parse Pub/Sub message data");
    message.nack();
    return;
  }

  const jobType = data.jobType || data.type || data.action;

  log(`Received message: jobType=${jobType}, topic=${data.topic || "unknown"}`);

  const handler = JOB_HANDLERS[jobType];
  if (!handler) {
    logError(`Unknown job type: ${jobType}`);
    message.ack(); // Acknowledge unknown messages to prevent retries
    return;
  }

  try {
    const result = await handler(data);
    log(`Job ${jobType} completed successfully`);
    message.ack();
    return result;
  } catch (error) {
    logError(`Job ${jobType} failed`, error);
    message.nack(); // Nack to allow retry
    throw error;
  }
};

// ============================================================
// ONE-SHOT MODE (Cloud Run Job)
// ============================================================
//
// When triggered by Cloud Scheduler → Pub/Sub → Cloud Run Job,
// the job receives a single message and processes it.
//
// Alternatively, if JOB_TYPE env var is set, we run that job
// directly (useful for manual testing or scheduled triggers
// that pass the job type as an env var).
//

const runOneShot = async (jobType) => {
  log(`One-shot mode: running ${jobType}`);

  const handler = JOB_HANDLERS[jobType];
  if (!handler) {
    throw new Error(`Unknown job type: ${jobType}`);
  }

  const result = await handler({});
  log(`One-shot ${jobType} completed`);
  return result;
};

// ============================================================
// SUBSCRIPTION MODE (Cloud Run Service)
// ============================================================
//
// Subscribes to Pub/Sub topics and processes messages
// continuously. Used when AGENT_EXECUTION_MODE=pubsub.
//

const runSubscription = async () => {
  log("Starting Pub/Sub subscription mode...");

  const { PubSub } = await import("@google-cloud/pubsub");
  const pubsub = new PubSub({
    projectId: env.GOOGLE_CLOUD_PROJECT || undefined,
  });

  const subscriptions = [
    {
      topic: "careflow-patient-reassessment",
      subscription: "careflow-reassessment-job-sub",
      handler: async (data) => processMessage({ data, topic: "patient-reassessment" }),
    },
    {
      topic: "careflow-memory-consolidation",
      subscription: "careflow-memory-consolidation-job-sub",
      handler: async (data) => processMessage({ data, topic: "memory-consolidation" }),
    },
  ];

  for (const sub of subscriptions) {
    try {
      // Create subscription if it doesn't exist
      const [exists] = await pubsub.subscription(sub.subscription).exists().catch(() => [false]);
      if (!exists) {
        await pubsub.createSubscription(sub.topic, sub.subscription);
        log(`Created subscription: ${sub.subscription}`);
      }

      const subscription = pubsub.subscription(sub.subscription);

      subscription.on("message", async (message) => {
        try {
          const data = JSON.parse(message.data.toString());
          await sub.handler({ data, topic: sub.topic });
          message.ack();
        } catch (error) {
          logError(`Error processing message from ${sub.topic}`, error);
          message.nack();
        }
      });

      subscription.on("error", (error) => {
        logError(`Subscription ${sub.subscription} error`, error);
      });

      log(`Subscribed to: ${sub.subscription}`);
    } catch (error) {
      logError(`Failed to subscribe to ${sub.subscription}`, error);
    }
  }

  log("Job runner listening for Pub/Sub messages...");
  log("Press Ctrl+C to stop.");

  // Keep the process alive
  process.on("SIGTERM", () => {
    log("Received SIGTERM, shutting down...");
    process.exit(0);
  });
};

// ============================================================
// MAIN
// ============================================================

const main = async () => {
  log("Starting CareFlow Job Runner...");
  log(`Mode: ${env.AGENT_EXECUTION_MODE}`);
  log(`Job type: ${process.env.JOB_TYPE || "subscription"}`);

  // Connect to MongoDB
  await connectDB();
  log("Connected to MongoDB");

  // Determine mode
  const jobType = process.env.JOB_TYPE;

  if (jobType) {
    // One-shot mode: run the specified job and exit
    try {
      const result = await runOneShot(jobType);
      log("One-shot job completed successfully");
      log(`Result: ${JSON.stringify(result).slice(0, 500)}`);
      process.exit(0);
    } catch (error) {
      logError("One-shot job failed", error);
      process.exit(1);
    }
  } else {
    // Subscription mode: listen for Pub/Sub messages
    try {
      await runSubscription();
    } catch (error) {
      logError("Subscription mode failed", error);
      process.exit(1);
    }
  }
};

main();
