import {
  Activity,
  CalendarDays,
  CircleAlert,
  Pill,
  Stethoscope,
  HeartPulse,
  Thermometer,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

const fmt = (v) => String(v || "").replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Date unavailable";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
};

const formatTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const severityColor = (sev) => {
  if (sev === "critical") return "#EF4444";
  if (sev === "high") return "#F87171";
  if (sev === "moderate") return "#F59E0B";
  if (sev === "low") return "#22C55E";
  return "#64748B";
};

const trajectoryColor = (t) => {
  if (t === "worsening") return "#F59E0B";
  if (t === "improving") return "#22C55E";
  if (t === "stable") return "#3B82F6";
  return "#64748B";
};

const adherenceColor = (a) => {
  if (a === "good") return "#22C55E";
  if (a === "partial") return "#F59E0B";
  if (a === "poor") return "#EF4444";
  return "#64748B";
};

const statusColor = (s) => {
  if (s === "worsening") return "#F59E0B";
  if (s === "improving") return "#22C55E";
  if (s === "stable") return "#3B82F6";
  if (s === "new") return "#8B5CF6";
  if (s === "resolved") return "#64748B";
  return "#94A3B8";
};

const getEventIcon = (eventType) => {
  switch (eventType) {
    case "visit": return Stethoscope;
    case "medication": return Pill;
    case "alert": return CircleAlert;
    case "symptom_update": return Activity;
    case "vital_update": return HeartPulse;
    case "agent_decision": return AlertTriangle;
    default: return Activity;
  }
};

const getEventTitle = (event) => {
  const base = fmt(event.eventType || "event");
  if (event.eventType === "visit") {
    if (event.severity === "high" || event.severity === "critical") return "Urgent Visit";
    if (event.severity === "moderate") return "Follow-up Visit";
    return "Routine Visit";
  }
  return base;
};

export default function TimelineEvent({ event, isLast = false }) {
  const [expanded, setExpanded] = useState(true);
  if (!event) return null;
  const Icon = getEventIcon(event.eventType);
  const title = getEventTitle(event);
  const hasVitals = event.vitals && (event.vitals.heartRate || event.vitals.systolicBP || event.vitals.temperature || event.vitals.oxygenSaturation);
  const hasSymptoms = event.symptoms?.length > 0;
  const hasMedications = event.medications?.length > 0;
  const hasAnalysis = event.riskScore !== undefined || event.trajectorySignal;
  const hasNotes = event.notes;
  const hasAnyContent = hasVitals || hasSymptoms || hasMedications || hasAnalysis || hasNotes;
  const sourceLabel = fmt(event.source || "unknown");

  return (
    <div className={`timeline-event ${isLast ? "last" : ""}`} style={{ position: "relative" }}>
      <div className="timeline-marker">
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: event.eventType === "agent_decision" ? "rgba(139,92,246,0.2)" : "rgba(59,130,246,0.15)", border: `2px solid ${event.eventType === "agent_decision" ? "#8B5CF6" : "#1E3A52"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={15} style={{ color: event.eventType === "agent_decision" ? "#8B5CF6" : "#3B82F6" }} />
        </div>
      </div>
      {!isLast && <div className="timeline-line" />}
      <div className="timeline-event-content" style={{ background: "#0C1829", border: "1px solid #1A2E47", borderRadius: "14px", padding: "18px 20px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <span style={{ fontSize: "15px", fontWeight: 600, color: "#F0F4F8" }}>{title}</span>
              {event.severity && event.severity !== "low" && (
                <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: severityColor(event.severity), background: `${severityColor(event.severity)}18`, padding: "2px 8px", borderRadius: "6px" }}>
                  {fmt(event.severity)}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#64748B" }}>
              <CalendarDays size={13} />
              <span>{formatDate(event.timestamp)}</span>
              {formatTime(event.timestamp) && (<><span style={{ opacity: 0.5 }}>·</span><span>{formatTime(event.timestamp)}</span></>)}
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{sourceLabel}</span>
            </div>
          </div>
          {hasAnyContent && (
            <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: "4px", display: "flex", alignItems: "center" }}>
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
        {expanded && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {hasSymptoms && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B", marginBottom: "8px" }}>Symptoms</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {event.symptoms.map((symptom, i) => (
                    <div key={symptom._id || `${symptom.name}-${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#111F33", borderRadius: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Activity size={14} style={{ color: "#3B82F6" }} />
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#F0F4F8" }}>{symptom.name}</span>
                        {symptom.status && (<span style={{ fontSize: "11px", fontWeight: 600, color: statusColor(symptom.status), background: `${statusColor(symptom.status)}18`, padding: "1px 6px", borderRadius: "4px" }}>{fmt(symptom.status)}</span>)}
                      </div>
                      {symptom.severity !== undefined && (<span style={{ fontSize: "13px", fontWeight: 600, color: "#F0F4F8" }}>{symptom.severity}<span style={{ fontWeight: 400, color: "#64748B" }}>/10</span></span>)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {hasVitals && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B", marginBottom: "8px" }}>Vitals</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
                  {event.vitals.heartRate !== undefined && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#111F33", borderRadius: "8px" }}>
                      <HeartPulse size={14} style={{ color: "#EF4444" }} />
                      <div><div style={{ fontSize: "11px", color: "#64748B" }}>Heart Rate</div><div style={{ fontSize: "14px", fontWeight: 600, color: "#F0F4F8" }}>{event.vitals.heartRate} <span style={{ fontWeight: 400, fontSize: "12px", color: "#64748B" }}>bpm</span></div></div>
                    </div>
                  )}
                  {event.vitals.systolicBP !== undefined && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#111F33", borderRadius: "8px" }}>
                      <Activity size={14} style={{ color: "#3B82F6" }} />
                      <div><div style={{ fontSize: "11px", color: "#64748B" }}>Blood Pressure</div><div style={{ fontSize: "14px", fontWeight: 600, color: "#F0F4F8" }}>{event.vitals.systolicBP}/{event.vitals.diastolicBP} <span style={{ fontWeight: 400, fontSize: "12px", color: "#64748B" }}>mmHg</span></div></div>
                    </div>
                  )}
                  {event.vitals.oxygenSaturation !== undefined && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#111F33", borderRadius: "8px" }}>
                      <Stethoscope size={14} style={{ color: "#22C55E" }} />
                      <div><div style={{ fontSize: "11px", color: "#64748B" }}>SpO2</div><div style={{ fontSize: "14px", fontWeight: 600, color: "#F0F4F8" }}>{event.vitals.oxygenSaturation}<span style={{ fontWeight: 400, fontSize: "12px", color: "#64748B" }}>%</span></div></div>
                    </div>
                  )}
                  {event.vitals.temperature !== undefined && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#111F33", borderRadius: "8px" }}>
                      <Thermometer size={14} style={{ color: "#F59E0B" }} />
                      <div><div style={{ fontSize: "11px", color: "#64748B" }}>Temperature</div><div style={{ fontSize: "14px", fontWeight: 600, color: "#F0F4F8" }}>{event.vitals.temperature}°C</div></div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {hasMedications && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B", marginBottom: "8px" }}>Medication</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {event.medications.map((med, i) => (
                    <div key={med._id || `${med.name}-${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#111F33", borderRadius: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Pill size={14} style={{ color: "#3B82F6" }} />
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#F0F4F8" }}>{med.name}</span>
                        {med.notes && <span style={{ fontSize: "12px", color: "#64748B" }}> · {med.notes}</span>}
                      </div>
                      {med.adherence && (<span style={{ fontSize: "12px", fontWeight: 600, color: adherenceColor(med.adherence), background: `${adherenceColor(med.adherence)}18`, padding: "2px 8px", borderRadius: "4px" }}>{fmt(med.adherence)}</span>)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {hasAnalysis && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B", marginBottom: "8px" }}>Assessment</div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {event.riskScore !== undefined && (
                    <div style={{ padding: "10px 14px", background: "#111F33", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <AlertTriangle size={15} style={{ color: event.riskScore > 50 ? "#EF4444" : event.riskScore > 25 ? "#F59E0B" : "#22C55E" }} />
                      <div><div style={{ fontSize: "11px", color: "#64748B" }}>Risk Score</div><div style={{ fontSize: "15px", fontWeight: 700, color: "#F0F4F8" }}>{event.riskScore}<span style={{ fontWeight: 400, fontSize: "12px", color: "#64748B" }}>/100</span></div></div>
                    </div>
                  )}
                  {event.trajectorySignal && (
                    <div style={{ padding: "10px 14px", background: "#111F33", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <TrendingUp size={15} style={{ color: trajectoryColor(event.trajectorySignal) }} />
                      <div><div style={{ fontSize: "11px", color: "#64748B" }}>Trajectory</div><div style={{ fontSize: "15px", fontWeight: 700, color: trajectoryColor(event.trajectorySignal) }}>{fmt(event.trajectorySignal)}</div></div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {hasNotes && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B", marginBottom: "8px" }}>ASHA Worker Notes</div>
                <div style={{ padding: "10px 14px", background: "#111F33", borderRadius: "8px", borderLeft: "3px solid #3B82F6" }}>
                  <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.6", color: "#CBD5E1" }}>{event.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}