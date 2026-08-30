// ============================================================
// ADAPTION VAIDYA DATASET SERVICE
// ============================================================
//
// Loads and searches the Adaption Vaidya Rural Symptoms dataset
// (jadhavmanasi70/adaption-vaidya-rural-symptoms-v1) from HuggingFace.
//
// The dataset contains 12,601 rows of multilingual healthcare
// content across Hindi, Marathi, Gujarati, Bengali, Tamil,
// Malayalam, Punjabi, English, and other Indian languages.
//
// Each row has: text, enhanced_prompt, enhanced_completion,
// list_item, section_header, title.
//
// This service provides:
// 1. Keyword-based symptom search across all languages
// 2. Language-specific content retrieval
// 3. Context retrieval for Gemini prompts
// ============================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// DATASET LOADING
// ============================================================

let dataset = null;
let datasetLoaded = false;

/**
 * Load the Adaption dataset from the JSON file.
 * Called lazily on first search.
 */
const loadDataset = () => {
  if (datasetLoaded) return dataset;

  try {
    const datasetPath = path.join(
      __dirname,
      "..",
      "data",
      "adaption-dataset.json"
    );

    if (!fs.existsSync(datasetPath)) {
      console.warn(
        "[AdaptionDataset] Dataset file not found at:",
        datasetPath
      );
      dataset = [];
      datasetLoaded = true;
      return dataset;
    }

    const raw = fs.readFileSync(datasetPath, "utf-8");
    dataset = JSON.parse(raw);
    datasetLoaded = true;

    console.log(
      `[AdaptionDataset] Loaded ${dataset.length} rows from Adaption dataset`
    );
    return dataset;
  } catch (error) {
    console.error("[AdaptionDataset] Failed to load dataset:", error.message);
    dataset = [];
    datasetLoaded = true;
    return dataset;
  }
};

// ============================================================
// SYMPTOM KEYWORD MAPPING
// ============================================================
// Maps common English symptom terms to their multilingual
// equivalents for searching the dataset.
// ============================================================

const SYMPTOM_KEYWORDS = {
  fatigue: [
    "fatigue", "tired", "tiredness", "exhaustion", "weakness",
    "थकान", "थकवा", "थकवा येणे", "कमजोरी",
    "થાક", "કમજોરી",
    "ক্লান্তি", "দুর্বলতা",
    "ਥਕਾਵਟ", "ਕਮਜ਼ੋਰੀ",
    "ஆயாசம்", "சோர்வு",
    "తలనొప్పి", "అలసట",
    "ಆಯಾಸ", "ಸುಸ್ತು",
    "ക്ഷീണം", "ക്ലാന്തി",
  ],
  dizziness: [
    "dizziness", "dizzy", "vertigo", "lightheaded", "spinning",
    "चक्कर", "चक्कर आना", "चक्कर येणे", "घबराहट",
    "ચક્કર", "ઘેરાટ",
    "ঘুরি", "মাথা ঘোরা",
    "ਚੱਕਰ", "ਘੁੰਮਣ",
    "தலைச்சுற்றல்",
    "తల తిరగడం",
    "ತಲೆ ಸುತ್ತು",
    "തലചുറ്റൽ",
  ],
  headache: [
    "headache", "head pain", "migraine", "head ache",
    "सिरदर्द", "डोकेदुखी", "सिर दर्द",
    "માથાનો દુખાવો", "માથું",
    "মাথাব্যথা", "মাথা ধরে",
    "ਸਿਰ ਦਰਦ", "ਮੱਥੇ ਦਰਦ",
    "தலைவலி",
    "తలనొప్పి",
    "ತಲೆನೋವು",
    "തലവേദന",
  ],
  fever: [
    "fever", "temperature", "high temperature", "burning up",
    "बुखार", "ताप", "ज्वर",
    "તાવ", "જ્વર",
    "জ্বর", "তাপমাত্রা",
    "ਬੁਖਾਰ", "ਤਾਪ",
    "காய்ச்சல்",
    "జ్వరం",
    "ಜ್ವರ",
    "പനി",
  ],
  chest_pain: [
    "chest pain", "chest tightness", "chest pressure",
    "छाती में दर्द", "छातीत दुखणे", "सीने में दर्द",
    "છાતીમાં દુખાવો",
    "বুকে ব্যথা",
    "ਛਾਤੀ ਵਿੱਚ ਦਰਦ",
    "நெஞ்சு வலி",
    "ఛాతి నొప్పి",
    "ಎದೆ ನೋವು",
    "നെഞ്ച് വേദന",
  ],
  cough: [
    "cough", "coughing", "dry cough", "wet cough",
    "खांसी", "खोकला",
    "ખાંસી",
    "কাশি",
    "ਖੰਘ",
    "இருமல்",
    "దగ్గు",
    "ಕೆಮ್ಮು",
    "ചുമ",
  ],
  breathing_difficulty: [
    "breathing difficulty", "shortness of breath", "breathless",
    "सांस लेने में कठिनाई", "श्वास घेण्यास त्रास",
    "શ્વાસ લેવામાં તકલીફ",
    "শ্বাসকষ্ট",
    "ਸਾਹ ਲੈਣ ਵਿੱਚ ਤકਲੀਫ",
    "மூச்சுத்திணறல்",
    "శ్వాస తీసుకోవడంలో ఇబ్బంది",
    "ಉಸಿರಾಟದ ತೊಂದರೆ",
    "ശ്വാസതടസ്സം",
  ],
  stomach_pain: [
    "stomach pain", "abdominal pain", "belly pain", "stomach ache",
    "पेट में दर्द", "पोटात दुखणे",
    "પેટમાં દુખાવો",
    "পেটে ব্যথা",
    "ਪੇਟ ਵਿੱਚ ਦਰਦ",
    "வயிற்று வலி",
    "కడుపు నొప్పి",
    "ಹೊಟ್ಟೆ ನೋವು",
    "വയറു വേദന",
  ],
  nausea: [
    "nausea", "vomiting", "feeling sick", "throwing up",
    "उल्टी", "जी मिचलाना", "वॉमिटिंग",
    "ઉલ્ટી", "જી મચકારવું",
    "বমি", "বমি বমি ভাব",
    "ਉਲਟੀ",
    "குமட்டல்", "வாந்தி",
    "వాంతులు",
    "ವಾಕರಿಸುವಿಕೆ",
    "ഛർദ്ദി",
  ],
  medication_adherence: [
    "medication", "medicine", "missed dose", "forgot medicine",
    "गोली", "दवा", "औषध", "दवाई",
    "દવા", "ગોળી",
    "ওষুধ", "ট্যাবলেট",
    "ਦਵਾਈ", "ਗੋਲੀ",
    "மருந்து", "மாத்திரை",
    "మందులు",
    "ಔಷಧ",
    "മരുന്ന്",
  ],
};

// ============================================================
// SYMPTOM SEARCH
// ============================================================

/**
 * Search the Adaption dataset for rows matching a query.
 *
 * @param {string} query - The search query (patient message, symptom description)
 * @param {object} options
 * @param {string} [options.languageCode] - Filter results by language
 * @param {number} [options.maxResults=5] - Maximum results to return
 * @returns {object[]} Matching rows from the dataset
 */
export const searchDataset = (query, options = {}) => {
  const { languageCode, maxResults = 5 } = options;

  if (!query?.trim()) return [];

  const data = loadDataset();
  if (!data || data.length === 0) return [];

  const lowerQuery = query.toLowerCase();

  // Score each row by relevance
  const scored = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const text = (row.text || "").toLowerCase();
    const completion = (row.enhanced_completion || "").toLowerCase();
    const prompt = (row.enhanced_prompt || "").toLowerCase();
    const list_item = (row.list_item || "").toLowerCase();

    let score = 0;

    // Direct keyword match in text
    for (const keywords of Object.values(SYMPTOM_KEYWORDS)) {
      for (const kw of keywords) {
        const kwLower = kw.toLowerCase();
        if (lowerQuery.includes(kwLower) || text.includes(kwLower)) {
          score += 3;
        }
        if (completion.includes(kwLower)) {
          score += 1;
        }
      }
    }

    // General text overlap
    const queryWords = lowerQuery.split(/\s+/);
    for (const word of queryWords) {
      if (word.length < 3) continue;
      if (text.includes(word)) score += 2;
      if (completion.includes(word)) score += 1;
    }

    // Boost for list items (symptom-specific data)
    if (list_item && list_item.length > 10) {
      score += 1;
    }

    if (score > 0) {
      scored.push({ row, score, index: i });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return top results
  return scored.slice(0, maxResults).map(({ row, score }) => ({
    text: row.text,
    enhancedCompletion: row.enhanced_completion,
    enhancedPrompt: row.enhanced_prompt,
    listItem: row.list_item,
    sectionHeader: row.section_header,
    title: row.title,
    relevanceScore: score,
  }));
};

// ============================================================
// GET SYMPTOM CONTEXT
// ============================================================

/**
 * Get relevant dataset context for a patient message.
 * Returns a formatted string suitable for inclusion in a Gemini prompt.
 *
 * @param {string} patientMessage - The patient's message
 * @param {string} [languageCode] - Patient's language code
 * @returns {string} Formatted context string
 */
export const getSymptomContext = (patientMessage, languageCode) => {
  const results = searchDataset(patientMessage, {
    languageCode,
    maxResults: 3,
  });

  if (results.length === 0) return "";

  let context = "\n\nRELEVANT ADAPTION DATASET INFORMATION:\n";
  context += "(Multilingual healthcare symptom mapping from rural India)\n";

  for (const result of results) {
    if (result.text) {
      context += `\n- ${result.text.slice(0, 300)}\n`;
    }
    if (result.enhancedCompletion) {
      context += `  Clinical context: ${result.enhancedCompletion.slice(0, 200)}\n`;
    }
  }

  context +=
    "\nUse this multilingual healthcare context to better understand the patient's symptoms. The dataset maps rural dialect symptoms to clinical terms.\n";

  return context;
};

// ============================================================
// DATASET STATS
// ============================================================

/**
 * Get dataset statistics for health checks.
 */
export const getDatasetStats = () => {
  const data = loadDataset();

  const languages = new Set();
  const sections = {};

  for (const row of data) {
    // Detect language from script
    const text = row.text || "";
    if (/[\u0900-\u097F]/.test(text)) languages.add("Hindi/Marathi/Devanagari");
    if (/[\u0A00-\u0A7F]/.test(text)) languages.add("Punjabi/Gurmukhi");
    if (/[\u0980-\u09FF]/.test(text)) languages.add("Bengali");
    if (/[\u0B80-\u0BFF]/.test(text)) languages.add("Tamil");
    if (/[\u0C00-\u0C7F]/.test(text)) languages.add("Telugu");
    if (/[\u0C80-\u0CFF]/.test(text)) languages.add("Kannada");
    if (/[\u0D00-\u0D7F]/.test(text)) languages.add("Malayalam");
    if (/[\u0A80-\u0AFF]/.test(text)) languages.add("Gujarati");
    if (/[a-zA-Z]/.test(text)) languages.add("English");

    const section = row.section_header || "content";
    sections[section] = (sections[section] || 0) + 1;
  }

  return {
    totalRows: data.length,
    languagesDetected: [...languages],
    sectionDistribution: sections,
    loaded: datasetLoaded,
  };
};
