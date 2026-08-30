import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import TimelineEvent from "./TimelineEvent";

const fmt = (v) => String(v || "").replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

export default function Timeline({ events = [] }) {
  if (!events.length) {
    return (
      <div className="timeline-empty">
        <div className="timeline-empty-title">No timeline events yet</div>
        <p>Patient visits, symptoms, vitals, and care updates will appear here as the longitudinal record grows.</p>
      </div>
    );
  }

  const riskEvents = events.filter((e) => e.riskScore !== undefined && e.riskScore !== null);
  const trajectoryChanges = events.filter((e) => e.trajectorySignal && e.trajectorySignal !== "unknown");

  const firstRisk = riskEvents.length > 0 ? riskEvents[0].riskScore : null;
  const latestRisk = riskEvents.length > 0 ? riskEvents[riskEvents.length - 1].riskScore : null;
  const firstTrajectory = trajectoryChanges.length > 0 ? trajectoryChanges[0].trajectorySignal : null;
  const latestTrajectory = trajectoryChanges.length > 0 ? trajectoryChanges[trajectoryChanges.length - 1].trajectorySignal : null;

  const riskDelta = firstRisk !== null && latestRisk !== null ? latestRisk - firstRisk : null;

  return (
    <div>
      {events.length >= 2 && (
        <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
          {firstTrajectory && latestTrajectory && (
            <div style={{ background: "#0C1829", border: "1px solid #1A2E47", borderRadius: "12px", padding: "14px 18px", flex: "1 1 200px", minWidth: "180px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B", marginBottom: "8px" }}>Patient Trajectory</div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "15px", fontWeight: 600, color: firstTrajectory === "worsening" ? "#F59E0B" : firstTrajectory === "improving" ? "#22C55E" : "#94A3B8" }}>{fmt(firstTrajectory)}</span>
                <span style={{ color: "#3B82F6", fontSize: "16px" }}>→</span>
                <span style={{ fontSize: "15px", fontWeight: 600, color: latestTrajectory === "worsening" ? "#F59E0B" : latestTrajectory === "improving" ? "#22C55E" : "#94A3B8", display: "flex", alignItems: "center", gap: "6px" }}>
                  {latestTrajectory === "worsening" ? <TrendingDown size={16} /> : latestTrajectory === "improving" ? <TrendingUp size={16} /> : <Minus size={16} />}
                  {fmt(latestTrajectory)}
                </span>
              </div>
            </div>
          )}
          {firstRisk !== null && latestRisk !== null && (
            <div style={{ background: "#0C1829", border: "1px solid #1A2E47", borderRadius: "12px", padding: "14px 18px", flex: "1 1 160px", minWidth: "140px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B", marginBottom: "8px" }}>Risk Progression</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#94A3B8" }}>{firstRisk}</span>
                <span style={{ color: "#3B82F6", fontSize: "14px" }}>→</span>
                <span style={{ fontSize: "18px", fontWeight: 700, color: latestRisk > firstRisk ? "#F59E0B" : latestRisk < firstRisk ? "#22C55E" : "#94A3B8" }}>{latestRisk}</span>
                {riskDelta !== 0 && (
                  <span style={{ fontSize: "12px", fontWeight: 600, color: riskDelta > 0 ? "#F59E0B" : "#22C55E", background: riskDelta > 0 ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)", padding: "2px 8px", borderRadius: "6px" }}>
                    {riskDelta > 0 ? `+${riskDelta}` : riskDelta}
                  </span>
                )}
              </div>
            </div>
          )}
          <div style={{ background: "#0C1829", border: "1px solid #1A2E47", borderRadius: "12px", padding: "14px 18px", flex: "0 0 auto", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B" }}>Events</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#F0F4F8" }}>{events.length}</div>
          </div>
        </div>
      )}
      <div className="timeline">
        {events.slice().reverse().map((event, index) => (
          <TimelineEvent key={event._id || `${event.timestamp}-${index}`} event={event} isLast={index === events.length - 1} />
        ))}
      </div>
    </div>
  );
}