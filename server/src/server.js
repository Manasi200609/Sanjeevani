import express from "express";
import cors from "cors";

import env from "./config/env.js";
import connectDB from "./config/db.js";

import patientRoutes from "./routes/patientRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import visitRoutes from "./routes/visitRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import carePlanRoutes from "./routes/carePlanRoutes.js";
import memoryRoutes from "./routes/memoryRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import simulationRoutes from "./routes/simulationRoutes.js";
import vaidyaRoutes from "./routes/vaidyaRoutes.js";
import vaidyaVoiceRoutes from "./routes/vaidyaVoiceRoutes.js";
import agentEventRoutes from "./routes/agentEventRoutes.js";
import demoRoutes from "./routes/demoRoutes.js";

// Pub/Sub agent trigger subscription (for production mode)
import { subscribeToAgentTriggers } from "./services/vaidyaService.js";

const app = express();

app.use(
  cors()
);

app.use(
  express.json({
    limit: "2mb",
  })
);

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "CareFlow",
    message:
      "CareFlow longitudinal care coordination backend is running.",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "CareFlow",
    environment: env.NODE_ENV,
    timestamp: new Date(),
  });
});

app.use(
  "/api/patients",
  patientRoutes
);

app.use(
  "/api/events",
  eventRoutes
);

app.use(
  "/api/visits",
  visitRoutes
);

app.use(
  "/api/agent",
  agentRoutes
);

app.use(
  "/api/care-plans",
  carePlanRoutes
);

app.use(
  "/api/memory",
  memoryRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/simulation",
  simulationRoutes
);

app.use(
  "/api/vaidya",
  vaidyaRoutes
);

app.use(
  "/api/vaidya/voice",
  vaidyaVoiceRoutes
);

app.use(
  "/api/agent/events",
  agentEventRoutes
);

app.use(
  "/api/demo",
  demoRoutes
);

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        `Route not found: ${req.method} ${req.originalUrl}`,
    });
  }
);

app.use(
  (error, req, res, next) => {
    console.error(
      "Unhandled server error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Internal server error",
      error:
        env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
);

const startServer = async () => {
  await connectDB();

  // Subscribe to Pub/Sub agent triggers (only active in pubsub mode)
  try {
    await subscribeToAgentTriggers();
  } catch (err) {
    // Not critical in local mode
    console.log(`[PubSub] Subscription not active: ${err.message || "local mode"}`);
  }

  app.listen(
    env.PORT,
    () => {
      console.log(
        `CareFlow server running on http://localhost:${env.PORT}`
      );
      console.log(
        `Agent execution mode: ${env.AGENT_EXECUTION_MODE}`
      );
      console.log(
        `AI provider: ${env.AI_PROVIDER} (${env.GEMINI_MODEL})`
      );
    }
  );
};

startServer();

export default app;
