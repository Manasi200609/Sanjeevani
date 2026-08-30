// ============================================================
// CAREFLOW HEALTH KNOWLEDGE BASE
// ============================================================
//
// Structured health information for Vaidya to reference when
// helping patients. Covers common symptoms, conditions,
// medication guidance, and care protocols relevant to
// ASHA workers in rural India.
//
// This is NOT medical diagnosis information.
// It provides care coordination guidance.
// ============================================================

// ============================================================
// COMMON SYMPTOMS
// ============================================================

export const SYMPTOMS = {
  fatigue: {
    name: "Fatigue",
    nameHi: "थकान",
    nameMr: "थकवा",
    description: "Feeling unusually tired or lacking energy",
    commonCauses: ["Poor sleep", "Stress", "Anemia", "Dehydration", "Infection", "Medication side effects"],
    selfCare: [
      "Rest adequately",
      "Drink plenty of water",
      "Eat nutritious food",
      "Maintain a regular sleep schedule",
    ],
    whenToSeekHelp: [
      "Fatigue persists more than 2 weeks",
      "Fatigue is severe and prevents daily activities",
      "Accompanied by fever, weight loss, or chest pain",
    ],
    severityGuidance: {
      mild: "Try rest and hydration. Monitor for 3-5 days.",
      moderate: "Inform ASHA worker. Monitor closely.",
      severe: "Seek medical attention promptly.",
    },
  },

  dizziness: {
    name: "Dizziness",
    nameHi: "चक्कर आना",
    nameMr: "चक्कर येणे",
    description: "Feeling lightheaded, unsteady, or like the room is spinning",
    commonCauses: ["Dehydration", "Low blood pressure", "Medication changes", "Ear problems", "Anemia"],
    selfCare: [
      "Sit or lie down when dizzy",
      "Drink water regularly",
      "Stand up slowly from sitting/lying position",
      "Avoid sudden head movements",
    ],
    whenToSeekHelp: [
      "Dizziness with chest pain or shortness of breath",
      "Dizziness with severe headache",
      "Dizziness causing falls",
      "Persistent dizziness lasting more than a few days",
    ],
    severityGuidance: {
      mild: "Rest, hydrate, monitor.",
      moderate: "Inform ASHA worker. Check blood pressure.",
      severe: "Seek medical attention.",
    },
  },

  headache: {
    name: "Headache",
    nameHi: "सिरदर्द",
    nameMr: "डोकेदुखी",
    description: "Pain or discomfort in the head or upper neck",
    commonCauses: ["Stress", "Dehydration", "Eye strain", "Sleep issues", "Tension", "Fever"],
    selfCare: [
      "Rest in a quiet, dark room",
      "Apply cold or warm compress",
      "Stay hydrated",
      "Take paracetamol if needed (unless contraindicated)",
    ],
    whenToSeekHelp: [
      "Sudden severe headache (worst ever)",
      "Headache with fever, stiff neck, or confusion",
      "Headache after head injury",
      "Persistent headache worsening over days",
    ],
    severityGuidance: {
      mild: "Rest, hydrate, monitor.",
      moderate: "Inform ASHA worker if persistent.",
      severe: "Seek medical attention immediately.",
    },
  },

  chest_pain: {
    name: "Chest Pain",
    nameHi: "छाती में दर्द",
    nameMr: "छातीत दुखणे",
    description: "Pain, pressure, or discomfort in the chest area",
    commonCauses: ["Muscle strain", "Acid reflux", "Anxiety", "Heart problems", "Lung issues"],
    selfCare: [
      "Sit down and rest",
      "If on heart medication, take as prescribed",
      "Loosen tight clothing",
    ],
    whenToSeekHelp: [
      "Severe crushing chest pain",
      "Chest pain with sweating, nausea, or shortness of breath",
      "Chest pain radiating to arm or jaw",
      "Any chest pain in patients over 40",
    ],
    severityGuidance: {
      mild: "Monitor carefully. Inform ASHA.",
      moderate: "Seek medical attention.",
      severe: "URGENT: Seek immediate medical help.",
    },
  },

  cough: {
    name: "Cough",
    nameHi: "खांसी",
    nameMr: "खोकला",
    description: "Persistent or recurring cough",
    commonCauses: ["Cold/flu", "Allergies", "Dust exposure", "TB", "Asthma", "Acid reflux"],
    selfCare: [
      "Stay hydrated",
      "Avoid dusty environments",
      "Use honey with warm water (for adults)",
      "Avoid smoking and smoke exposure",
    ],
    whenToSeekHelp: [
      "Cough lasting more than 2 weeks",
      "Cough with blood",
      "Cough with high fever",
      "Cough with difficulty breathing",
    ],
    severityGuidance: {
      mild: "Home care, monitor for 1 week.",
      moderate: "Inform ASHA worker if persistent.",
      severe: "Seek medical attention. TB screening may be needed.",
    },
  },

  fever: {
    name: "Fever",
    nameHi: "बुखार",
    nameMr: "ताप",
    description: "Body temperature above normal (98.6°F / 37°C)",
    commonCauses: ["Infection", "Viral illness", "Bacterial infection", "Malaria", "Dengue"],
    selfCare: [
      "Rest adequately",
      "Drink plenty of fluids",
      "Take paracetamol as directed",
      "Use lukewarm sponging if temperature is high",
    ],
    whenToSeekHelp: [
      "Fever above 103°F (39.4°C)",
      "Fever lasting more than 3 days",
      "Fever with rash, stiff neck, or confusion",
      "Fever in children under 2 years",
    ],
    severityGuidance: {
      mild: "Rest, fluids, paracetamol. Monitor.",
      moderate: "Inform ASHA worker. Get tested if persistent.",
      severe: "Seek medical attention promptly.",
    },
  },

  breathing_difficulty: {
    name: "Difficulty Breathing",
    nameHi: "सांस लेने में कठिनाई",
    nameMr: "श्वास घेण्यास त्रास",
    description: "Feeling short of breath or unable to breathe normally",
    commonCauses: ["Asthma", "Allergies", "Heart problems", "Lung infection", "Anxiety", "Anemia"],
    selfCare: [
      "Sit upright (do not lie down)",
      "Try to stay calm",
      "Use prescribed inhaler if available",
      "Avoid triggers (dust, smoke)",
    ],
    whenToSeekHelp: [
      "Severe breathing difficulty",
      "Lips or fingernails turning blue",
      "Breathing difficulty with chest pain",
      "Unable to speak in full sentences due to breathlessness",
    ],
    severityGuidance: {
      mild: "Sit upright, monitor. Inform ASHA.",
      moderate: "Seek medical attention.",
      severe: "URGENT: Seek immediate medical help.",
    },
  },

  stomach_pain: {
    name: "Stomach Pain",
    nameHi: "पेट में दर्द",
    nameMr: "पोटात दुखणे",
    description: "Pain or discomfort in the abdomen",
    commonCauses: ["Indigestion", "Gas", "Food poisoning", "Infection", "Appendicitis", "Kidney stones"],
    selfCare: [
      "Drink warm water",
      "Eat light, bland food",
      "Avoid spicy or oily food",
      "Apply warm compress to abdomen",
    ],
    whenToSeekHelp: [
      "Severe or sudden abdominal pain",
      "Pain with bloody stools or vomiting",
      "Pain in lower right abdomen",
      "Pain with high fever",
    ],
    severityGuidance: {
      mild: "Light diet, warm water, monitor.",
      moderate: "Inform ASHA worker.",
      severe: "Seek medical attention.",
    },
  },
};

// ============================================================
// MEDICATION GUIDANCE
// ============================================================

export const MEDICATION_GUIDANCE = {
  paracetamol: {
    name: "Paracetamol",
    nameHi: "पैरासिटामोल",
    nameMr: "पॅरासिटामॉल",
    uses: ["Fever", "Mild to moderate pain", "Headache"],
    dosage: "500mg every 6-8 hours (adults). Max 4g/day.",
    warnings: [
      "Do not exceed recommended dose",
      "Avoid with liver disease",
      "Check other medications for overlapping ingredients",
    ],
  },

  iron_supplements: {
    name: "Iron Supplements",
    nameHi: "आयरन की गोलियां",
    nameMr: "आयरन अंम्लटब्स",
    uses: ["Anemia", "Iron deficiency"],
    dosage: "As prescribed by doctor",
    warnings: [
      "Take on empty stomach for best absorption",
      "Avoid with tea or coffee",
      "May cause constipation",
    ],
  },

  ORS: {
    name: "Oral Rehydration Salts (ORS)",
    nameHi: "ओआरएस",
    nameMr: "ओआरएस",
    uses: ["Dehydration from diarrhea or vomiting"],
    dosage: "1 packet in 1 liter of clean water. Sip frequently.",
    warnings: [
      "Continue breastfeeding during diarrhea",
      "Seek help if dehydration is severe",
      "Prepare with clean water only",
    ],
  },
};

// ============================================================
// CARE PROTOCOLS
// ============================================================

export const CARE_PROTOCOLS = {
  pregnancy: {
    name: "Pregnancy Care",
    nameHi: "गर्भावस्था देखभाल",
    nameMr: "गर्भावस्था काळजी",
    keyPoints: [
      "Regular antenatal checkups are essential",
      "Iron and folic acid supplements are important",
      "Watch for danger signs: bleeding, severe headache, swelling",
      "Maintain good nutrition",
      "Stay hydrated",
    ],
    dangerSigns: [
      "Vaginal bleeding",
      "Severe headache with blurred vision",
      "Swelling of face and hands",
      "Fever",
      "Reduced fetal movement",
      "Severe abdominal pain",
    ],
  },

  diabetes: {
    name: "Diabetes Management",
    nameHi: "मधुमेह प्रबंधन",
    nameMr: "मधुमेह व्यवस्थापन",
    keyPoints: [
      "Take medications regularly as prescribed",
      "Monitor blood sugar levels",
      "Follow a balanced diet",
      "Exercise regularly (walking is good)",
      "Keep regular follow-up appointments",
    ],
    dangerSigns: [
      "Very high or very low blood sugar",
      "Frequent urination",
      "Excessive thirst",
      "Wounds that don't heal",
      "Blurred vision",
    ],
  },

  hypertension: {
    name: "Blood Pressure Management",
    nameHi: "उच्च रक्तचाप प्रबंधन",
    nameMr: "उच्च रक्तदाब व्यवस्थापन",
    keyPoints: [
      "Take BP medications regularly",
      "Reduce salt intake",
      "Exercise regularly",
      "Manage stress",
      "Avoid tobacco and excess alcohol",
    ],
    dangerSigns: [
      "Very high BP reading (above 180/120)",
      "Severe headache",
      "Chest pain",
      "Breathing difficulty",
      "Vision changes",
    ],
  },
};

// ============================================================
// SELF-CARE MESSAGES
// ============================================================

export const SELF_CARE_MESSAGES = {
  rest: {
    en: "Please get plenty of rest and try to sleep well tonight.",
    hi: "कृपया पर्याप्त आराम करें और आज रात अच्छी नींद लेने की कोशिश करें।",
    mr: "कृपया पुरेसा विश्रांती घ्या आणि आज रात्री चांगला झोपा.",
  },
  hydration: {
    en: "Make sure to drink plenty of water throughout the day.",
    hi: "दिन भर में पर्याप्त पानी पीते रहें।",
    mr: "दिवसभर भरपूर पाणी प्या.",
  },
  nutrition: {
    en: "Try to eat regular, nutritious meals with fruits and vegetables.",
    hi: "नियमित, पौष्टिक भोजन खाएं जिसमें फल और सब्जियां हों।",
    mr: "नियमित, पौष्टिक जेवण खा ज्यात फळे आणि भाज्या असतील.",
  },
  followup: {
    en: "Your care team will follow up with you soon. Please don't hesitate to reach out if you feel worse.",
    hi: "आपकी देखभाल टीम जल्द ही आपसे संपर्क करेगी। यदि आपकी तबीयत बिगड़ती है तो कृपया संपर्क करें।",
    mr: "तुमची काळजी टीम लवकरच तुमच्याशी संपर्क साधेल. तुम्हाला अधिक अस्वस्थ वाटल्यास कृपया संपर्क करा.",
  },
  seekHelp: {
    en: "If your symptoms get worse or don't improve in 2-3 days, please visit your nearest health center or contact your ASHA worker.",
    hi: "यदि आपके लक्षण बिगड़ते हैं या 2-3 दिनों में सुधार नहीं होता, तो कृपया अपने निकटतम स्वास्थ्य केंद्र पर जाएं या अपनी ASHA कार्यकर्ता से संपर्क करें।",
    mr: "तुमची लक्षणे अधिक वाईट झाल्या किंवा 2-3 दिवसांत सुधारणा झाली नाही तर, कृपया तुमच्या जवळच्या आरोग्य केंद्राला भेट द्या किंवा तुमच्या ASHA कार्यकर्त्याशी संपर्क साधा.",
  },
};

// ============================================================
// KNOWLEDGE BASE SEARCH
// ============================================================

/**
 * Search the knowledge base for relevant information
 * based on patient symptoms or keywords.
 *
 * @param {string} query - Patient's message or symptom description
 * @returns {object[]} Array of matching knowledge items
 */
export const searchKnowledgeBase = (query) => {
  if (!query) return [];

  const lowerQuery = query.toLowerCase();
  const results = [];

  // Search symptoms
  for (const [key, symptom] of Object.entries(SYMPTOMS)) {
    const searchTerms = [
      symptom.name.toLowerCase(),
      symptom.nameHi,
      symptom.nameMr,
      symptom.description.toLowerCase(),
      key.replace(/_/g, " "),
    ];

    if (searchTerms.some((term) => lowerQuery.includes(term.toLowerCase()))) {
      results.push({
        type: "symptom",
        key,
        ...symptom,
      });
    }
  }

  // Search medication guidance
  for (const [key, med] of Object.entries(MEDICATION_GUIDANCE)) {
    const searchTerms = [
      med.name.toLowerCase(),
      med.nameHi,
      med.nameMr,
      ...med.uses.map((u) => u.toLowerCase()),
    ];

    if (searchTerms.some((term) => lowerQuery.includes(term.toLowerCase()))) {
      results.push({
        type: "medication",
        key,
        ...med,
      });
    }
  }

  // Search care protocols
  for (const [key, protocol] of Object.entries(CARE_PROTOCOLS)) {
    const searchTerms = [
      protocol.name.toLowerCase(),
      protocol.nameHi,
      protocol.nameMr,
      ...protocol.keyPoints.map((p) => p.toLowerCase()),
    ];

    if (searchTerms.some((term) => lowerQuery.includes(term.toLowerCase()))) {
      results.push({
        type: "protocol",
        key,
        ...protocol,
      });
    }
  }

  return results;
};

/**
 * Get a self-care message in the appropriate language.
 *
 * @param {"rest"|"hydration"|"nutrition"|"followup"|"seekHelp"} type
 * @param {string} languageCode - e.g. "hi-IN", "mr-IN"
 * @returns {string}
 */
export const getSelfCareMessage = (type, languageCode = "en-IN") => {
  const messages = SELF_CARE_MESSAGES[type];
  if (!messages) return "";

  const langKey = languageCode.split("-")[0]; // "hi-IN" → "hi"
  return messages[langKey] || messages.en;
};
