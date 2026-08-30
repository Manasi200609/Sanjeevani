import { useState, useCallback } from "react";
import SplashScreen from "../components/landing/SplashScreen";
import IntroCarousel from "../components/landing/IntroCarousel";
import RoleSelector from "../components/landing/RoleSelector";

// ============================================================
// INTRO STATE
// ============================================================
// Key in localStorage. Delete it to re-show the intro.
//   localStorage.removeItem("careflow_intro_seen")
// ============================================================

const INTRO_KEY = "careflow_intro_seen";

function hasSeenIntro() {
  // In development, always show the intro (no localStorage skip)
  if (import.meta.env.DEV) return false;
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    // localStorage unavailable — ignore
  }
}

// ============================================================
// LANDING PAGE
// ============================================================

export default function Landing() {
  // Start with splash, then carousel (unless already seen), then role selector
  const [phase, setPhase] = useState("splash"); // splash | carousel | roles

  const handleSplashComplete = useCallback(() => {
    // If user has already seen the intro, skip straight to role selector
    if (hasSeenIntro()) {
      setPhase("roles");
    } else {
      setPhase("carousel");
    }
  }, []);

  const handleCarouselComplete = useCallback(() => {
    markIntroSeen();
    setPhase("roles");
  }, []);

  // ---- Splash ----
  if (phase === "splash") {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // ---- Carousel ----
  if (phase === "carousel") {
    return <IntroCarousel onComplete={handleCarouselComplete} />;
  }

  // ---- Role Selector (existing) ----
  return <RoleSelector />;
}
