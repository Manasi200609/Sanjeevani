import express from "express";
import Patient from "../models/Patient.js";
import { analyzeTrajectory } from "../services/trajectoryService.js";
import { buildPatientContext } from "../memory/contextBuilder.js";
import { analyzeTrajectoryWithAI } from "../ai/aiProvider.js";
import {
  createCareDecision,
  applyCareDecision,
} from "../services/carePlanner.js";
import {
  runCareFlowAgent,
  getLatestAgentRun,
  getAgentRunHistory,
} from "../agents/orchestrator.js";

const router = express.Router();

router.get(
  "/patients/:patientId/trajectory",
  async (req, res) => {
    try {
      const { patientId } = req.params;

      const patient =
        await Patient.findById(
          patientId
        ).lean();

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }

      const trajectory =
        await analyzeTrajectory(
          patientId
        );

      return res.json({
        success: true,
        patient: {
          id: patient._id,
          patientCode:
            patient.patientCode,
          name: patient.name,
        },
        trajectory,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to analyze patient trajectory",
        error: error.message,
      });
    }
  }
);

router.get(
  "/patients/:patientId/context",
  async (req, res) => {
    try {
      const context =
        await buildPatientContext(
          req.params.patientId
        );

      res.json({
        success: true,
        context,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

router.get(
  "/patients/:patientId/ai-analysis",
  async (req, res) => {
    try {
      const context =
        await buildPatientContext(
          req.params.patientId
        );

      const analysis =
        await analyzeTrajectoryWithAI(
          context
        );

      res.json({
        success: true,
        patient: {
          id: context.patient.id,
          patientCode:
            context.patient.patientCode,
        },
        analysis,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "AI trajectory analysis failed",
        error: error.message,
      });
    }
  }
);

router.post(
  "/patients/:patientId/plan",
  async (req, res) => {
    try {
      const patientId =
        req.params.patientId;

      const context =
        await buildPatientContext(
          patientId
        );

      const analysis =
        await analyzeTrajectoryWithAI(
          context
        );

      const decision =
        await createCareDecision({
          patientId,
          analysis,
          context,
        });

      res.status(201).json({
        success: true,
        message:
          "Care planning agent completed successfully",
        patient: {
          id: context.patient.id,
          patientCode:
            context.patient.patientCode,
        },
        analysis,
        decision,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "Care planning agent failed",
        error: error.message,
      });
    }
  }
);

router.post(
  "/decisions/:decisionId/apply",
  async (req, res) => {
    try {
      const result =
        await applyCareDecision(
          req.params.decisionId
        );

      res.json({
        success: true,
        message:
          "Care decision applied successfully",
        result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

router.post(
  "/patients/:patientId/run",
  async (req, res) => {
    try {
      const result =
        await runCareFlowAgent({
          patientId:
            req.params.patientId,
          trigger:
            req.body?.trigger ||
            "manual",
        });

      res.json({
        success: true,
        message:
          "CareFlow agent completed successfully",
        result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "CareFlow agent failed",
        error: error.message,
      });
    }
  }
);

router.get(
  "/patients/:patientId/runs/latest",
  async (req, res) => {
    try {
      const run =
        await getLatestAgentRun(
          req.params.patientId
        );

      if (!run) {
        return res.status(404).json({
          success: false,
          message:
            "No agent runs found",
        });
      }

      res.json({
        success: true,
        run,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

router.get(
  "/patients/:patientId/runs",
  async (req, res) => {
    try {
      const runs =
        await getAgentRunHistory(
          req.params.patientId,
          Number(req.query.limit || 20)
        );

      res.json({
        success: true,
        count: runs.length,
        runs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============================================================
// GET /api/agent/runs/:runId
// Full replay of a single agent run — returns all tool calls,
// decisions, events, and resulting state.
// ============================================================

router.get(
  "/runs/:runId",
  async (req, res) => {
    try {
      const AgentRun = (await import("../models/AgentRun.js")).default;
      const AgentEvent = (await import("../models/AgentEvent.js")).default;
      const CareDecision = (await import("../models/CareDecision.js")).default;
      const CarePlan = (await import("../models/CarePlan.js")).default;
      const Patient = (await import("../models/Patient.js")).default;

      const run = await AgentRun.findById(req.params.runId)
        .populate("patientId", "name patientCode age location trajectoryStatus priority followUp")
        .populate("decisionId")
        .lean();

      if (!run) {
        return res.status(404).json({
          success: false,
          message: "Agent run not found",
        });
      }

      // Get related AgentEvents for this run
      const agentEvents = await AgentEvent.find({ agentRunId: run._id })
        .sort({ timestamp: 1 })
        .lean();

      // Get the care plan after this run
      const patientId = run.patientId?._id || run.patientId;
      const carePlan = await CarePlan.findOne({ patientId, status: "active" })
        .sort({ version: -1 })
        .lean();

      res.json({
        success: true,
        run: {
          ...run,
          patient: run.patientId,
          decision: run.decisionId,
        },
        agentEvents: agentEvents.map((e) => ({
          eventType: e.eventType,
          title: e.title,
          subtitle: e.subtitle,
          data: e.data,
          timestamp: e.timestamp,
        })),
        carePlan: carePlan ? {
          followUpDays: carePlan.followUp?.intervalDays,
          priority: carePlan.priority,
          careState: carePlan.careState,
          version: carePlan.version,
          lastReviewed: carePlan.lastReviewedAt,
        } : null,
        toolCallTrace: (run.toolCalls || []).map((tc) => ({
          name: tc.name,
          success: tc.success,
          resultSummary: tc.result?.error ? `Error: ${tc.result.error}` : (tc.name.includes("plan") && tc.result?.success ? `${tc.result.previousIntervalDays}d → ${tc.result.newIntervalDays}d` : "OK"),
          timestamp: tc.timestamp,
        })),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;
