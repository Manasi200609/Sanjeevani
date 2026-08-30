import { useState, useRef, useEffect } from "react";
import { HeartPulse, Play, Pause, Volume2 } from "lucide-react";

export default function ChatMessage({ message }) {
  const isVaidya = message.sender === "vaidya";
  const [playing, setPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (message.audioBase64) {
      const audio = new Audio(`data:audio/wav;base64,${message.audioBase64}`);
      audioRef.current = audio;
      audio.addEventListener("loadedmetadata", () => {
        setAudioDuration(Math.round(audio.duration));
      });
      audio.addEventListener("ended", () => setPlaying(false));

      // Auto-play if requested (e.g. voice response from Vaidya)
      if (message.autoPlay) {
        audio.play().catch(() => {
          // Autoplay blocked by browser — user can tap Play
        });
        setPlaying(true);
      }

      return () => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
      };
    }
  }, [message.audioBase64, message.autoPlay]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const formatDuration = (sec) => {
    if (!sec) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`p-chat-msg ${isVaidya ? "vaidya" : "user"}`}>
      {isVaidya && (
        <div className="p-chat-avatar">
          <HeartPulse size={14} />
        </div>
      )}

      <div className="p-chat-bubble">
        {message.audioBase64 && (
          <button
            type="button"
            className={`p-chat-voice-btn ${playing ? "playing" : ""}`}
            onClick={togglePlay}
          >
            {playing ? <Pause size={12} /> : <Volume2 size={12} />}
            <span className="p-chat-voice-duration">
              {playing ? "Playing..." : formatDuration(audioDuration)}
            </span>
          </button>
        )}

        <p>{message.text}</p>
        <span className="p-chat-time">{message.time}</span>

        {message.eventCreated && (
          <span className="p-chat-event-badge">
            ✓ Health update recorded
          </span>
        )}
      </div>

      <style>{`
        .p-chat-msg {
          display: flex;
          gap: 10px;
          max-width: 75%;
          animation: msgIn 0.3s ease both;
        }

        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .p-chat-msg.user {
          margin-left: auto;
          flex-direction: row-reverse;
        }

        .p-chat-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(20, 184, 166, 0.12);
          color: #14B8A6;
          flex-shrink: 0;
        }

        .p-chat-bubble {
          padding: 12px 16px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.6;
        }

        .p-chat-msg.vaidya .p-chat-bubble {
          background: #0D2E2A;
          border: 1px solid #1B453F;
          color: #F0F4F8;
          border-bottom-left-radius: 4px;
        }

        .p-chat-msg.user .p-chat-bubble {
          background: #0F766E;
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .p-chat-bubble p {
          margin: 0;
        }

        .p-chat-time {
          display: block;
          margin-top: 4px;
          font-size: 9px;
          opacity: 0.6;
        }

        .p-chat-event-badge {
          display: inline-block;
          margin-top: 6px;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 600;
          background: rgba(20, 184, 166, 0.12);
          color: #14B8A6;
        }

        .p-chat-msg.user .p-chat-event-badge {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .p-chat-voice-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          margin-bottom: 8px;
          border-radius: 20px;
          border: 0;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .p-chat-msg.vaidya .p-chat-voice-btn {
          background: rgba(20, 184, 166, 0.12);
          color: #14B8A6;
        }

        .p-chat-msg.user .p-chat-voice-btn {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .p-chat-voice-btn:hover {
          opacity: 0.85;
        }

        .p-chat-voice-btn.playing {
          animation: voiceGlow 1.5s ease-in-out infinite;
        }

        @keyframes voiceGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .p-chat-voice-duration {
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}
