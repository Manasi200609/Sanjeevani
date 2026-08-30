import {
  Activity,
  FileText,
  Pill,
  Thermometer,
  HeartPulse,
  AlertTriangle,
} from "lucide-react";

export default function EventDetails({ event }) {
  if (!event) {
    return null;
  }

  const formatValue = (value) =>
    String(value || "")
      .replaceAll("_", " ")
      .replace(/^./, (char) => char.toUpperCase());

  const formatDate = (value) => {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="event-details">
      <div className="event-details-header">
        <div>
          <span className="section-eyebrow">
            EVENT DETAILS
          </span>

          <h3>
            {formatValue(
              event.eventType || "Patient event"
            )}
          </h3>

          <p>
            Recorded on {formatDate(event.timestamp)}
          </p>
        </div>

        {event.severity && (
          <span
            className={`timeline-severity ${event.severity}`}
          >
            {formatValue(event.severity)}
          </span>
        )}
      </div>

      {event.symptoms?.length > 0 && (
        <div className="event-details-section">
          <div className="event-details-section-title">
            <Activity size={16} />
            Symptoms
          </div>

          <div className="event-detail-list">
            {event.symptoms.map(
              (symptom, index) => (
                <div
                  className="event-detail-row"
                  key={
                    symptom._id ||
                    `${symptom.name}-${index}`
                  }
                >
                  <div>
                    <strong>
                      {symptom.name}
                    </strong>

                    {symptom.status && (
                      <span
                        className={`symptom-status ${symptom.status}`}
                      >
                        {formatValue(
                          symptom.status
                        )}
                      </span>
                    )}
                  </div>

                  {symptom.severity !==
                    undefined && (
                    <span>
                      Severity{" "}
                      <strong>
                        {symptom.severity}/10
                      </strong>
                    </span>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {event.vitals && (
        <div className="event-details-section">
          <div className="event-details-section-title">
            <HeartPulse size={16} />
            Vitals
          </div>

          <div className="event-vitals-grid">
            {event.vitals.temperature !==
              undefined && (
              <div className="event-vital">
                <Thermometer size={15} />
                <span>Temperature</span>
                <strong>
                  {event.vitals.temperature}°C
                </strong>
              </div>
            )}

            {event.vitals.heartRate !==
              undefined && (
              <div className="event-vital">
                <HeartPulse size={15} />
                <span>Heart rate</span>
                <strong>
                  {event.vitals.heartRate} bpm
                </strong>
              </div>
            )}

            {event.vitals.systolicBP !==
              undefined && (
              <div className="event-vital">
                <Activity size={15} />
                <span>Blood pressure</span>
                <strong>
                  {event.vitals.systolicBP}/
                  {event.vitals.diastolicBP}
                </strong>
              </div>
            )}

            {event.vitals.oxygenSaturation !==
              undefined && (
              <div className="event-vital">
                <HeartPulse size={15} />
                <span>Oxygen saturation</span>
                <strong>
                  {event.vitals.oxygenSaturation}%
                </strong>
              </div>
            )}
          </div>
        </div>
      )}

      {event.medications?.length > 0 && (
        <div className="event-details-section">
          <div className="event-details-section-title">
            <Pill size={16} />
            Medication adherence
          </div>

          <div className="event-detail-list">
            {event.medications.map(
              (medication, index) => (
                <div
                  className="event-detail-row"
                  key={
                    medication._id ||
                    `${medication.name}-${index}`
                  }
                >
                  <div>
                    <strong>
                      {medication.name}
                    </strong>

                    {medication.notes && (
                      <small>
                        {medication.notes}
                      </small>
                    )}
                  </div>

                  {medication.adherence && (
                    <span
                      className={`adherence ${medication.adherence}`}
                    >
                      {formatValue(
                        medication.adherence
                      )}
                    </span>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {(event.riskScore !== undefined ||
        event.trajectorySignal) && (
        <div className="event-details-section">
          <div className="event-details-section-title">
            <AlertTriangle size={16} />
            Risk assessment
          </div>

          <div className="event-analysis-grid">
            {event.riskScore !== undefined && (
              <div>
                <span>Risk score</span>
                <strong>
                  {event.riskScore}/100
                </strong>
              </div>
            )}

            {event.trajectorySignal && (
              <div>
                <span>Trajectory</span>
                <strong
                  className={
                    event.trajectorySignal
                  }
                >
                  {formatValue(
                    event.trajectorySignal
                  )}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}

      {event.notes && (
        <div className="event-notes">
          <div className="event-details-section-title">
            <FileText size={16} />
            ASHA worker notes
          </div>

          <p>{event.notes}</p>
        </div>
      )}

      {event.aiAnalysis && (
        <div className="event-ai-analysis">
          <div className="event-details-section-title">
            <Activity size={16} />
            AI analysis
          </div>

          <pre>
            {typeof event.aiAnalysis === "string"
              ? event.aiAnalysis
              : JSON.stringify(
                  event.aiAnalysis,
                  null,
                  2
                )}
          </pre>
        </div>
      )}

      <div className="event-details-source">
        Source:{" "}
        {formatValue(event.source || "unknown")}
      </div>
    </div>
  );
}