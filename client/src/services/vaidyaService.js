import api from "./api";

// ============================================================
// VAIDYA SERVICE
// ============================================================
//
// Handles communication between the patient chat UI
// and the backend Vaidya service.
//
// The backend handles:
// 1. Language detection / translation via Sarvam
// 2. Knowledge-base retrieval
// 3. Sarvam LLM response generation
// 4. Structured health-data extraction
// 5. PatientEvent creation
// 6. Sanjeevani agent triggering
//
// This service only handles the HTTP layer.
// ============================================================

/**
 * Send a text message to Vaidya and receive a response.
 *
 * @param {string} patientId - The patient's MongoDB ID
 * @param {string} message - The patient's message text
 *
 * @returns {Promise<{
 *   response: string,
 *   eventCreated: boolean,
 *   event: object|null,
 *   agentTriggered: boolean,
 *   language: string,
 *   sarvamUsed: boolean,
 *   knowledgeBaseUsed: boolean
 * }>}
 */
export const sendVaidyaMessage = async (
  patientId,
  message
) => {
  const result = await api.post(
  "/vaidya/chat",
  {
    patientId,
    message,
  },
  { timeout: 60000 }
);

return result.data;
};

// ============================================================
// VOICE SERVICES
// ============================================================

/**
 * Send audio for transcription via Sarvam STT.
 *
 * @param {string} audioBase64 - Base64-encoded audio data
 * @param {string} mimeType - Audio MIME type
 * @param {string} languageCode - Language code or "unknown"
 *
 * @returns {Promise<{
 *   transcript: string,
 *   languageCode: string
 * }>}
 */
export const transcribeVoice = async (
  audioBase64,
  mimeType = "audio/webm",
  languageCode = "unknown"
) => {
  const result = await api.post(
    "/vaidya/voice/transcribe",
    {
      audio: audioBase64,
      mimeType,
      languageCode,
    },
    { timeout: 45000 }
  );

  return result.data;
};

/**
 * Convert text to speech via Sarvam TTS.
 *
 * @param {string} text - Text to synthesize
 * @param {string} languageCode - Sarvam language code
 *
 * @returns {Promise<{
 *   audio: string,
 *   mimeType: string
 * }>}
 */
export const synthesizeSpeech = async (
  text,
  languageCode = "en-IN"
) => {
  const result = await api.post(
    "/vaidya/voice/speak",
    {
      text,
      languageCode,
    },
    { timeout: 45000 }
  );

  return result.data;
};

/**
 * Send a complete voice message to Vaidya.
 *
 * Backend flow:
 *
 * Audio
 *   ↓
 * Sarvam STT
 *   ↓
 * Language detection
 *   ↓
 * Vaidya LLM
 *   ↓
 * Structured health analysis
 *   ↓
 * PatientEvent
 *   ↓
 * Sanjeevani trigger
 *   ↓
 * Sarvam TTS
 *
 * @param {string} patientId - Patient ID
 * @param {string} audioBase64 - Base64-encoded audio
 * @param {string} mimeType - Audio MIME type
 *
 * @returns {Promise<{
 *   transcript: string,
 *   response: string,
 *   responseAudio: string|null,
 *   languageCode: string,
 *   eventCreated?: boolean,
 *   event?: object|null,
 *   agentTriggered?: boolean
 * }>}
 */
export const sendVoiceMessage = async (
  patientId,
  audioBase64,
  mimeType = "audio/webm"
) => {
  const result = await api.post(
    "/vaidya/voice/voice-chat",
    {
      patientId,
      audio: audioBase64,
      mimeType,
    },
    { timeout: 90000 }
  );

  return result.data;
};

/**
 * Check whether Vaidya voice services are available.
 *
 * @returns {Promise<object>}
 */
export const checkVoiceHealth = async () => {
  const result = await api.get("/vaidya/voice/health");
  return result.data;
};