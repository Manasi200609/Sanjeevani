import express from "express";
import { processPatientMessage } from "../services/vaidyaService.js";

const router = express.Router();

// ============================================================
// POST /api/vaidya/chat
//
// Send a patient message to Vaidya.
// Vaidya uses Gemini to:
// 1. Generate a conversational response
// 2. Extract structured health information
// 3. Create a PatientEvent if meaningful health data detected
//
// Request body:
//   { patientId: string, message: string }
//
// Response:
//   {
//     success: true,
//     response: "Vaidya's conversational reply",
//     eventCreated: boolean,
//     event: { id, type, timestamp } | null
//   }
// ============================================================

router.post("/chat", async (req, res) => {
  try {
    const { patientId, message } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "patientId is required",
      });
    }

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "message is required",
      });
    }

    const result = await processPatientMessage({
      patientId,
      message: message.trim(),
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Vaidya chat error:", error);

    // Determine appropriate status code
    const status =
      error.message === "Patient not found" ? 404 : 500;

    return res.status(status).json({
      success: false,
      message: error.message || "Vaidya processing failed",
    });
  }
});

export default router;
