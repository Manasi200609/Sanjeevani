import { useState, useEffect } from "react";
import {
  HeartPulse,
  Activity,
  CalendarClock,
  Pill,
  Loader2,
} from "lucide-react";
import PatientSectionHeader from "../../components/patient/shared/PatientSectionHeader";
import {
  getPatients,
  getPatientTimeline,
  getActiveCarePlan,
} from "../../services/api";

export default function PatientHealth() {
  const [patient, setPatient] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [carePlan, setCarePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const pData = await getPatients();
        const patients = pData?.patients || [];
        if (patients.length === 0) {
          setError("No patient found.");
          return;
        }

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
        setError(err.message || "Failed to load health data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-health-page">
        <PatientSectionHeader eyebrow="YOUR HEALTH" title="My Health" />
        <div className="p-health-loading">
          <Loader2 size={20} className="spin" />
          Loading health data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-health-page">
        <PatientSectionHeader eyebrow="YOUR HEALTH" title="My Health" />
        <div className="p-health-error">{error}</div>
      </div>
    );
  }

  const trajectory = patient?.trajectoryStatus || "unknown";
  const followUpDays = carePlan?.followUp?.intervalDays || patient?.followUp?.intervalDays || null;
  const priority = patient?.priority || "normal";
  const latestEvent = timeline[0] || null;
  const recentSymptoms = latestEvent?.symptoms || [];

  const trajectoryColors = {
    worsening: { bg: "rgba(239, 68, 68, 0.12)", color: "#EF4444" },
    stable: { bg: "rgba(34, 197, 94, 0.12)", color: "#22C55E" },
    improving: { bg: "rgba(34, 197, 94, 0.12)", color: "#22C55E" },
    critical: { bg: "rgba(239, 68, 68, 0.12)", color: "#EF4444" },
  };

  const tc = trajectoryColors[trajectory] || { bg: "#123B35", color: "#64748B" };

  return (
    <div className="p-health-page">
      <PatientSectionHeader eyebrow="YOUR HEALTH" title="My Health" />

      {/* ---- OVERVIEW ---- */}
      <div className="p-health-overview">
        <div className="p-health-card">
          <div className="p-health-card-icon" style={{ background: "rgba(34, 197, 94, 0.12)", color: "#22C55E" }}>
            <HeartPulse size={20} />
          </div>
          <div className="p-health-card-label">Current Status</div>
          <div className="p-health-card-value" style={{ color: tc.color }}>
            {trajectory.charAt(0).toUpperCase() + trajectory.slice(1)}
          </div>
          <div className="p-health-card-note">Based on latest assessment</div>
        </div>

        <div className="p-health-card">
          <div className="p-health-card-icon" style={{ background: "rgba(20, 184, 166, 0.12)", color: "#14B8A6" }}>
            <CalendarClock size={20} />
          </div>
          <div className="p-health-card-label">Next Follow-up</div>
          <div className="p-health-card-value">
            {followUpDays ? `Every ${followUpDays} days` : "Not scheduled"}
          </div>
          <div className="p-health-card-note">
            {carePlan?.status === "active" ? "Active care plan" : "Care plan status unknown"}
          </div>
        </div>

        <div className="p-health-card">
          <div className="p-health-card-icon" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" }}>
            <Activity size={20} />
          </div>
          <div className="p-health-card-label">Priority</div>
          <div className="p-health-card-value">
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </div>
          <div className="p-health-card-note">Care priority level</div>
        </div>
      </div>

      {/* ---- LATEST SYMPTOMS ---- */}
      <PatientSectionHeader eyebrow="CURRENT" title="Latest Observations" />

      {recentSymptoms.length > 0 ? (
        <div className="p-health-symptoms">
          {recentSymptoms.map((s, i) => (
            <div key={i} className="p-health-symptom-item">
              <div className="p-health-symptom-name">{s.name}</div>
              <div className="p-health-symptom-meta">
                <span className="p-health-symptom-severity">
                  Severity: {s.severity}/10
                </span>
                {s.status && (
                  <span className={`p-health-symptom-status ${s.status}`}>
                    {s.status}
                  </span>
                )}
              </div>
            </div>
          ))}
          {latestEvent?.notes && (
            <div className="p-health-symptom-notes">
              {latestEvent.notes}
            </div>
          )}
        </div>
      ) : (
        <div className="p-health-card">
          <div className="p-health-card-icon" style={{ background: "#123B35", color: "#64748B" }}>
            <Activity size={20} />
          </div>
          <div className="p-health-card-label">No recent observations</div>
          <div className="p-health-card-note">
            {timeline.length > 0
              ? "No symptom data in your most recent health event."
              : "Your health updates will appear here after your next visit or conversation with Vaidya."}
          </div>
        </div>
      )}

      {/* ---- CARE PLAN DETAILS ---- */}
      {carePlan && (
        <>
          <PatientSectionHeader eyebrow="CARE" title="Your Care Plan" />
          <div className="p-health-card">
            <div className="p-health-card-icon" style={{ background: "rgba(34, 197, 94, 0.12)", color: "#22C55E" }}>
              <Pill size={20} />
            </div>
            <div className="p-health-card-label">Active Plan</div>
            <div className="p-health-card-value">
              Follow-up every {carePlan.followUp?.intervalDays || "?"} days
            </div>
            <div className="p-health-card-note">
              Version {carePlan.version || 1}
              {carePlan.actions?.length > 0 && ` · ${carePlan.actions.length} action(s)`}
            </div>
          </div>
        </>
      )}

      <style>{`
        .p-health-page {
          max-width: 800px;
          width: 100%;
          min-width: 0;
        }

        .p-health-loading {
          display: flex; align-items: center; gap: 8px;
          padding: 40px; color: #64748B; font-size: 12px;
          justify-content: center;
        }

        .p-health-error {
          padding: 12px 16px; border-radius: 8px;
          background: rgba(239, 68, 68, 0.12); color: #EF4444;
          font-size: 11px; font-weight: 500;
        }

        .p-health-overview {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 32px;
          width: 100%;
          min-width: 0;
        }

        .p-health-card {
          padding: 20px;
          background: #0D2E2A;
          border: 1px solid #1B453F;
          border-radius: 12px;
        }

        .p-health-card-icon {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 9px; margin-bottom: 12px;
        }

        .p-health-card-label {
          font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
          color: #64748B; margin-bottom: 4px;
        }

        .p-health-card-value {
          font-family: "Manrope", sans-serif;
          font-size: 16px; font-weight: 700; color: #F0F4F8;
        }

        .p-health-card-note {
          margin-top: 6px; font-size: 11px; color: #64748B;
        }

        .p-health-symptoms {
          background: #0D2E2A;
          border: 1px solid #1B453F;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 32px;
        }

        .p-health-symptom-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid #1B453F;
        }
        .p-health-symptom-item:last-child { border-bottom: 0; }

        .p-health-symptom-name {
          font-size: 13px; font-weight: 600; color: #F0F4F8;
        }

        .p-health-symptom-meta {
          display: flex; align-items: center; gap: 8px;
        }

        .p-health-symptom-severity {
          font-size: 11px; color: #94A3B8;
        }

        .p-health-symptom-status {
          font-size: 9px; font-weight: 700; text-transform: uppercase;
          padding: 2px 6px; border-radius: 4px;
        }
        .p-health-symptom-status.worsening { background: rgba(239, 68, 68, 0.12); color: #EF4444; }
        .p-health-symptom-status.new { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
        .p-health-symptom-status.improving { background: rgba(20, 184, 166, 0.12); color: #14B8A6; }
        .p-health-symptom-status.stable { background: rgba(20, 184, 166, 0.12); color: #14B8A6; }

        .p-health-symptom-notes {
          padding: 12px 18px;
          font-size: 11px; color: #94A3B8; line-height: 1.6;
          background: #123B35;
        }

        @media (max-width: 600px) {
          .p-health-overview {
            grid-template-columns: 1fr;
          }
        }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
