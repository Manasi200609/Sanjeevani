import {
  ArrowLeft,
  CalendarClock,
  MapPin,
  UserRound,
} from "lucide-react";

export default function PatientHeader({
  patient,
  onBack,
}) {
  if (!patient) {
    return null;
  }

  const {
    patientCode,
    name,
    age,
    gender,
    preferredLanguage,
    location,
    priority,
    currentState,
    trajectoryStatus,
    followUp,
  } = patient;

  const formatValue = (value) =>
    String(value || "")
      .replaceAll("_", " ")
      .replace(/^./, (char) =>
        char.toUpperCase()
      );

  return (
    <div className="patient-header">
      <div className="patient-header-top">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back to patients
        </button>

        <span
          className={`priority-badge ${
            priority || "normal"
          }`}
        >
          <span className="priority-dot" />
          {formatValue(priority || "normal")}
        </span>
      </div>

      <div className="patient-header-main">
        <div className="patient-header-avatar">
          {name
            ? name
                .split(" ")
                .map((word) => word[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "--"}
        </div>

        <div className="patient-header-identity">
          <div className="patient-code">
            {patientCode}
          </div>

          <h1>{name}</h1>

          <div className="patient-header-meta">
            <span>
              <UserRound size={14} />
              {age ? `${age} years` : "Age unavailable"}
            </span>

            {gender && (
              <span>
                {formatValue(gender)}
              </span>
            )}

            {preferredLanguage && (
              <span>
                {preferredLanguage}
              </span>
            )}

            {location?.village && (
              <span>
                <MapPin size={14} />
                {location.village}
                {location.district
                  ? `, ${location.district}`
                  : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="patient-header-status">
        <div>
          <span>TRAJECTORY</span>

          <strong
            className={
              trajectoryStatus || "stable"
            }
          >
            {formatValue(
              trajectoryStatus ||
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
            <CalendarClock size={15} />

            {followUp?.required
              ? `Every ${
                  followUp.intervalDays || 7
                } days`
              : "Not required"}
          </strong>
        </div>
      </div>
    </div>
  );
}