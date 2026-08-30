import { useState, useEffect } from "react";
import { Clock3, Activity, Pill, Stethoscope } from "lucide-react";
import PatientSectionHeader from "../../components/patient/shared/PatientSectionHeader";
import { getPatients, getPatientTimeline } from "../../services/api";

const EVENT_ICONS = {
  visit: Stethoscope,
  symptom_update: Activity,
  medication_update: Pill,
  vital_update: Activity,
};

const fmt = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function PatientTimeline() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTimeline = async () => {
      try {
        setLoading(true);
        const pData = await getPatients();
        const patients = pData?.patients || [];
        if (patients.length === 0) {
          setError("No patients found.");
          return;
        }
        const patientId = patients[0]._id;
        const tData = await getPatientTimeline(patientId);
        setEvents(tData?.timeline || []);
      } catch (err) {
        setError(err.message || "Failed to load timeline.");
      } finally {
        setLoading(false);
      }
    };
    loadTimeline();
  }, []);

  return (
    <div className="p-timeline-page">
      <PatientSectionHeader
        eyebrow="LONGITUDINAL RECORD"
        title="Health Timeline"
      />

      {loading && (
        <div className="p-timeline-loading">
          <Clock3 size={18} className="spin" />
          Loading timeline...
        </div>
      )}

      {error && (
        <div className="p-timeline-error">{error}</div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="p-timeline-empty">
          <div className="p-timeline-empty-icon">
            <Clock3 size={32} />
          </div>
          <h3>No timeline events yet</h3>
          <p>
            Your health visits, symptoms, and care updates
            will appear here as your longitudinal record
            grows. Talk to Vaidya to get started.
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="p-timeline-list">
          {events.map((event, i) => {
            const Icon = EVENT_ICONS[event.eventType] || Activity;
            return (
              <div key={event._id || i} className="p-timeline-item">
                <div className="p-timeline-marker">
                  <Icon size={16} />
                  {i < events.length - 1 && <div className="p-timeline-line" />}
                </div>
                <div className="p-timeline-card">
                  <div className="p-timeline-card-header">
                    <span className="p-timeline-type">{fmt(event.eventType)}</span>
                    <span className="p-timeline-date">{fmtDate(event.timestamp)}</span>
                  </div>

                  {event.symptoms?.length > 0 && (
                    <div className="p-timeline-section">
                      <strong>Symptoms</strong>
                      {event.symptoms.map((s, j) => (
                        <div key={j} className="p-timeline-detail">
                          {s.name} — severity {s.severity}/10
                          {s.status && <span className={`p-timeline-status ${s.status}`}>{fmt(s.status)}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {event.medications?.length > 0 && (
                    <div className="p-timeline-section">
                      <strong>Medication</strong>
                      {event.medications.map((m, j) => (
                        <div key={j} className="p-timeline-detail">
                          {m.name} — {fmt(m.adherence)}
                        </div>
                      ))}
                    </div>
                  )}

                  {event.notes && (
                    <div className="p-timeline-notes">{event.notes}</div>
                  )}

                  <div className="p-timeline-meta">
                    Source: {fmt(event.source)}
                    {event.severity && event.severity !== "low" && (
                      <span className={`p-timeline-severity ${event.severity}`}>{fmt(event.severity)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .p-timeline-page { max-width: 800px; width: 100%; min-width: 0; }

        .p-timeline-loading {
          display: flex; align-items: center; gap: 8px;
          padding: 40px; color: #64748B; font-size: 12px;
          justify-content: center;
        }

        .p-timeline-error {
          padding: 12px 16px; border-radius: 8px;
          background: rgba(239, 68, 68, 0.12); color: #EF4444;
          font-size: 11px; font-weight: 500;
        }

        .p-timeline-empty {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; padding: 60px 20px;
          background: #0D2E2A; border: 1px solid #1B453F;
          border-radius: 12px;
        }
        .p-timeline-empty-icon {
          width: 56px; height: 56px; display: flex; align-items: center;
          justify-content: center; border-radius: 15px;
          background: rgba(20, 184, 166, 0.12); color: #14B8A6; margin-bottom: 16px;
        }
        .p-timeline-empty h3 { margin: 0 0 6px; font-family: "Manrope", sans-serif;
          font-size: 16px; font-weight: 700; color: #F0F4F8; }
        .p-timeline-empty p { margin: 0; color: #94A3B8; font-size: 12px;
          line-height: 1.6; max-width: 340px; }

        .p-timeline-list { display: flex; flex-direction: column; gap: 0; }

        .p-timeline-item { display: flex; gap: 14px; }

        .p-timeline-marker {
          display: flex; flex-direction: column; align-items: center;
          width: 32px; flex-shrink: 0; padding-top: 16px;
          color: #14B8A6;
        }
        .p-timeline-line {
          width: 2px; flex: 1; background: #1B453F;
          margin-top: 6px; border-radius: 1px;
        }

        .p-timeline-card {
          flex: 1; padding: 16px 18px; margin-bottom: 12px;
          background: #0D2E2A; border: 1px solid #1B453F;
          border-radius: 11px;
        }

        .p-timeline-card-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 10px;
        }
        .p-timeline-type {
          font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          color: #14B8A6; text-transform: uppercase;
        }
        .p-timeline-date { font-size: 10px; color: #64748B; }

        .p-timeline-section { margin-bottom: 8px; }
        .p-timeline-section strong {
          display: block; font-size: 10px; font-weight: 600;
          color: #94A3B8; margin-bottom: 4px;
        }
        .p-timeline-detail {
          font-size: 12px; color: #F0F4F8; line-height: 1.6;
        }

        .p-timeline-status {
          display: inline-block; margin-left: 6px; padding: 1px 6px;
          border-radius: 4px; font-size: 9px; font-weight: 600;
        }
        .p-timeline-status.worsening { background: rgba(239, 68, 68, 0.12); color: #EF4444; }
        .p-timeline-status.new { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
        .p-timeline-status.improving { background: rgba(20, 184, 166, 0.12); color: #14B8A6; }
        .p-timeline-status.stable { background: rgba(20, 184, 166, 0.12); color: #14B8A6; }

        .p-timeline-notes {
          margin: 8px 0; padding: 8px 10px; border-radius: 6px;
          background: #123B35; font-size: 11px; color: #94A3B8;
          line-height: 1.5;
        }

        .p-timeline-meta {
          display: flex; align-items: center; gap: 8px;
          margin-top: 8px; font-size: 9px; color: #64748B;
        }

        .p-timeline-severity {
          padding: 1px 6px; border-radius: 4px; font-weight: 600;
        }
        .p-timeline-severity.moderate { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
        .p-timeline-severity.high { background: rgba(239, 68, 68, 0.12); color: #EF4444; }
        .p-timeline-severity.critical { background: rgba(239, 68, 68, 0.12); color: #EF4444; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
