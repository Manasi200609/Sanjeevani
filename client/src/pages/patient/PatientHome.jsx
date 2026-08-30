import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ArrowRight, HeartPulse, Activity, CalendarClock, Pill } from "lucide-react";
import PatientSectionHeader from "../../components/patient/shared/PatientSectionHeader";
import QuickActionCard from "../../components/patient/home/QuickActionCard";
import { getPatients, getPatientTimeline, getActiveCarePlan } from "../../services/api";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function PatientHome() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [carePlan, setCarePlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const pData = await getPatients();
        const patients = pData?.patients || [];
        if (patients.length === 0) return;

        const p = patients[0];
        setPatient(p);

        const [tData, cpData] = await Promise.allSettled([
          getPatientTimeline(p._id),
          getActiveCarePlan(p._id),
        ]);

        if (tData.status === "fulfilled") {
          setTimeline(tData.value?.timeline || []);
        }
        if (cpData.status === "fulfilled") {
          setCarePlan(cpData.value?.carePlan || cpData.value?.plan || null);
        }
      } catch (err) {
        console.error("Failed to load patient home data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const name = patient?.name?.split(" ")[0] || "";
  const trajectory = patient?.trajectoryStatus || "unknown";
  const followUpDays = carePlan?.followUp?.intervalDays || patient?.followUp?.intervalDays || null;
  const recentEvents = timeline.slice(0, 3);

  const trajectoryColor = {
    worsening: "#EF4444",
    stable: "#22C55E",
    improving: "#22C55E",
    critical: "#EF4444",
  };

  return (
    <div className="p-home">
      {/* ---- HEADER ---- */}
      <div className="p-home-header">
        <div>
          <div className="p-home-eyebrow">VAIDYA</div>
          <h1 className="p-home-greeting">
            {getGreeting()}{name ? `, ${name}` : ""}
          </h1>
          <p className="p-home-subtitle">
            How are you feeling today?
          </p>
        </div>
      </div>

      {/* ---- VAIDYA INTRO CARD ---- */}
      <div className="p-vaidya-card" onClick={() => navigate("/patient/chat")}>
        <div className="p-vaidya-left">
          <div className="p-vaidya-icon">
            <HeartPulse size={24} />
          </div>
          <div>
            <div className="p-vaidya-label">VAIDYA</div>
            <h2 className="p-vaidya-title">Your intelligent health companion</h2>
            <p className="p-vaidya-desc">
              Ask questions, describe how you're feeling, and stay connected with your care journey.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="p-vaidya-cta"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/patient/chat");
          }}
        >
          Talk to Vaidya <ArrowRight size={15} />
        </button>
      </div>

      {/* ---- HEALTH SUMMARY (real data) ---- */}
      {!loading && patient && (
        <>
          <PatientSectionHeader
            eyebrow="YOUR HEALTH"
            title="Health Summary"
          />
          <div className="p-home-summary-grid">
            <div className="p-home-summary-card">
              <div className="p-home-summary-icon" style={{ background: "rgba(34, 197, 94, 0.12)", color: "#22C55E" }}>
                <HeartPulse size={18} />
              </div>
              <div className="p-home-summary-label">Current Status</div>
              <div className="p-home-summary-value" style={{ color: trajectoryColor[trajectory] || "#F0F4F8" }}>
                {trajectory.charAt(0).toUpperCase() + trajectory.slice(1)}
              </div>
              <div className="p-home-summary-note">Based on latest assessment</div>
            </div>

            <div className="p-home-summary-card">
              <div className="p-home-summary-icon" style={{ background: "rgba(20, 184, 166, 0.12)", color: "#14B8A6" }}>
                <CalendarClock size={18} />
              </div>
              <div className="p-home-summary-label">Follow-up</div>
              <div className="p-home-summary-value">
                {followUpDays ? `Every ${followUpDays} days` : "Not scheduled"}
              </div>
              <div className="p-home-summary-note">Care plan interval</div>
            </div>

            <div className="p-home-summary-card">
              <div className="p-home-summary-icon" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" }}>
                <Activity size={18} />
              </div>
              <div className="p-home-summary-label">Recent Events</div>
              <div className="p-home-summary-value">
                {timeline.length > 0 ? `${timeline.length} recorded` : "None yet"}
              </div>
              <div className="p-home-summary-note">Health updates</div>
            </div>
          </div>
        </>
      )}

      {/* ---- RECENT HEALTH UPDATES ---- */}
      {!loading && recentEvents.length > 0 && (
        <>
          <PatientSectionHeader
            eyebrow="RECENT"
            title="Latest Health Updates"
          />
          <div className="p-home-events">
            {recentEvents.map((event, i) => (
              <div key={event._id || i} className="p-home-event-item">
                <div className="p-home-event-dot" />
                <div className="p-home-event-content">
                  <div className="p-home-event-type">
                    {(event.eventType || "update").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}
                  </div>
                  {event.symptoms?.length > 0 && (
                    <div className="p-home-event-detail">
                      {event.symptoms.map((s, j) => (
                        <span key={j} className="p-home-event-symptom">
                          {s.name}
                          {s.status && <span className={`p-home-event-status ${s.status}`}>{s.status}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  {event.notes && (
                    <div className="p-home-event-notes">{event.notes.slice(0, 120)}...</div>
                  )}
                  <div className="p-home-event-time">
                    {new Date(event.timestamp).toLocaleDateString([], { day: "numeric", month: "short" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---- QUICK ACTIONS ---- */}
      <div className="p-home-bottom">
        <div className="p-home-actions">
          <PatientSectionHeader
            eyebrow="SHORTCUTS"
            title="Quick Actions"
          />
          <QuickActionCard />
        </div>
      </div>

      <style>{`
        .p-home {
          max-width: 900px;
          background: transparent;
        }

        .p-home-header {
          margin-bottom: 24px;
        }

        .p-home-eyebrow {
          color: #14B8A6;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          margin-bottom: 4px;
        }

        .p-home-greeting {
          margin: 0;
          font-family: "Manrope", sans-serif;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.7px;
          color: #F0F4F8;
        }

        .p-home-subtitle {
          margin: 6px 0 0;
          color: #64748B;
          font-size: 13px;
        }

        .p-vaidya-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 24px 28px;
          margin-bottom: 32px;
          background: #0D2E2A;
          border: 1px solid #1B453F;
          border-radius: 14px;
          cursor: pointer;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }

        .p-vaidya-card:hover {
          box-shadow: 0 8px 24px rgba(15, 43, 38, 0.3);
          transform: translateY(-1px);
        }

        .p-vaidya-left {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          flex: 1;
          min-width: 0;
        }

        .p-vaidya-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: rgba(20, 184, 166, 0.15);
          color: #14B8A6;
          flex-shrink: 0;
        }

        .p-vaidya-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #64748B;
          margin-bottom: 4px;
        }

        .p-vaidya-title {
          margin: 0;
          font-family: "Manrope", sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: #F0F4F8;
          letter-spacing: -0.3px;
        }

        .p-vaidya-desc {
          margin: 6px 0 0;
          color: #94A3B8;
          font-size: 12px;
          line-height: 1.6;
          max-width: 400px;
        }

        .p-vaidya-cta {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          border-radius: 9px;
          background: #0F766E;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
          transition: opacity 0.18s ease;
          border: 0;
          cursor: pointer;
        }

        .p-vaidya-cta:hover {
          opacity: 0.9;
        }

        .p-home-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 32px;
          width: 100%;
          min-width: 0;
        }

        .p-home-summary-card {
          padding: 18px;
          background: #0D2E2A;
          border: 1px solid #1B453F;
          border-radius: 12px;
        }

        .p-home-summary-icon {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px; margin-bottom: 10px;
        }

        .p-home-summary-label {
          font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
          color: #64748B; margin-bottom: 3px;
        }

        .p-home-summary-value {
          font-family: "Manrope", sans-serif;
          font-size: 15px; font-weight: 700; color: #F0F4F8;
        }

        .p-home-summary-note {
          margin-top: 4px; font-size: 10px; color: #64748B;
        }

        .p-home-events {
          margin-bottom: 32px;
          background: #0D2E2A;
          border: 1px solid #1B453F;
          border-radius: 12px;
          overflow: hidden;
        }

        .p-home-event-item {
          display: flex; gap: 12px; padding: 14px 18px;
          border-bottom: 1px solid #1B453F;
        }

        .p-home-event-item:last-child { border-bottom: 0; }

        .p-home-event-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #22C55E; margin-top: 5px; flex-shrink: 0;
        }

        .p-home-event-content { flex: 1; min-width: 0; }

        .p-home-event-type {
          font-size: 11px; font-weight: 700; color: #F0F4F8;
          letter-spacing: 0.3px; margin-bottom: 2px;
        }

        .p-home-event-detail {
          display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;
        }

        .p-home-event-symptom {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; color: #94A3B8;
          padding: 1px 6px; border-radius: 4px;
          background: #123B35;
        }

        .p-home-event-status {
          font-size: 8px; font-weight: 700; text-transform: uppercase;
        }
        .p-home-event-status.worsening { color: #EF4444; }
        .p-home-event-status.new { color: #F59E0B; }
        .p-home-event-status.improving { color: #22C55E; }

        .p-home-event-notes {
          font-size: 11px; color: #94A3B8; margin-top: 4px; line-height: 1.5;
        }

        .p-home-event-time {
          font-size: 9px; color: #64748B; margin-top: 4px;
        }

        .p-home-bottom {
          margin-top: 24px;
        }

        @media (max-width: 700px) {
          .p-home-summary-grid {
            grid-template-columns: 1fr;
          }
          .p-vaidya-card {
            flex-direction: column;
            align-items: stretch;
          }
          .p-vaidya-cta {
            align-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
