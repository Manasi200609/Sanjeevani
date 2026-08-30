import { createContext, useContext, useState, useCallback, useMemo } from "react";
import en from "./translations/en.js";
import hi from "./translations/hi.js";
import mr from "./translations/mr.js";
import bn from "./translations/bn.js";
import ta from "./translations/ta.js";
import te from "./translations/te.js";
import gu from "./translations/gu.js";
import kn from "./translations/kn.js";
import ml from "./translations/ml.js";
import or from "./translations/or.js";
import pa from "./translations/pa.js";
import as from "./translations/as.js";
import mai from "./translations/mai.js";
import ks from "./translations/ks.js";

const translations = { en, hi, mr, bn, ta, te, gu, kn, ml, or, pa, as, mai, ks };

const STORAGE_KEY = "careflow_language";
const PROFILE_KEY = "careflow_profile";

const defaultProfile = {
  name: "ASHA Worker",
  village: "Khed",
  district: "Pune",
  state: "Maharashtra",
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "en";
    } catch {
      return "en";
    }
  });

  const [profile, setProfileState] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      return saved ? JSON.parse(saved) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch { /* ignore */ }
  }, []);

  const setProfile = useCallback((updates) => {
    setProfileState((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const t = useCallback(
    (key, params = {}) => {
      const dict = translations[language] || translations.en;
      let text = dict[key] || translations.en[key] || key;

      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
      });

      return text;
    },
    [language]
  );

  const languages = useMemo(
    () => [
      { code: "en", name: "English", native: "English" },
      { code: "hi", name: "Hindi", native: "हिन्दी" },
      { code: "mr", name: "Marathi", native: "मराठी" },
      { code: "bn", name: "Bengali", native: "বাংলা" },
      { code: "ta", name: "Tamil", native: "தமிழ்" },
      { code: "te", name: "Telugu", native: "తెలుగు" },
      { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
      { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
      { code: "ml", name: "Malayalam", native: "മലയാളം" },
      { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
      { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
      { code: "as", name: "Assamese", native: "অসমীয়া" },
      { code: "mai", name: "Maithili", native: "मैथिली" },
      { code: "ks", name: "Kashmiri", native: "कॉशुर" },
    ],
    []
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      profile,
      setProfile,
      languages,
    }),
    [language, setLanguage, t, profile, setProfile, languages]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
