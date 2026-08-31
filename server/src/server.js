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
import schedulerRoutes from "./routes/schedulerRoutes.js";

// Pub/Sub agent trigger subscription (for production mode)
import { subscribeToAgentTriggers } from "./services/vaidyaService.js";

const app = express();

// ── CORS ──────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5000",
  "https://sanjeevani-murex.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    maxAge: 86400,
  })
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
  "/api/scheduler",
  schedulerRoutes
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

    // Ensure CORS headers are present even on error responses.
    // This prevents the browser from hiding the real error behind CORS.
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

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

// Prevent unhandled promise rejections from crashing silently.
// This ensures the browser gets a response (with CORS headers) instead of
// a network error caused by a killed process.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

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
