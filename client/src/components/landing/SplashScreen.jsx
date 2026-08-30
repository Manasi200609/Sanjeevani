import { useState, useEffect } from "react";

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState("hidden");

  useEffect(() => {
    // Phase 1: fade in the logo
    const t1 = setTimeout(() => setPhase("visible"), 100);
    // Phase 2: pulse/glow
    const t2 = setTimeout(() => setPhase("glow"), 800);
    // Phase 3: fade out and complete
    const t3 = setTimeout(() => setPhase("exiting"), 2200);
    const t4 = setTimeout(() => onComplete?.(), 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className="splash-screen">
      <div className={`splash-content ${phase}`}>
        <div className="splash-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              width="48"
              height="48"
              rx="14"
              fill="rgba(37, 99, 235, 0.15)"
            />
            <path
              d="M24 12C17.373 12 12 17.373 12 24s5.373 12 12 12 12-5.373 12-12S30.627 12 24 12zm0 4a2 2 0 110 4 2 2 0 010-4zm-4 6h8v2h-2v4h-4v-4h-2v-2z"
              fill="#3B82F6"
            />
            <path
              d="M18 28c0-3.3 2.7-6 6-6s6 2.7 6 6"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="splash-text">
          <h1 className="splash-title">CareFlow</h1>
          <p className="splash-subtitle">
            LONGITUDINAL CARE
          </p>
        </div>

        <div className="splash-line" />
      </div>

      <style>{`
        .splash-screen {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(160deg, #071A2B 0%, #0D2740 60%, #2563EB 100%);
        }

        .splash-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          opacity: 0;
          transform: scale(0.92);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }

        .splash-content.visible,
        .splash-content.glow {
          opacity: 1;
          transform: scale(1);
        }

        .splash-content.glow {
          filter: brightness(1.08);
        }

        .splash-content.exiting {
          opacity: 0;
          transform: scale(1.04);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .splash-icon {
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: rgba(59, 130, 246, 0.12);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(59, 130, 246, 0.15);
        }

        .splash-icon svg {
          width: 44px;
          height: 44px;
        }

        .splash-text {
          text-align: center;
        }

        .splash-title {
          margin: 0;
          font-family: "Manrope", sans-serif;
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -1px;
          color: #F0F4F8;
        }

        .splash-subtitle {
          margin: 6px 0 0;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 3px;
          color: #64748B;
        }

        .splash-line {
          width: 40px;
          height: 2px;
          border-radius: 1px;
          background: rgba(37, 99, 235, 0.4);
          margin-top: 4px;
          opacity: 0;
          transition: opacity 0.6s ease 0.4s, width 0.6s ease 0.4s;
        }

        .splash-content.visible .splash-line,
        .splash-content.glow .splash-line {
          opacity: 1;
          width: 60px;
        }
      `}</style>
    </div>
  );
}
