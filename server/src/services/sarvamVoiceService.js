// ============================================================
// SARVAM VOICE SERVICE
// ============================================================
//
// Provides Speech-to-Text (STT) and Text-to-Speech (TTS)
// using the Sarvam AI API.
//
// STT: POST https://api.sarvam.ai/speech-to-text
//   - Model: saaras:v3
//   - Supports: Hindi, Marathi, Bengali, Tamil, Telugu, Kannada,
//     Malayalam, Gujarati, Punjabi, Odia, English
//   - Max ~30 seconds audio
//
// TTS: POST https://api.sarvam.ai/text-to-speech
//   - Model: bulbul:v3
//   - Returns base64 audio
//   - Multiple Indian language voices
//
// Auth: api-subscription-key header (server-side only)
// ============================================================

import env from "../config/env.js";

const SARVAM_BASE_URL = "https://api.sarvam.ai";

// ============================================================
// CHECK IF SARVAM IS CONFIGURED
// ============================================================

export const isVoiceConfigured = () => {
  return Boolean(env.SARVAM_API_KEY && env.SARVAM_API_KEY.length > 0);
};

// ============================================================
// SPEECH-TO-TEXT
// ============================================================

/**
 * Transcribe audio to text using Sarvam STT.
 *
 * @param {Buffer} audioBuffer - Raw audio data
 * @param {object} options
 * @param {string} [options.mimeType] - Audio MIME type (e.g., "audio/webm")
 * @param {string} [options.languageCode] - Language code (e.g., "mr-IN") or "unknown" for auto-detect
 * @returns {Promise<{ transcript: string, languageCode: string, duration: number }>}
 */
export const transcribeAudio = async (audioBuffer, options = {}) => {
  if (!isVoiceConfigured()) {
    throw new Error("SARVAM_API_KEY is not configured for voice services");
  }

  const { mimeType = "audio/webm", languageCode = "unknown" } = options;

  // Build multipart form data
  const formData = new FormData();

  // Determine file extension from MIME type
  const extMap = {
    "audio/webm": "webm",
    "audio/wav": "wav",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
  };
  const ext = extMap[mimeType] || "webm";

  const blob = new Blob([audioBuffer], { type: mimeType });
  formData.append("file", blob, `audio.${ext}`);
  formData.append("model", "saaras:v3");
  formData.append("language_code", languageCode);
  formData.append("mode", "transcribe");

  const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
    method: "POST",
    headers: {
      "api-subscription-key": env.SARVAM_API_KEY,
    },
    body: formData,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Sarvam STT error (${response.status}): ${errorText.slice(0, 200)}`
    );
  }

  const data = await response.json();

  return {
    transcript: data.transcript || "",
    languageCode: data.language_code || languageCode,
    duration: data.duration || 0,
  };
};

// ============================================================
// TEXT-TO-SPEECH
// ============================================================

/**
 * Convert text to speech using Sarvam TTS.
 *
 * @param {object} options
 * @param {string} options.text - Text to synthesize
 * @param {string} [options.languageCode="en-IN"] - Target language code
 * @param {string} [options.speaker="meera"] - Voice speaker (female, healthcare-friendly)
 * @returns {Promise<{ audio: string, mimeType: string, languageCode: string }>}
 */
export const synthesizeSpeech = async (options = {}) => {
  if (!isVoiceConfigured()) {
    throw new Error("SARVAM_API_KEY is not configured for voice services");
  }

  const {
    text,
    languageCode = "en-IN",
    speaker = "simran",
  } = options;

  if (!text?.trim()) {
    throw new Error("Text is required for TTS");
  }

  // Sarvam Bulbul v3 TTS — flat format per v3 API docs
  const requestBody = {
    text: text.slice(0, 2500), // Bulbul v3 max 2500 chars
    language_code: languageCode,
    model: "bulbul:v3",
    speaker,
    speech_sample_rate: 22050,
    output_audio_codec: "wav",
  };

  const response = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": env.SARVAM_API_KEY,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Sarvam TTS error (${response.status}): ${errorText.slice(0, 200)}`
    );
  }

  const data = await response.json();

  // Sarvam returns { audios: ["base64..."] }
  const audioBase64 = data.audios?.[0];

  if (!audioBase64) {
    throw new Error("Sarvam TTS returned no audio data");
  }

  return {
    audio: audioBase64,
    mimeType: "audio/wav",
    languageCode,
  };
};

// ============================================================
// VOICE HEALTH CHECK
// ============================================================

/**
 * Verify Sarvam voice services are accessible.
 */
export const checkVoiceHealth = async () => {
  if (!isVoiceConfigured()) {
    return { stt: false, tts: false, error: "SARVAM_API_KEY not configured" };
  }

  const results = { stt: false, tts: false };

  // Test TTS (no input needed beyond text)
  try {
    const ttsResult = await synthesizeSpeech({
      text: "Hello, I am Vaidya.",
      languageCode: "en-IN",
    });
    results.tts = Boolean(ttsResult.audio);
  } catch (error) {
    results.ttsError = error.message;
  }

  return results;
};
