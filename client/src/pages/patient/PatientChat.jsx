import { useState, useCallback, useEffect, useRef } from "react";
import { HeartPulse, RefreshCw, Globe, ChevronDown } from "lucide-react";
import ChatMessage from "../../components/patient/chat/ChatMessage";
import ChatInput from "../../components/patient/chat/ChatInput";
import { sendVaidyaMessage, sendVoiceMessage, synthesizeSpeech } from "../../services/vaidyaService";
import { getPatients, updatePatient } from "../../services/api";

const WELCOME = {
  id: "welcome",
  sender: "vaidya",
  text: "Hello! I'm Vaidya, your health companion. You can tell me how you're feeling or ask me a question about your health.",
  time: "now",
};

export default function PatientChat() {
  const [messages, setMessages] = useState([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [patientLanguage, setPatientLanguage] = useState("English");
  const [initError, setInitError] = useState("");
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const langDropdownRef = useRef(null);

  const LANGUAGES = [
    { value: "English", label: "English", code: "en-IN" },
    { value: "Marathi", label: "मराठी", code: "mr-IN" },
    { value: "Hindi", label: "हिन्दी", code: "hi-IN" },
    { value: "Gujarati", label: "ગુજરાતી", code: "gu-IN" },
    { value: "Bengali", label: "বাংলা", code: "bn-IN" },
    { value: "Tamil", label: "தமிழ்", code: "ta-IN" },
    { value: "Malayalam", label: "മലയാളം", code: "ml-IN" },
    { value: "Punjabi", label: "ਪੰਜਾਬੀ", code: "pa-IN" },
  ];

  const currentLang = LANGUAGES.find((l) => l.value === patientLanguage) || LANGUAGES[0];

  useEffect(() => {
    const resolvePatient = async () => {
      try {
        const data = await getPatients();
        const patients = data?.patients || [];
        if (patients.length > 0) {
          setPatientId(patients[0]._id);
          setPatientName(patients[0].name);
          setPatientLanguage(patients[0].preferredLanguage || "English");
        } else {
          setInitError(
            "No patients found. Please seed demo data first from the ASHA dashboard."
          );
        }
      } catch (err) {
        setInitError(
          "Could not connect to the backend. Please ensure the server is running."
        );
      }
    };
    resolvePatient();
  }, []);

  const handleLanguageChange = useCallback(async (lang) => {
    setPatientLanguage(lang.value);
    setLangDropdownOpen(false);
    if (!patientId) return;
    try {
      await updatePatient(patientId, { preferredLanguage: lang.value });
    } catch (err) {
      console.error("Failed to update language:", err);
    }
  }, [patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-play Vaidya voice response (handled in ChatMessage)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.sender === "vaidya" && lastMsg?.audioBase64 && lastMsg?.autoPlay) {
      const audio = new Audio(`data:audio/wav;base64,${lastMsg.audioBase64}`);
      audio.play().catch(() => {
        // Autoplay blocked by browser — ChatMessage has a manual Play button
      });
    }
  }, [messages]);

  const handleSend = useCallback(
  async (text) => {
    if (!text.trim() || loading) return;

    if (!patientId) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "vaidya",
          text: "I'm not connected to a patient record yet. Please try again later.",
          time: new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        },
      ]);
      return;
    }

    const now = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: "user",
      text,
      time: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // ------------------------------------------------------
      // 1. Get Vaidya's text response
      // ------------------------------------------------------

      const result = await sendVaidyaMessage(patientId, text);

      console.log("🔥 VAIDYA RESULT:", result);
      console.log("🔥 VAIDYA RESPONSE:", result?.response);

      const responseText =
        result.response ||
        "Thank you for sharing. I've noted your message.";

      // ------------------------------------------------------
      // 2. Generate Vaidya's voice response using Sarvam TTS
      // ------------------------------------------------------

      let responseAudio = null;
      let responseMimeType = "audio/wav";

      try {
        console.log(
          "🔊 Generating Vaidya voice in:",
          currentLang.code
        );

        const ttsResult = await synthesizeSpeech(
          responseText,
          currentLang.code
        );

        console.log("🔊 TTS RESULT:", ttsResult);

        responseAudio = ttsResult?.audio || null;
        responseMimeType =
          ttsResult?.mimeType || "audio/wav";

        if (responseAudio) {
          console.log("🔊 Vaidya voice generated successfully");
        } else {
          console.warn("⚠️ TTS returned no audio");
        }
      } catch (ttsError) {
        // TTS failure should NOT break the text response
        console.error("⚠️ Vaidya TTS failed:", ttsError);
      }

      // ------------------------------------------------------
      // 3. Add Vaidya response to chat
      // ------------------------------------------------------

      setMessages((prev) => [
        ...prev,
        {
          id: `v-${Date.now()}`,
          sender: "vaidya",
          text: responseText,
          time: new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),

          // Audio for ChatMessage
          audioBase64: responseAudio,
          audioMimeType: responseMimeType,

          // Try automatic playback
          autoPlay: !!responseAudio,

          eventCreated: result.eventCreated || false,
        },
      ]);
    } catch (err) {
      console.error("Vaidya error:", err);

      const isTimeout =
        err.message?.includes("timeout") ||
        err.code === "ECONNABORTED";

      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "vaidya",
          text: err.message?.includes("SARVAM_API_KEY")
            ? "Vaidya is not configured yet. The Sarvam API key needs to be set in the backend .env file."
            : err.message?.includes("not found")
            ? "Patient record not found. Please ensure demo data is seeded."
            : isTimeout
            ? "Vaidya is taking a little longer than usual. Please try again."
            : "Vaidya is temporarily unavailable. Please try again in a moment.",
          time: new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  },
  [loading, patientId, currentLang.code]
);

  const handleVoiceSend = useCallback(
    async (audioBase64, mimeType) => {
      if (!audioBase64 || voiceProcessing) return;
      if (!patientId) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "vaidya",
            text: "I'm not connected to a patient record yet.",
            time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          },
        ]);
        return;
      }

      setVoiceProcessing(true);
      const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        { id: `uv-${Date.now()}`, sender: "user", text: "🎙 Voice message", time: now, isVoice: true },
      ]);

      try {
        const result = await sendVoiceMessage(patientId, audioBase64, mimeType);

        if (result.transcript) {
          setMessages((prev) => {
            const updated = [...prev];
            const lastUserIdx = updated.findLastIndex((m) => m.isVoice && m.sender === "user");
            if (lastUserIdx >= 0) {
              updated[lastUserIdx] = { ...updated[lastUserIdx], text: `🎙 "${result.transcript}"` };
            }
            return updated;
          });
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `vr-${Date.now()}`,
            sender: "vaidya",
            text: result.response || "Thank you for sharing. I've noted your message.",
            time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
            audioBase64: result.responseAudio || null,
            autoPlay: !!result.responseAudio,
            eventCreated: result.eventCreated || false,
          },
        ]);
      } catch (err) {
        console.error("Voice chat error:", err);
        const isTimeout = err.message?.includes("timeout") || err.code === "ECONNABORTED";
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "vaidya",
            text: err.message?.includes("not configured")
              ? "Voice services are not configured yet. SARVAM_API_KEY is needed."
              : isTimeout
              ? "Vaidya is taking longer than expected to respond. Please try again."
              : "I couldn't process the voice message. Please try again.",
            time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          },
        ]);
      } finally {
        setVoiceProcessing(false);
      }
    },
    [voiceProcessing, patientId]
  );

  return (
    <div className="p-chat-page">
      <div className="p-chat-header">
        <div className="p-chat-header-icon">
          <HeartPulse size={18} />
        </div>
        <div>
          <div className="p-chat-header-name">Vaidya</div>
          <div className="p-chat-header-sub">
            {patientName ? `Health companion for ${patientName}` : "Your health companion"}
          </div>
        </div>
        <div className="p-chat-lang-wrapper" ref={langDropdownRef}>
          <button
            type="button"
            className="p-chat-lang-btn"
            onClick={() => setLangDropdownOpen((v) => !v)}
          >
            <Globe size={12} />
            <span>{currentLang.label}</span>
            <ChevronDown size={12} style={{ transform: langDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
          {langDropdownOpen && (
            <div className="p-chat-lang-dropdown">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  className={`p-chat-lang-option ${patientLanguage === lang.value ? "active" : ""}`}
                  onClick={() => handleLanguageChange(lang)}
                >
                  <span className="p-chat-lang-native">{lang.label}</span>
                  <span className="p-chat-lang-english">{lang.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-chat-header-status">
          {loading || voiceProcessing ? (
            <>
              <RefreshCw size={10} className="spin" />{" "}
              {voiceProcessing ? "Processing voice..." : "Thinking..."}
            </>
          ) : (
            <>
              <span className="p-chat-online-dot" />
              Online
            </>
          )}
        </div>
      </div>

      {initError && <div className="p-chat-error">{initError}</div>}

      <div className="p-chat-messages">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-chat-footer">
        <ChatInput
          onSend={handleSend}
          onVoiceSend={handleVoiceSend}
          disabled={loading || voiceProcessing || !patientId}
          language={patientLanguage}
        />
      </div>

      <style>{`
        .p-chat-page {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 88px - 48px);
          max-width: 800px;
          width: 100%;
          min-width: 0;
        }

        .p-chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 0;
          border-bottom: 1px solid #1B453F;
          margin-bottom: 0;
        }

        .p-chat-header-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(34, 197, 94, 0.12);
          color: #22C55E;
        }

        .p-chat-header-name {
          font-family: "Manrope", sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #F0F4F8;
        }

        .p-chat-header-sub {
          font-size: 10px;
          color: #64748B;
        }

        .p-chat-header-status {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          color: #22C55E;
          font-weight: 600;
        }

        .p-chat-online-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22C55E;
        }

        .p-chat-lang-wrapper {
          position: relative;
          margin-left: auto;
        }

        .p-chat-lang-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 8px;
          background: rgba(20, 184, 166, 0.12);
          color: #14B8A6;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid rgba(20, 184, 166, 0.25);
          cursor: pointer;
          transition: background 0.15s;
          white-space: nowrap;
        }

        .p-chat-lang-btn:hover {
          background: rgba(20, 184, 166, 0.2);
        }

        .p-chat-lang-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          min-width: 180px;
          background: #0D2E2A;
          border: 1px solid #1B453F;
          border-radius: 10px;
          padding: 6px;
          z-index: 100;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
          animation: langDropIn 0.15s ease;
        }

        @keyframes langDropIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .p-chat-lang-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 8px 12px;
          border-radius: 7px;
          background: transparent;
          color: #F0F4F8;
          font-size: 13px;
          border: 0;
          cursor: pointer;
          transition: background 0.12s;
        }

        .p-chat-lang-option:hover {
          background: #123B35;
        }

        .p-chat-lang-option.active {
          background: rgba(20, 184, 166, 0.15);
          color: #14B8A6;
        }

        .p-chat-lang-native {
          font-weight: 600;
        }

        .p-chat-lang-english {
          font-size: 11px;
          color: #64748B;
        }

        .p-chat-error {
          padding: 10px 14px;
          margin-bottom: 12px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.12);
          color: #EF4444;
          font-size: 11px;
          font-weight: 500;
        }

        .p-chat-messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 24px 0;
        }

        .p-chat-footer {
          padding: 16px 0 0;
          border-top: 1px solid #1B453F;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
