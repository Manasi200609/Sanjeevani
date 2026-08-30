import express from "express";
import { processPatientMessage } from "../services/vaidyaService.js";
import {
  transcribeAudio,
  synthesizeSpeech,
  isVoiceConfigured,
} from "../services/sarvamVoiceService.js";
import Patient from "../models/Patient.js";

const router = express.Router();

// ============================================================
// POST /api/vaidya/voice/transcribe
//
// Transcribe audio to text using Sarvam STT.
//
// Request: multipart/form-data
//   - file: audio file (webm, wav, mp4, mp3, ogg)
//   - languageCode: optional, "mr-IN" or "unknown"
//
// Response:
//   { success: true, transcript: "...", languageCode: "mr-IN" }
// ============================================================

router.post("/transcribe", async (req, res) => {
  try {
    if (!isVoiceConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Voice services not configured (SARVAM_API_KEY missing)",
      });
    }

    // Parse multipart form
    // Using express.raw for the file part, fields via multer or manual parsing
    // Since we're not using multer, we'll handle it via a raw body approach
    // For simplicity, accept base64 audio in JSON body as well
    const { audio, mimeType, languageCode } = req.body;

    if (!audio) {
      return res.status(400).json({
        success: false,
        message: "Audio data is required (base64 encoded in JSON body)",
      });
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, "base64");

    // Validate file size (max ~5MB for ~30s audio)
    if (audioBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Audio file too large. Maximum 5MB allowed.",
      });
    }

    const result = await transcribeAudio(audioBuffer, {
      mimeType: mimeType || "audio/webm",
      languageCode: languageCode || "unknown",
    });

    return res.status(200).json({
      success: true,
      transcript: result.transcript,
      languageCode: result.languageCode,
      duration: result.duration,
    });
  } catch (error) {
    console.error("Voice transcribe error:", error);
    return res.status(500).json({
      success: false,
      message: "Voice transcription failed. Please try again.",
    });
  }
});

// ============================================================
// POST /api/vaidya/voice/speak
//
// Convert text to speech using Sarvam TTS.
//
// Request body:
//   { text: "...", languageCode: "mr-IN" }
//
// Response:
//   { success: true, audio: "base64...", mimeType: "audio/wav", languageCode: "mr-IN" }
// ============================================================

router.post("/speak", async (req, res) => {
  try {
    if (!isVoiceConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Voice services not configured (SARVAM_API_KEY missing)",
      });
    }

    const { text, languageCode } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text is required for speech synthesis",
      });
    }

    const result = await synthesizeSpeech({
      text: text.trim(),
      languageCode: languageCode || "en-IN",
    });

    return res.status(200).json({
      success: true,
      audio: result.audio,
      mimeType: result.mimeType,
      languageCode: result.languageCode,
    });
  } catch (error) {
    console.error("Voice speak error:", error);
    return res.status(500).json({
      success: false,
      message: "Voice synthesis failed. Text response is still available.",
    });
  }
});

// ============================================================
// POST /api/vaidya/voice/chat
//
// Combined voice endpoint:
// 1. Transcribe audio to text
// 2. Process through Vaidya (Gemini + Sarvam translation)
// 3. Synthesize response audio
//
// Request body:
//   { patientId: "...", audio: "base64...", mimeType: "audio/webm" }
//
// Response:
//   {
//     success: true,
//     transcript: "patient's words",
//     response: "Vaidya's text response",
//     responseAudio: "base64 audio",
//     languageCode: "mr-IN",
//     eventCreated: boolean,
//   }
// ============================================================

router.post("/voice-chat", async (req, res) => {
  try {
    const { patientId, audio, mimeType } = req.body;
    const _t0 = Date.now();
    const _ts = (label) => console.log(`[VoiceChat] ${label}: ${Date.now() - _t0}ms`);

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "patientId is required",
      });
    }

    if (!audio) {
      return res.status(400).json({
        success: false,
        message: "Audio data is required",
      });
    }

    // Step 1: Transcribe audio
    const audioBuffer = Buffer.from(audio, "base64");
    if (audioBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Audio file too large. Maximum 5MB allowed.",
      });
    }

    const sttResult = await transcribeAudio(audioBuffer, {
      mimeType: mimeType || "audio/webm",
      languageCode: "unknown",
    });
    _ts(`STT (lang: ${sttResult.languageCode})`);

    if (!sttResult.transcript?.trim()) {
      return res.status(200).json({
        success: true,
        transcript: "",
        response:
          "I couldn't understand the recording. Could you try speaking again?",
        responseAudio: null,
        languageCode: sttResult.languageCode,
        eventCreated: false,
      });
    }

    // Step 2: Process through Vaidya
    const chatResult = await processPatientMessage({
      patientId,
      message: sttResult.transcript,
    });
    _ts('Vaidya processing');

    // Step 3: Synthesize response audio
    let responseAudio = null;
    try {
      if (isVoiceConfigured() && chatResult.response) {
        const ttsResult = await synthesizeSpeech({
          text: chatResult.response,
          languageCode: chatResult.language || "en-IN",
        });
        responseAudio = ttsResult.audio;
        _ts(`TTS (audio length: ${responseAudio?.length || 0} chars)`);
      } else {
        _ts('TTS skipped (not configured or no response)');
      }
    } catch (ttsError) {
      console.warn("TTS failed for voice chat response:", ttsError.message);
      _ts('TTS failed');
    }

    _ts('Total voice-chat');

    return res.status(200).json({
      success: true,
      transcript: sttResult.transcript,
      response: chatResult.response,
      responseAudio,
      languageCode: chatResult.language || sttResult.languageCode,
      eventCreated: chatResult.eventCreated,
      agentTriggered: chatResult.agentTriggered,
    });
  } catch (error) {
    console.error("Voice chat error:", error);
    return res.status(500).json({
      success: false,
      message: "Voice chat failed. Please try again.",
    });
  }
});

// ============================================================
// GET /api/vaidya/voice/health
//
// Check if voice services are available.
// ============================================================

router.get("/health", async (req, res) => {
  try {
    const configured = isVoiceConfigured();
    return res.status(200).json({
      success: true,
      configured,
      message: configured
        ? "Voice services are configured"
        : "SARVAM_API_KEY not set",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Voice health check failed",
    });
  }
});

export default router;
