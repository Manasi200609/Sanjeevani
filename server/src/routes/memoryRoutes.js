import express from "express";
import {
  getPatientMemories,
  createMemory,
  searchMemories,
  getMemoryById,
  updateMemory,
  deleteMemory,
  buildMemoryContext,
} from "../services/memoryService.js";
import {
  consolidateRecentMemory,
} from "../memory/memoryConsolidation.js";

const router = express.Router();

router.get("/:patientId", async (req, res) => {
  try {
    const memories =
      await getPatientMemories(
        req.params.patientId,
        {
          limit:
            Number(req.query.limit || 20),
          type:
            req.query.type,
        }
      );

    res.json({
      success: true,
      count: memories.length,
      memories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/:patientId/context", async (req, res) => {
  try {
    const context =
      await buildMemoryContext(
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
});

router.get("/:patientId/search", async (req, res) => {
  try {
    const memories =
      await searchMemories({
        patientId:
          req.params.patientId,
        query:
          req.query.q,
        limit:
          Number(req.query.limit || 10),
      });

    res.json({
      success: true,
      count: memories.length,
      memories,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const memory =
      await createMemory(req.body);

    res.status(201).json({
      success: true,
      memory,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.post(
  "/:patientId/consolidate",
  async (req, res) => {
    try {
      const result =
        await consolidateRecentMemory(
          req.params.patientId
        );

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

router.get("/item/:memoryId", async (req, res) => {
  try {
    const memory =
      await getMemoryById(
        req.params.memoryId
      );

    res.json({
      success: true,
      memory,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
});

router.patch("/item/:memoryId", async (req, res) => {
  try {
    const memory =
      await updateMemory(
        req.params.memoryId,
        req.body
      );

    res.json({
      success: true,
      memory,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.delete("/item/:memoryId", async (req, res) => {
  try {
    await deleteMemory(
      req.params.memoryId
    );

    res.json({
      success: true,
      message: "Memory deleted successfully",
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
