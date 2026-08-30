// ============================================================
// SARVAM AI TRANSLATION SERVICE
// ============================================================
//
// Translates text between English and Indian languages using
// Sarvam AI's Mayura translation model.
//
// Used by Vaidya to:
// 1. Detect patient's input language
// 2. Translate patient message to English for Gemini
// 3. Translate Gemini's response back to patient's language
//
// API: POST https://api.sarvam.ai/translate
// Auth: api-subscription-key header
// ============================================================

import env from "../config/env.js";

const SARVAM_API_URL = "https://api.sarvam.ai/translate";

// ============================================================
// LANGUAGE CODE MAPPING
// ============================================================
// Maps common language names to Sarvam language codes.

const LANGUAGE_CODE_MAP = {
  hindi: "hi-IN",
  marathi: "mr-IN",
  bengali: "bn-IN",
  tamil: "ta-IN",
  telugu: "te-IN",
  kannada: "kn-IN",
  malayalam: "ml-IN",
  gujarati: "gu-IN",
  punjabi: "pa-IN",
  odia: "od-IN",
  odia: "od-IN",
  assamese: "as-IN",
  english: "en-IN",
  // Also accept codes directly
  "hi-IN": "hi-IN",
  "mr-IN": "mr-IN",
  "bn-IN": "bn-IN",
  "ta-IN": "ta-IN",
  "te-IN": "te-IN",
  "kn-IN": "kn-IN",
  "ml-IN": "ml-IN",
  "gu-IN": "gu-IN",
  "pa-IN": "pa-IN",
  "od-IN": "od-IN",
  "as-IN": "as-IN",
  "en-IN": "en-IN",
};

// Languages where auto-detect works well
const AUTO_DETECT_LANGUAGES = [
  "hi-IN",
  "mr-IN",
  "bn-IN",
  "ta-IN",
  "te-IN",
  "kn-IN",
  "ml-IN",
  "gu-IN",
  "pa-IN",
  "od-IN",
  "en-IN",
];

// ============================================================
// CHECK IF SARVAM IS CONFIGURED
// ============================================================

export const isSarvamConfigured = () => {
  return Boolean(env.SARVAM_API_KEY && env.SARVAM_API_KEY.length > 0);
};

// ============================================================
// NORMALIZE LANGUAGE CODE
// ============================================================

export const normalizeLanguageCode = (lang) => {
  if (!lang) return null;
  const lower = String(lang).trim().toLowerCase();
  return LANGUAGE_CODE_MAP[lower] || LANGUAGE_CODE_MAP[lang] || null;
};

// ============================================================
// TRANSLATE TEXT
// ============================================================

/**
 * Translate text between languages using Sarvam AI.
 *
 * @param {object} options
 * @param {string} options.input - Text to translate
 * @param {string} [options.sourceLanguageCode] - Source language code (e.g. "hi-IN"). Use "auto" for detection.
 * @param {string} options.targetLanguageCode - Target language code (e.g. "en-IN")
 * @param {string} [options.mode] - "formal" | "modern-colloquial" | "classic-colloquial" | "code-mixed"
 * @param {string} [options.model] - "mayura:v1" | "sarvam-translate:v1"
 * @returns {Promise<{ translatedText: string, sourceLanguageCode: string }>}
 */
export const translateText = async ({
  input,
  sourceLanguageCode = "auto",
  targetLanguageCode = "en-IN",
  mode = "modern-colloquial",
  model = "mayura:v1",
}) => {
  if (!isSarvamConfigured()) {
    throw new Error("SARVAM_API_KEY is not configured");
  }

  if (!input?.trim()) {
    throw new Error("Input text is required for translation");
  }

  const requestBody = {
    input: input.trim(),
    source_language_code: sourceLanguageCode,
    target_language_code: targetLanguageCode,
    mode,
    model,
  };

  try {
    const response = await fetch(SARVAM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": env.SARVAM_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Sarvam API error (${response.status}): ${errorText.slice(0, 200)}`
      );
    }

    const data = await response.json();

    return {
      translatedText: data.translated_text || "",
      sourceLanguageCode: data.source_language_code || sourceLanguageCode,
    };
  } catch (error) {
    if (error.message.includes("Sarvam API error")) {
      throw error;
    }
    throw new Error(`Sarvam translation failed: ${error.message}`);
  }
};

// ============================================================
// DETECT LANGUAGE
// ============================================================

/**
 * Detect the language of input text using Sarvam's auto-detect.
 *
 * @param {string} text - Text to detect language for
 * @returns {Promise<{ languageCode: string, detected: boolean }>}
 */
export const detectLanguage = async (text) => {
  if (!isSarvamConfigured()) {
    return { languageCode: "en-IN", detected: false };
  }

  try {
    // Use auto-detect by translating to English and seeing what source was detected
    const result = await translateText({
      input: text,
      sourceLanguageCode: "auto",
      targetLanguageCode: "en-IN",
    });

    return {
      languageCode: result.sourceLanguageCode || "en-IN",
      detected: true,
    };
  } catch (error) {
    console.warn("Language detection failed, defaulting to English:", error.message);
    return { languageCode: "en-IN", detected: false };
  }
};

// ============================================================
// TRANSLATE PATIENT MESSAGE TO ENGLISH
// ============================================================

/**
 * Translate a patient message to English for Gemini processing.
 * If the message is already in English, returns it unchanged.
 *
 * @param {string} message - Patient's message
 * @param {string} [preferredLanguage] - Patient's preferred language from profile
 * @returns {Promise<{ translatedMessage: string, originalLanguage: string, wasTranslated: boolean }>}
 */
export const translatePatientMessage = async (message, preferredLanguage) => {
  if (!message?.trim()) {
    return { translatedMessage: message, originalLanguage: "en-IN", wasTranslated: false };
  }

  // If Sarvam is not configured, return as-is
  if (!isSarvamConfigured()) {
    return { translatedMessage: message, originalLanguage: "en-IN", wasTranslated: false };
  }

  // Detect the source language
  const detected = await detectLanguage(message);
  const sourceLang = detected.languageCode;

  // If already in English, no translation needed
  if (sourceLang === "en-IN") {
    return { translatedMessage: message, originalLanguage: "en-IN", wasTranslated: false };
  }

  // Translate to English
  try {
    const result = await translateText({
      input: message,
      sourceLanguageCode: sourceLang,
      targetLanguageCode: "en-IN",
    });

    return {
      translatedMessage: result.translatedText,
      originalLanguage: sourceLang,
      wasTranslated: true,
    };
  } catch (error) {
    console.warn("Translation to English failed, using original:", error.message);
    return { translatedMessage: message, originalLanguage: sourceLang, wasTranslated: false };
  }
};

// ============================================================
// TRANSLATE RESPONSE TO PATIENT LANGUAGE
// ============================================================

/**
 * Translate Vaidya's English response back to the patient's language.
 *
 * @param {string} response - Vaidya's response in English
 * @param {string} targetLanguage - Target language code (e.g. "mr-IN")
 * @returns {Promise<{ translatedResponse: string, wasTranslated: boolean }>}
 */
export const translateResponseToPatient = async (response, targetLanguage) => {
  if (!response?.trim()) {
    return { translatedResponse: response, wasTranslated: false };
  }

  // If Sarvam not configured or target is English, return as-is
  if (!isSarvamConfigured() || targetLanguage === "en-IN") {
    return { translatedResponse: response, wasTranslated: false };
  }

  // Normalize the target language code
  const targetCode = normalizeLanguageCode(targetLanguage) || targetLanguage;

  try {
    const result = await translateText({
      input: response,
      sourceLanguageCode: "en-IN",
      targetLanguageCode: targetCode,
      mode: "modern-colloquial",
    });

    return {
      translatedResponse: result.translatedText,
      wasTranslated: true,
    };
  } catch (error) {
    console.warn("Translation to patient language failed:", error.message);
    return { translatedResponse: response, wasTranslated: false };
  }
};

// ============================================================
// SARVAM HEALTH CHECK
// ============================================================

/**
 * Verify that the Sarvam API is accessible and the key is valid.
 * @returns {Promise<{ available: boolean, error?: string }>}
 */
export const checkSarvamHealth = async () => {
  if (!isSarvamConfigured()) {
    return { available: false, error: "SARVAM_API_KEY not configured" };
  }

  try {
    const result = await translateText({
      input: "hello",
      sourceLanguageCode: "en-IN",
      targetLanguageCode: "hi-IN",
    });

    return {
      available: Boolean(result.translatedText),
      error: result.translatedText ? undefined : "Empty response from Sarvam",
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
};
