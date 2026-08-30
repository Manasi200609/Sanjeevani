import {
  Activity,
  ArrowRight,
  Clock3,
} from "lucide-react";

export default function AttentionPatientCard({
  patient,
}) {
  const priority =
    patient.priority || "Normal";

  const trajectory =
    patient.trajectoryStatus ||
    patient.currentState ||
    "stable";

  const risk =
    patient.riskScore ??
    patient.risk ??
    0;

  const followUpDays =
    patient.followUp?.intervalDays ??
    patient.followUp ??
    7;

  const symptoms =
    patient.symptoms ||
    patient.activeSymptoms ||
    [];

  const symptomNames = symptoms.map(
    (symptom) =>
      typeof symptom === "string"
        ? symptom
        : symptom.name
  );

  const initials = patient.name
    ?.split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="attention-patient-card">
      <div className="attention-patient-main">
        <div className="patient-avatar">
          {initials}
        </div>

        <div className="patient-identity">
          <div className="patient-name">
            {patient.name}
          </div>

          <div className="patient-meta">
            {patient.patientCode}
            {" · "}
            {patient.age} yrs
            {" · "}
            {patient.location?.village ||
              patient.village ||
              "—"}
          </div>
        </div>
      </div>

      <div className="attention-trajectory">
        <div className="attention-label">
          TRAJECTORY
        </div>

        <div
          className={`attention-trajectory-value ${trajectory.toLowerCase()}`}
        >
          <Activity size={14} />
          {trajectory}
        </div>
      </div>

      <div className="attention-risk">
        <div className="attention-label">
          RISK
        </div>

        <div className="attention-risk-value">
          <strong>{risk}</strong>
          <span>/100</span>
        </div>
      </div>

      <div className="attention-priority">
        <span
          className={`priority-badge ${priority.toLowerCase()}`}
        >
          <span className="priority-dot" />
          {priority}
        </span>
      </div>

      <div className="attention-followup">
        <div className="attention-label">
          NEXT FOLLOW-UP
        </div>

        <div className="attention-followup-value">
          <Clock3 size={14} />
          {typeof followUpDays === "number"
            ? `${followUpDays} days`
            : followUpDays}
        </div>
      </div>

      <div className="attention-symptoms">
        {symptomNames.length > 0
          ? symptomNames
              .slice(0, 2)
              .map((symptom, index) => (
                <span key={`${symptom}-${index}`}>
                  {symptom}
                </span>
              ))
          : (
            <span>No active symptoms</span>
          )}
      </div>

      <button
        className="row-action"
        aria-label={`Open ${patient.name}`}
      >
        <ArrowRight size={18} />
      </button>
    </div>
  );
}