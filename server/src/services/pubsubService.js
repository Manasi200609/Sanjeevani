import env from "../config/env.js";

// ============================================================
// PUB/SUB ABSTRACTION
// ============================================================
//
// This service provides an abstraction layer for agent event
// publishing. It supports two modes:
//
// 1. LOCAL MODE (AGENT_EXECUTION_MODE=local):
//    Events are processed synchronously. This is the default
//    for local development.
//
// 2. PUBSUB MODE (AGENT_EXECUTION_MODE=pubsub):
//    Events are published to Google Cloud Pub/Sub topics.
//    This is for production deployment on Cloud Run.
//
// ============================================================

const MODE = env.AGENT_EXECUTION_MODE || "local";

// ============================================================
// TOPIC NAMES
// ============================================================

const TOPICS = {
  AGENT_TRIGGER: "careflow-agent-trigger",
  PATIENT_EVENT: "careflow-patient-event",
  MEMORY_CONSOLIDATION: "careflow-memory-consolidation",
  NOTIFICATION: "careflow-notification",
};

// ============================================================
// LOCAL PROCESSOR
// ============================================================
//
// In local mode, we simply execute the handler synchronously.
// This avoids the need for a Pub/Sub emulator during development.
//

const localHandlers = {};

const processLocal = async (topic, data) => {
  const handler = localHandlers[topic];
  if (handler) {
    try {
      await handler(data);
    } catch (error) {
      console.error(`[PubSub Local] Error processing ${topic}:`, error.message);
    }
  }
};

// ============================================================
// PUBLISH (PUBLIC API)
// ============================================================

export const publishEvent = async (topic, data) => {
  if (MODE === "pubsub") {
    return publishToPubSub(topic, data);
  }

  // Local mode: process synchronously
  return processLocal(topic, data);
};

// ============================================================
// SUBSCRIBE (PUBLIC API)
// ============================================================

export const subscribeToTopic = async (topic, handler) => {
  if (MODE === "pubsub") {
    return subscribePubSub(topic, handler);
  }

  // Local mode: register handler for synchronous processing
  localHandlers[topic] = handler;
  return { success: true, mode: "local", topic };
};

// ============================================================
// PUBLISH TO GOOGLE CLOUD PUB/SUB
// ============================================================

const publishToPubSub = async (topic, data) => {
  try {
    // Dynamic import — only load when in pubsub mode
    const { PubSub } = await import("@google-cloud/pubsub");
    const pubsub = new PubSub({
      projectId: env.GOOGLE_CLOUD_PROJECT || undefined,
    });

    const topicObj = pubsub.topic(topic);
    const message = {
      json: {
        ...data,
        publishedAt: new Date().toISOString(),
        topic,
      },
    };

    const messageId = await topicObj.publishMessage(message);

    console.log(`[PubSub] Published to ${topic}: ${messageId}`);

    return {
      success: true,
      mode: "pubsub",
      topic,
      messageId,
    };
  } catch (error) {
    console.error(`[PubSub] Failed to publish to ${topic}:`, error.message);

    // Fallback to local processing
    console.log(`[PubSub] Falling back to local processing for ${topic}`);
    return processLocal(topic, data);
  }
};

// ============================================================
// SUBSCRIBE TO GOOGLE CLOUD PUB/SUB
// ============================================================

const subscribePubSub = async (topic, handler) => {
  try {
    const { PubSub } = await import("@google-cloud/pubsub");
    const pubsub = new PubSub({
      projectId: env.GOOGLE_CLOUD_PROJECT || undefined,
    });

    const subscriptionName = `careflow-${topic}-sub`;
    let subscription = pubsub.subscription(subscriptionName);

    // Create subscription if it doesn't exist
    const [exists] = await subscription.exists().catch(() => [false]);
    if (!exists) {
      const [sub] = await pubsub.createSubscription(topic, subscriptionName);
      subscription = sub;
    }

    subscription.on("message", async (message) => {
      try {
        const data = JSON.parse(message.data.toString());
        await handler(data);
        message.ack();
      } catch (error) {
        console.error(`[PubSub] Error processing message from ${topic}:`, error.message);
        message.nack();
      }
    });

    console.log(`[PubSub] Subscribed to ${topic} as ${subscriptionName}`);

    return { success: true, mode: "pubsub", topic, subscription: subscriptionName };
  } catch (error) {
    console.error(`[PubSub] Failed to subscribe to ${topic}:`, error.message);

    // Fallback to local
    localHandlers[topic] = handler;
    return { success: true, mode: "local", topic };
  }
};

// ============================================================
// HELPER: PUBLISH AGENT TRIGGER
// ============================================================

export const publishAgentTrigger = async (data) => {
  return publishEvent(TOPICS.AGENT_TRIGGER, {
    type: "agent_trigger",
    ...data,
  });
};

// ============================================================
// HELPER: PUBLISH PATIENT EVENT
// ============================================================

export const publishPatientEvent = async (data) => {
  return publishEvent(TOPICS.PATIENT_EVENT, {
    type: "patient_event",
    ...data,
  });
};

// ============================================================
// HELPER: PUBLISH MEMORY CONSOLIDATION
// ============================================================

export const publishMemoryConsolidation = async (data) => {
  return publishEvent(TOPICS.MEMORY_CONSOLIDATION, {
    type: "memory_consolidation",
    ...data,
  });
};

// ============================================================
// EXPORT TOPICS
// ============================================================

export { TOPICS };
