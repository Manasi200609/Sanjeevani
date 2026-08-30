import dotenv from "dotenv";

dotenv.config();const env = {
  PORT: Number(process.env.PORT) || 5000,
  MONGO_URI: process.env.MONGO_URI,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL:
    process.env.GROQ_MODEL ||
    "openai/gpt-oss-20b",
  GEMINI_API_KEY:
    process.env.GEMINI_API_KEY,
  GEMINI_MODEL:
    process.env.GEMINI_MODEL ||
    "gemini-3-flash-preview",
  SARVAM_API_KEY:
    process.env.SARVAM_API_KEY || "",
  AI_PROVIDER:
    process.env.AI_PROVIDER || "gemini",
  GOOGLE_CLOUD_PROJECT:
    process.env.GOOGLE_CLOUD_PROJECT || "",
  GOOGLE_CLOUD_LOCATION:
    process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  AGENT_EXECUTION_MODE:
    process.env.AGENT_EXECUTION_MODE || "local",
  NODE_ENV:
    process.env.NODE_ENV || "development",
};

export default env;
