import { useState, useEffect } from "react";

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState("hidden");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("visible"), 100);
    const t2 = setTimeout(() => setPhase("glow"), 800);
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
        <div className="splash-logo">
          <img
            src="/images/sanjeevani-green.png"
            alt="Sanjeevani"
            style={{ width: 120, height: 120, objectFit: "contain" }}
          />
        </div>

        <div className="splash-text">
          <h1 className="splash-title">SANJEEVANI</h1>
          <p className="splash-tagline">
            Life-giving care, revived by attention
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
          background: linear-gradient(160deg, #020C1B 0%, #0A1929 50%, #112240 100%);
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

        .splash-logo {
          width: 180px;
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 36px;
          background: rgba(16, 185, 129, 0.06);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(16, 185, 129, 0.1);
        }

        .splash-text {
          text-align: center;
        }

        .splash-title {
          margin: 0;
          font-family: "Manrope", sans-serif;
          font-size: 38px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #F0F4F8;
        }

        .splash-tagline {
          margin: 8px 0 0;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 1.5px;
          color: #64748B;
        }

        .splash-line {
          width: 40px;
          height: 2px;
          border-radius: 1px;
          background: rgba(56, 189, 248, 0.4);
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
