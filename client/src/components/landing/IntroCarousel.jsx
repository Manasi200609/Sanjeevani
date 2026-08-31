import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

// ============================================================
// SLIDE CONFIGURATION
// ============================================================

const slides = [
  {
    id: 1,
    image: "/images/asha-1.webp",
    title: "ASHA",
    eyebrow: "Accredited Social Health Activist",
    description:
      "Frontline community health workers who bridge the gap between patients and healthcare systems across rural India.",
    label: "WHO WE SERVE",
    node: "ASHA",
  },
  {
    id: 2,
    image: "/images/asha-2.webp",
    title: "The Challenge",
    eyebrow: "Longitudinal care is hard",
    description:
      "ASHA workers track dozens of patients over months — symptoms, medications, visits, follow-ups, and changing health conditions. The challenge isn't just collecting information — it's remembering how a patient's condition changes over time.",
    label: "THE CHALLENGE",
    node: "PROBLEM",
  },
  {
    id: 3,
    image: "/images/asha-3.jpg",
    title: "Every Language Matters",
    eyebrow: "Healthcare in your language",
    description:
      "Patients communicate in Marathi, Hindi, Gujarati, Tamil, Bengali, and more. Healthcare conversations shouldn't become harder because the patient doesn't speak English.",
    label: "EVERY LANGUAGE",
    node: "LANGUAGE",
  },
  {
    id: 4,
    image: "/images/asha-4.jpg",
    title: "Sanjeevani",
    eyebrow: "Life-giving care, revived by attention",
    description:
      "Observe → Remember → Reason → Replan. Sanjeevani continuously understands patient trajectories, detects meaningful changes, and helps ASHA workers provide timely, informed care.",
    label: "SANJEEVANI",
    node: "SOLUTION",
  },
];

// ============================================================
// COMPONENT
// ============================================================

export default function IntroCarousel({ onComplete }) {
  const [current, setCurrent] = useState(0);
  const [dragStart, setDragStart] = useState(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);
  const viewportRef = useRef(null);
  const textRef = useRef(null);

  const total = slides.length;

  // Retrigger text animation on slide change
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.classList.remove("carousel-text--animate");
    void el.offsetHeight;
    el.classList.add("carousel-text--animate");
  }, [animPhase]);

  // ---- Navigation ----

  const goTo = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(total - 1, index));
      if (clamped !== current) {
        setAnimPhase((k) => k + 1);
      }
      setCurrent(clamped);
    },
    [total, current]
  );

  const goNext = useCallback(() => {
    if (current < total - 1) {
      setAnimPhase((k) => k + 1);
      setCurrent((c) => c + 1);
    } else {
      onComplete?.();
    }
  }, [current, total, onComplete]);

  const goPrev = useCallback(() => {
    if (current > 0) {
      setAnimPhase((k) => k + 1);
      setCurrent((c) => c - 1);
    }
  }, [current]);

  // ---- Keyboard support ----

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onComplete?.();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onComplete]);

  // ---- Touch / mouse drag ----

  const SWIPE_THRESHOLD = 50;

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    setDragStart(e.clientX);
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (dragStart === null) return;
    const delta = e.clientX - dragStart;
    setDragDelta(delta);
  };

  const onPointerUp = () => {
    if (dragStart === null) return;

    if (Math.abs(dragDelta) > SWIPE_THRESHOLD) {
      if (dragDelta < 0 && current < total - 1) {
        setAnimPhase((k) => k + 1);
        setCurrent((c) => c + 1);
      } else if (dragDelta > 0 && current > 0) {
        setAnimPhase((k) => k + 1);
        setCurrent((c) => c - 1);
      }
    }

    setDragStart(null);
    setDragDelta(0);
    setIsDragging(false);
  };

  // ---- Compute slide offset ----

  const slideOffset = isDragging ? dragDelta : 0;
  const translateX =
    -(current * 100) +
    (slideOffset / (viewportRef.current?.offsetWidth || 1)) * 100;

  // ---- Current slide data ----

  const slide = slides[current];

  return (
    <div className="intro-carousel">
      {/* ---- Ambient background ---- */}
      <div className="carousel-bg-texture" />
      <div className="carousel-bg-grid" />
      <div className="carousel-bg-glow" style={{ "--glow-x": `${50 + (current - 1.5) * 8}%` }} />
      <div className="carousel-bg-orb carousel-bg-orb--1" />
      <div className="carousel-bg-orb carousel-bg-orb--2" />

      {/* ---- Floating particles ---- */}
      <div className="carousel-particles">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="carousel-particle"
            style={{
              "--px": `${8 + (i * 7) % 85}%`,
              "--py": `${10 + (i * 11) % 80}%`,
              "--delay": `${(i * 1.3) % 8}s`,
              "--dur": `${7 + (i * 1.7) % 7}s`,
              "--size": `${1.5 + (i % 4)}px`,
            }}
          />
        ))}
      </div>

      {/* ---- Top progress bar ---- */}
      <div className="carousel-progress-track">
        <div
          className="carousel-progress-bar"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {/* ---- Story label (top-left) ---- */}
      <div className="carousel-story-label" key={`label-${animPhase}`}>
        <span className="carousel-story-num">
          {String(current + 1).padStart(2, "0")}
        </span>
        <span className="carousel-story-sep">/</span>
        <span className="carousel-story-text">{slide.label}</span>
      </div>

      {/* ---- Counter (top-right) ---- */}
      <div className="carousel-counter">
        <div className="carousel-counter-main">
          <span className="carousel-counter-current">
            {String(current + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="carousel-counter-sub">
          <span className="carousel-counter-sep">/</span>
          <span className="carousel-counter-total">
            {String(total).padStart(2, "0")}
          </span>
        </div>
        <div className="carousel-counter-line">
          <div
            className="carousel-counter-line-fill"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* ---- Image viewport ---- */}
      <div
        className="carousel-viewport"
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div
          className="carousel-track"
          style={{
            transform: `translateX(${translateX}%)`,
            transition: isDragging
              ? "none"
              : "transform 0.55s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          {slides.map((s) => (
            <div className="carousel-slide" key={s.id}>
              <img
                src={s.image}
                alt={s.title}
                className="carousel-image"
                draggable={false}
              />
              <div className="carousel-image-fallback">
                <span>{s.title}</span>
              </div>
              <div className="carousel-image-overlay" />
            </div>
          ))}
        </div>

        {/* Arrow buttons */}
        <button
          className="carousel-arrow carousel-arrow-left"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={current === 0}
          aria-label="Previous slide"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <button
          className="carousel-arrow carousel-arrow-right"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Next slide"
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </div>

      {/* ---- Story path nodes ---- */}
      <div className="carousel-story-path">
        {slides.map((s, i) => (
          <div key={s.id} className="carousel-path-segment">
            <div
              className={`carousel-path-node ${
                i <= current ? "active" : ""
              } ${i === current ? "current" : ""}`}
            />
            {i < total - 1 && (
              <div
                className={`carousel-path-line ${
                  i < current ? "filled" : ""
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ---- Text area ---- */}
      <div
        className="carousel-text carousel-text--animate"
        ref={textRef}
        key={`text-${animPhase}`}
      >
        <p className="carousel-eyebrow">{slide.eyebrow}</p>
        <h2 className="carousel-title">{slide.title}</h2>
        <p className="carousel-description">{slide.description}</p>
      </div>

      {/* ---- Explore button ---- */}
      <button
        className="carousel-explore"
        onClick={onComplete}
        aria-label="Explore Sanjeevani"
      >
        <span>Explore Sanjeevani</span>
        <ArrowRight size={16} />
      </button>

      {/* ============================================================
          STYLES
          ============================================================ */}
      <style>{`
        /* ============================================================
           CAROUSEL — PREMIUM CINEMATIC DESIGN
           ============================================================ */

        .intro-carousel {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--bg-base, #020C1B);
          overflow: hidden;
          user-select: none;
          animation: introFadeIn 0.6s ease both;
        }

        @keyframes introFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* ---- Background texture ---- */
        .carousel-bg-texture {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.03;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
        }

        /* ---- Background grid ---- */
        .carousel-bg-grid {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: 0.03;
          background-image:
            linear-gradient(rgba(59, 130, 246, 0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.25) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 60% 50% at 50% 35%, black 10%, transparent 65%);
          -webkit-mask-image: radial-gradient(ellipse 60% 50% at 50% 35%, black 10%, transparent 65%);
        }

        /* ---- Ambient glow ---- */
        .carousel-bg-glow {
          position: absolute;
          top: -15%;
          left: var(--glow-x, 50%);
          transform: translateX(-50%);
          width: 700px;
          height: 420px;
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.06) 0%, rgba(16, 185, 129, 0.03) 40%, transparent 70%);
          filter: blur(80px);
          transition: left 0.8s ease;
          animation: glowBreathe 8s ease-in-out infinite;
        }

        @keyframes glowBreathe {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.8; transform: translateX(-50%) scale(1.08); }
        }

        /* ---- Ambient orbs ---- */
        .carousel-bg-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          filter: blur(100px);
        }

        .carousel-bg-orb--1 {
          bottom: 10%;
          left: 15%;
          width: 300px;
          height: 300px;
          background: rgba(16, 185, 129, 0.03);
          animation: orbFloat1 12s ease-in-out infinite;
        }

        .carousel-bg-orb--2 {
          top: 20%;
          right: 10%;
          width: 250px;
          height: 250px;
          background: rgba(59, 130, 246, 0.025);
          animation: orbFloat2 15s ease-in-out infinite;
        }

        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -15px); }
        }

        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-15px, 10px); }
        }

        /* ---- Floating particles ---- */
        .carousel-particles {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .carousel-particle {
          position: absolute;
          left: var(--px);
          top: var(--py);
          width: var(--size);
          height: var(--size);
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.12);
          animation: particleFloat var(--dur) ease-in-out var(--delay) infinite;
        }

        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          15% { opacity: 0.5; }
          50% { transform: translateY(-35px) translateX(12px); opacity: 0.3; }
          85% { opacity: 0.5; }
        }

        /* ---- Progress bar (top) ---- */
        .carousel-progress-track {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          z-index: 10;
          background: rgba(240, 244, 248, 0.04);
        }

        .carousel-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--blue, #2563EB), var(--teal, #10B981));
          transition: width 0.55s cubic-bezier(0.32, 0.72, 0, 1);
          border-radius: 0 1px 1px 0;
          box-shadow: 0 0 10px rgba(37, 99, 235, 0.5);
        }

        /* ---- Story label (top-left) ---- */
        .carousel-story-label {
          position: absolute;
          top: 24px;
          left: 32px;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: "Manrope", sans-serif;
          animation: storyLabelIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
        }

        @keyframes storyLabelIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .carousel-story-num {
          font-size: 11px;
          font-weight: 800;
          color: var(--blue, #2563EB);
          letter-spacing: 0.5px;
        }

        .carousel-story-sep {
          font-size: 10px;
          color: rgba(240, 244, 248, 0.15);
          font-weight: 400;
        }

        .carousel-story-text {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(240, 244, 248, 0.35);
        }

        /* ---- Counter (top-right) ---- */
        .carousel-counter {
          position: absolute;
          top: 22px;
          right: 32px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
          animation: counterIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
        }

        @keyframes counterIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .carousel-counter-main {
          display: flex;
          align-items: baseline;
        }

        .carousel-counter-current {
          font-family: "Manrope", sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: var(--blue, #2563EB);
          letter-spacing: -1px;
          line-height: 1;
        }

        .carousel-counter-sub {
          display: flex;
          align-items: baseline;
          gap: 1px;
        }

        .carousel-counter-sep {
          font-size: 11px;
          color: rgba(240, 244, 248, 0.15);
          font-weight: 300;
        }

        .carousel-counter-total {
          font-size: 11px;
          font-weight: 600;
          color: rgba(240, 244, 248, 0.25);
        }

        .carousel-counter-line {
          width: 48px;
          height: 2px;
          background: rgba(240, 244, 248, 0.06);
          border-radius: 1px;
          overflow: hidden;
        }

        .carousel-counter-line-fill {
          height: 100%;
          background: var(--blue, #2563EB);
          transition: width 0.55s cubic-bezier(0.32, 0.72, 0, 1);
          border-radius: 1px;
        }

        /* ---- Viewport ---- */
        .carousel-viewport {
          position: relative;
          width: calc(100% - 64px);
          max-width: 580px;
          aspect-ratio: 16 / 10;
          max-height: 48vh;
          overflow: hidden;
          margin-top: 52px;
          border-radius: 16px;
          touch-action: pan-y;
          z-index: 5;
          border: 1px solid rgba(240, 244, 248, 0.06);
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.3),
            0 12px 48px rgba(0, 0, 0, 0.5),
            0 4px 12px rgba(0, 0, 0, 0.3),
            0 0 80px -20px rgba(37, 99, 235, 0.08);
        }

        @media (max-width: 600px) {
          .carousel-viewport {
            width: 100%;
            max-width: 100%;
            margin-top: 0;
            margin-top: 44px;
            border-radius: 0;
            max-height: 40vh;
            border: none;
            border-bottom: 1px solid rgba(240, 244, 248, 0.06);
            box-shadow: none;
          }
          .carousel-story-label { top: 12px; left: 16px; }
          .carousel-counter { top: 12px; right: 16px; }
        }

        .carousel-track {
          display: flex;
          height: 100%;
          will-change: transform;
        }

        .carousel-slide {
          flex: 0 0 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        .carousel-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          pointer-events: none;
          position: relative;
          z-index: 1;
        }

        .carousel-slide .carousel-image {
          animation: imageKen 14s ease-in-out infinite alternate;
        }

        @keyframes imageKen {
          0% { transform: scale(1); }
          100% { transform: scale(1.03); }
        }

        .carousel-image-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(6, 13, 23, 0.12) 0%, transparent 25%, transparent 55%, rgba(6, 13, 23, 0.45) 100%),
            linear-gradient(90deg, rgba(6, 13, 23, 0.08) 0%, transparent 12%, transparent 88%, rgba(6, 13, 23, 0.08) 100%);
        }

        .carousel-image-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #112240, #0A1929);
          z-index: 0;
        }

        .carousel-image-fallback span {
          font-family: "Manrope", sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: rgba(59, 130, 246, 0.2);
          letter-spacing: -0.5px;
        }

        /* ---- Arrows ---- */
        .carousel-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(6, 13, 23, 0.5);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(240, 244, 248, 0.08);
          color: rgba(240, 244, 248, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
          z-index: 12;
        }

        .carousel-arrow:hover {
          background: rgba(37, 99, 235, 0.2);
          border-color: rgba(37, 99, 235, 0.3);
          color: #fff;
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 0 20px rgba(37, 99, 235, 0.15);
        }

        .carousel-arrow:active {
          transform: translateY(-50%) scale(0.96);
          transition-duration: 0.1s;
        }

        .carousel-arrow:disabled {
          opacity: 0.15;
          cursor: default;
          transform: translateY(-50%);
        }

        .carousel-arrow:disabled:hover {
          background: rgba(6, 13, 23, 0.5);
          border-color: rgba(240, 244, 248, 0.08);
          color: rgba(240, 244, 248, 0.7);
          box-shadow: none;
        }

        .carousel-arrow-left { left: 14px; }
        .carousel-arrow-right { right: 14px; }

        @media (max-width: 600px) {
          .carousel-arrow { width: 34px; height: 34px; }
          .carousel-arrow-left { left: 10px; }
          .carousel-arrow-right { right: 10px; }
        }

        /* ---- Story path nodes ---- */
        .carousel-story-path {
          display: flex;
          align-items: center;
          gap: 0;
          margin-top: 18px;
          z-index: 5;
          padding: 0 8px;
        }

        .carousel-path-segment {
          display: flex;
          align-items: center;
        }

        .carousel-path-node {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(240, 244, 248, 0.08);
          border: 1.5px solid rgba(240, 244, 248, 0.1);
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          flex-shrink: 0;
        }

        .carousel-path-node.active {
          background: var(--blue, #2563EB);
          border-color: var(--blue, #2563EB);
          box-shadow: 0 0 8px rgba(37, 99, 235, 0.3);
        }

        .carousel-path-node.current {
          width: 9px;
          height: 9px;
          box-shadow: 0 0 12px rgba(37, 99, 235, 0.4);
        }

        .carousel-path-line {
          width: 36px;
          height: 1.5px;
          background: rgba(240, 244, 248, 0.06);
          transition: background 0.4s ease;
          flex-shrink: 0;
        }

        .carousel-path-line.filled {
          background: rgba(37, 99, 235, 0.3);
        }

        @media (max-width: 600px) {
          .carousel-path-line { width: 24px; }
        }

        /* ---- Text area ---- */
        .carousel-text {
          text-align: center;
          max-width: 460px;
          padding: 0 28px;
          margin-top: 18px;
          z-index: 5;
        }

        .carousel-text--animate .carousel-eyebrow {
          animation: eyebrowIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
        }

        .carousel-text--animate .carousel-title {
          animation: titleIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;
        }

        .carousel-text--animate .carousel-description {
          animation: descIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
        }

        @keyframes eyebrowIn {
          from { opacity: 0; transform: translateY(8px); letter-spacing: 4px; }
          to { opacity: 1; transform: translateY(0); letter-spacing: 2px; }
        }

        @keyframes titleIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes descIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .carousel-eyebrow {
          margin: 0 0 6px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(240, 244, 248, 0.3);
          line-height: 1.3;
        }

        .carousel-title {
          margin: 0 0 10px;
          font-family: "Manrope", sans-serif;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.8px;
          color: var(--text, #F0F4F8);
          line-height: 1.15;
        }

        .carousel-description {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.7;
          color: var(--muted, rgba(148, 163, 184, 1));
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }

        @media (max-width: 600px) {
          .carousel-text { padding: 0 22px; margin-top: 14px; }
          .carousel-title { font-size: 24px; }
          .carousel-description { font-size: 12.5px; line-height: 1.65; }
          .carousel-eyebrow { font-size: 9px; }
        }

        /* ---- Explore button ---- */
        .carousel-explore {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: auto;
          margin-bottom: 28px;
          padding: 12px 30px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.9), rgba(29, 78, 216, 0.95));
          color: #fff;
          font-family: "Manrope", sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: 0.3px;
          cursor: pointer;
          border: none;
          z-index: 5;
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow:
            0 4px 20px rgba(37, 99, 235, 0.3),
            0 0 40px -10px rgba(37, 99, 235, 0.15);
          animation: exploreIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
        }

        @keyframes exploreIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .carousel-explore:hover {
          transform: translateY(-2px);
          box-shadow:
            0 6px 28px rgba(37, 99, 235, 0.4),
            0 0 60px -10px rgba(37, 99, 235, 0.2);
        }

        .carousel-explore:active {
          transform: translateY(0);
          transition-duration: 0.1s;
        }

        .carousel-explore svg {
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .carousel-explore:hover svg {
          transform: translateX(4px);
        }

        @media (max-width: 600px) {
          .carousel-explore {
            margin-bottom: 22px;
            padding: 11px 26px;
            font-size: 12.5px;
          }
        }
      `}</style>
    </div>
  );
}
