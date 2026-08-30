import {
  Activity,
  CalendarClock,
  HeartPulse,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";

export default function PatientOverview({
  patient,
  trajectory,
}) {
  if (!patient) {
    return null;
  }

  const formatValue = (value) =>
    String(value || "")
      .replaceAll("_", " ")
      .replace(/^./, (char) =>
        char.toUpperCase()
      );

  const riskScore =
    trajectory?.riskScore ??
    patient.riskScore ??
    0;

  const riskDirection =
    trajectory?.riskDirection;

  const riskChange =
    trajectory?.riskChange;

  const followUp = patient.followUp;

  return (
    <div className="patient-overview">
      <div className="overview-card">
        <div className="overview-card-icon">
          <Activity size={19} />
        </div>

        <div className="overview-card-content">
          <span>TRAJECTORY</span>

          <strong
            className={
              trajectory?.status ||
              patient.trajectoryStatus ||
              "stable"
            }
          >
            {formatValue(
              trajectory?.status ||
                patient.trajectoryStatus ||
                "stable"
            )}
          </strong>

          <small>
            {trajectory?.eventsAnalyzed
              ? `${trajectory.eventsAnalyzed} events analyzed`
              : "No trajectory data yet"}
          </small>
        </div>
      </div>

      <div className="overview-card">
        <div className="overview-card-icon risk">
          <ShieldAlert size={19} />
        </div>

        <div className="overview-card-content">
          <span>RISK SCORE</span>

          <strong>
            {riskScore}
            <small>/100</small>
          </strong>

          {riskChange !== undefined ? (
            <small
              className={
                riskDirection === "increasing"
                  ? "risk-increasing"
                  : "risk-decreasing"
              }
            >
              {riskDirection === "increasing"
                ? "↑"
                : "↓"}{" "}
              {Math.abs(riskChange)} points
            </small>
          ) : (
            <small>
              Current assessment
            </small>
          )}
        </div>
      </div>

      <div className="overview-card">
        <div className="overview-card-icon">
          <CalendarClock size={19} />
        </div>

        <div className="overview-card-content">
          <span>NEXT FOLLOW-UP</span>

          <strong>
            {followUp?.required
              ? `${followUp.intervalDays || 7} days`
              : "Not required"}
          </strong>

          <small>
            {followUp?.nextFollowUpAt
              ? new Date(
                  followUp.nextFollowUpAt
                ).toLocaleDateString([], {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : followUp?.required
              ? "Schedule pending"
              : "No follow-up scheduled"}
          </small>
        </div>
      </div>

      <div className="overview-card">
        <div className="overview-card-icon">
          <HeartPulse size={19} />
        </div>

        <div className="overview-card-content">
          <span>CARE STATE</span>

          <strong>
            {formatValue(
              patient.currentState ||
                "stable"
            )}
          </strong>

          <small>
            Priority:{" "}
            {formatValue(
              patient.priority ||
                "normal"
            )}
          </small>
        </div>
      </div>

      <div className="overview-card">
        <div className="overview-card-icon">
          <Stethoscope size={19} />
        </div>

        <div className="overview-card-content">
          <span>BASELINE</span>

          <strong>
            {formatValue(
              patient.baselineState ||
                "stable"
            )}
          </strong>

          <small>
            Longitudinal comparison
          </small>
        </div>
      </div>
    </div>
  );
}