import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Mic, MicOff, Square } from "lucide-react";

export default function ChatInput({ onSend, onVoiceSend, disabled, language }) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setText("");
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access is required for voice messages.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (audioBlob && onVoiceSend) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        onVoiceSend(base64, "audio/webm");
        setAudioBlob(null);
        setRecordingTime(0);
      };
      reader.readAsDataURL(audioBlob);
    }
  }, [audioBlob, onVoiceSend]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isRecording) {
    return (
      <div className="p-chat-voice-recording">
        <div className="p-chat-voice-indicator">
          <div className="p-chat-voice-dot" />
          <span className="p-chat-voice-time">{formatTime(recordingTime)}</span>
        </div>
        <span className="p-chat-voice-hint">Listening...</span>
        <button type="button" onClick={cancelRecording} className="p-chat-voice-cancel" title="Cancel">
          <Square size={14} />
        </button>
        <button type="button" onClick={stopRecording} className="p-chat-voice-stop" title="Send voice message">
          <Send size={14} />
        </button>

        <style>{`
          .p-chat-voice-recording {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: #0D2E2A;
            border: 2px solid #EF4444;
            border-radius: 12px;
          }
          .p-chat-voice-indicator {
            display: flex; align-items: center; gap: 8px;
          }
          .p-chat-voice-dot {
            width: 8px; height: 8px; border-radius: 50%;
            background: #EF4444;
            animation: voicePulse 1s ease-in-out infinite;
          }
          @keyframes voicePulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.3); }
          }
          .p-chat-voice-time {
            font-size: 13px; font-weight: 600; color: #F0F4F8;
            font-variant-numeric: tabular-nums;
          }
          .p-chat-voice-hint {
            flex: 1; font-size: 12px; color: #64748B;
          }
          .p-chat-voice-cancel, .p-chat-voice-stop {
            width: 36px; height: 36px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 9px; border: 0; cursor: pointer;
            transition: opacity 0.18s ease;
          }
          .p-chat-voice-cancel {
            background: #123B35; color: #94A3B8;
          }
          .p-chat-voice-cancel:hover { opacity: 0.8; }
          .p-chat-voice-stop {
            background: #EF4444; color: #fff;
          }
          .p-chat-voice-stop:hover { opacity: 0.85; }
        `}</style>
      </div>
    );
  }

  return (
    <form className="p-chat-input" onSubmit={handleSubmit}>
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        className="p-chat-mic"
        title="Record voice message"
      >
        <Mic size={16} />
      </button>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={language && language !== "English" ? `Speak in ${language} or type...` : "Tell Vaidya how you're feeling..."}
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="p-chat-send"
      >
        <Send size={16} />
      </button>

      <style>{`
        .p-chat-input {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #0D2E2A;
          border: 1px solid #1B453F;
          border-radius: 12px;
        }

        .p-chat-mic {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: rgba(20, 184, 166, 0.15);
          color: #14B8A6;
          flex-shrink: 0;
          transition: opacity 0.18s ease;
          border: 0;
          cursor: pointer;
        }

        .p-chat-mic:hover { opacity: 0.85; }
        .p-chat-mic:disabled { opacity: 0.4; cursor: not-allowed; }

        .p-chat-input input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #F0F4F8;
          font-size: 13px;
        }

        .p-chat-input input::placeholder {
          color: #64748B;
        }

        .p-chat-send {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #0F766E;
          color: #fff;
          flex-shrink: 0;
          transition: opacity 0.18s ease;
        }

        .p-chat-send:hover { opacity: 0.85; }
        .p-chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </form>
  );
}
