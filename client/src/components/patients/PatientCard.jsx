import {
  Activity,
  ArrowRight,
  CalendarClock,
  MapPin,
} from "lucide-react";

export default function PatientCard({
  patient,
  onClick,
}) {
  if (!patient) {
    return null;
  }

  const {
    patientCode,
    name,
    age,
    gender,
    location,
    currentState,
    trajectoryStatus,
    priority,
    followUp,
  } = patient;

  const formatValue = (value) =>
    String(value || "")
      .replaceAll("_", " ")
      .replace(/^./, (char) =>
        char.toUpperCase()
      );

  const initials = name
    ? name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "--";

  const nextFollowUp =
    followUp?.nextFollowUpAt
      ? new Date(followUp.nextFollowUpAt)
      : null;

  return (
    <button
      type="button"
      className="patient-card"
      onClick={onClick}
    >
      <div className="patient-card-header">
        <div className="patient-card-identity">
          <div className="patient-avatar">
            {initials}
          </div>

          <div>
            <h3>{name}</h3>

            <p>
              {patientCode}
              {age ? ` · ${age} yrs` : ""}
            </p>
          </div>
        </div>

        <span
          className={`priority-badge ${
            priority || "normal"
          }`}
        >
          <span className="priority-dot" />
          {formatValue(priority || "normal")}
        </span>
      </div>

      <div className="patient-card-location">
        <MapPin size={14} />

        <span>
          {location?.village || "Location unavailable"}
          {location?.district
            ? ` · ${location.district}`
            : ""}
        </span>
      </div>

      <div className="patient-card-status">
        <div>
          <span>TRAJECTORY</span>

          <strong
            className={
              trajectoryStatus || "stable"
            }
          >
            <Activity size={14} />
            {formatValue(
              trajectoryStatus ||
                currentState ||
                "stable"
            )}
          </strong>
        </div>

        <div>
          <span>CARE STATE</span>

          <strong>
            {formatValue(
              currentState || "stable"
            )}
          </strong>
        </div>

        <div>
          <span>FOLLOW-UP</span>

          <strong>
            <CalendarClock size={14} />

            {followUp?.required
              ? nextFollowUp &&
                !Number.isNaN(
                  nextFollowUp.getTime()
                )
                ? nextFollowUp.toLocaleDateString(
                    [],
                    {
                      day: "numeric",
                      month: "short",
                    }
                  )
                : `Every ${
                    followUp.intervalDays || 7
                  } days`
              : "Not required"}
          </strong>
        </div>
      </div>

      <div className="patient-card-footer">
        <span>
          View patient profile
        </span>

        <ArrowRight size={17} />
      </div>
    </button>
  );
}