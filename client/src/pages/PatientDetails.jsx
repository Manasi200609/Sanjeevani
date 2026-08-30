import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Brain,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  HeartPulse,
  Pill,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  Thermometer,
  TrendingUp,
  UserRound,
} from "lucide-react";

import {
  fetchPatientContext,
  fetchLatestAgentRun,
  executeCareFlowAgent,
} from "../services/agentService";
import { fetchPatientTimeline } from "../services/eventService";
import { fetchActiveCarePlan } from "../services/carePlanService";
import { useLanguage } from "../services/LanguageContext";
import Timeline from "../components/timeline/Timeline";

// ============================================================
// HELPERS
// ============================================================

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
  });
};

// ============================================================
// PATIENT DETAILS
// ============================================================

export default function PatientDetails({ patientId, onBack }) {
  const { t } = useLanguage();
  const [context, setContext] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [carePlan, setCarePlan] = useState(null);
  const [latestRun, setLatestRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningAgent, setRunningAgent] = useState(false);
  const [error, setError] = useState("");

  // ----------------------------------------------------------
  // LOAD ALL PATIENT DATA
  // ----------------------------------------------------------

  const loadPatientData = useCallback(async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      setError("");

      const [ctx, timelineData, plan, runData] = await Promise.all([
        fetchPatientContext(patientId),
        fetchPatientTimeline(patientId).catch(() => []),
        fetchActiveCarePlan(patientId),
        fetchLatestAgentRun(patientId),
      ]);

      setContext(ctx);
      setTimeline(timelineData);
      setCarePlan(plan);
      setLatestRun(runData);
    } catch (err) {
      console.error("Failed to load patient:", err);
      if (err?.status === 404) {
        setError("Patient not found");
      } else {
        setError(
          err?.message || t("common.error")
        );
      }
    } finally {
      setLoading(false);
    }
  }, [patientId, t]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  // ----------------------------------------------------------
  // RUN CAREFLOW AGENT
  // ----------------------------------------------------------

  const handleRunAgent = async () => {
    try {
      setRunningAgent(true);
      setError("");
      await executeCareFlowAgent(patientId, "manual");
      await loadPatientData();
    } catch (err) {
      console.error("CareFlow agent failed:", err);
      setError(
        err?.message || t("common.error")
      );
    } finally {
      setRunningAgent(false);
    }
  };

  // ----------------------------------------------------------
  // LOADING STATE
  // ----------------------------------------------------------

  if (loading && !context) {
    return (
      <div className="patient-details-page loading-state">
        <RefreshCw size={22} className="spin" />
        <span>{t("common.loading")}</span>
      </div>
    );
  }

  // ----------------------------------------------------------
  // NOT FOUND / ERROR
  // ----------------------------------------------------------

  if (error && !context) {
    return (
      <div className="patient-details-page">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={17} />
          {t("patient.backToPatients")}
        </button>
        <div className="error-card">
          <AlertTriangle size={22} />
          <div>
            <h3>{error}</h3>
            <p>
              {error === "Patient not found"
                ? "The patient you are looking for does not exist or has been removed."
                : "Unable to load patient data. Please try again."}
            </p>
            <button
              className="setup-button secondary"
              onClick={onBack}
              style={{ marginTop: "12px" }}
            >
              <ArrowLeft size={15} /> Back to patients
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // EXTRACT DATA
  // ----------------------------------------------------------

  const patient = context?.patient;
  const trajectory = context?.trajectory;
  const riskScore =
    trajectory?.riskScore ?? patient?.riskScore ?? 0;
  const trajectoryStatus =
    trajectory?.status ||
    patient?.trajectoryStatus ||
    "stable";
  const priority = patient?.priority || "normal";
  const followUp = carePlan?.followUp ||
    patient?.followUp || {};
  const latestAnalysis = latestRun?.aiAnalysis;

  // Get latest event vitals from timeline
  const latestEvent =
    timeline.length > 0 ? timeline[timeline.length - 1] : null;
  const latestVitals = latestEvent?.vitals || null;

  return (
    <div className="patient-details-page">
      {/* ================================================
          PATIENT HEADER
          ================================================ */}

      <div className="patient-page-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={17} />
          {t("patient.backToPatients")}
        </button>

        <div className="patient-header-main">
          <div className="large-patient-avatar">
            {patient?.name
              ?.split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="patient-header-info">
            <div className="patient-code">
              {patient?.patientCode}
            </div>
            <h1>{patient?.name}</h1>
            <p>
              {patient?.age} years · {fmt(patient?.gender)} ·{" "}
              {patient?.location?.village},{" "}
              {patient?.location?.district}
            </p>
            {patient?.preferredLanguage && (
              <p className="patient-language">
                Language: {patient.preferredLanguage}
              </p>
            )}
          </div>
          <div className="patient-header-actions">
            <button
              className="agent-run-button"
              onClick={handleRunAgent}
              disabled={runningAgent}
            >
              {runningAgent ? (
                <>
                  <RefreshCw
                    size={16}
                    className="spin"
                  />{" "}
                  Running…
                </>
              ) : (
                <>
                  <Brain size={16} /> Run CareFlow Agent
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="inline-error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* ================================================
          STATUS OVERVIEW (4 cards)
          ================================================ */}

      <section className="patient-overview-grid">
        <div className="overview-card">
          <div className="overview-card-icon">
            <Activity size={19} />
          </div>
          <div className="overview-label">
            {t("patient.trajectory")}
          </div>
          <div
            className={`overview-value trajectory-${trajectoryStatus.toLowerCase()}`}
          >
            {fmt(trajectoryStatus)}
          </div>
          <div className="overview-subtext">
            {trajectory?.eventsAnalyzed
              ? `${trajectory.eventsAnalyzed} events analyzed`
              : "No trajectory data yet"}
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-card-icon">
            <ShieldAlert size={19} />
          </div>
          <div className="overview-label">
            {t("patient.riskScore")}
          </div>
          <div className="overview-value">
            {riskScore}
            <span>/100</span>
          </div>
          <div className="overview-subtext">
            {trajectory?.riskChange !== undefined
              ? trajectory.riskChange > 0
                ? `+${trajectory.riskChange} from previous`
                : trajectory.riskChange < 0
                ? `${trajectory.riskChange} from previous`
                : "No change"
              : "Current assessment"}
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-card-icon">
            <CalendarClock size={19} />
          </div>
          <div className="overview-label">
            {t("patient.followUp")}
          </div>
          <div className="overview-value">
            {followUp.required !== false
              ? `${followUp.intervalDays || 7} days`
              : "Not required"}
          </div>
          <div className="overview-subtext">
            {followUp.nextFollowUpAt
              ? `Next: ${fmtDate(followUp.nextFollowUpAt)}`
              : followUp.required !== false
              ? "Schedule pending"
              : "No follow-up scheduled"}
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-card-icon">
            <AlertTriangle size={19} />
          </div>
          <div className="overview-label">
            {t("patient.priority")}
          </div>
          <div
            className={`overview-value priority-${priority.toLowerCase()}`}
          >
            {fmt(priority)}
          </div>
          <div className="overview-subtext">
            {t("patient.carePriority")}
          </div>
        </div>
      </section>

      {/* ================================================
          MAIN CONTENT GRID
          ================================================ */}

      <section className="patient-content-grid">
        {/* LEFT COLUMN */}
        <div className="patient-main-column">
          {/* ------------------------------------------
              TRAJECTORY SUMMARY
              ------------------------------------------ */}

          <div className="patient-section-card">
            <div className="section-heading">
              <div>
                <div className="section-eyebrow">
                  {t("patient.longitudinalMonitoring")}
                </div>
                <h2>
                  {t("patient.patientTrajectory")}
                </h2>
              </div>
              <TrendingUp size={20} />
            </div>
            <div className="trajectory-summary">
              <div className="trajectory-score">
                <strong>{riskScore}</strong>
                <span>{t("patient.currentRisk")}</span>
              </div>
              <div className="trajectory-change">
                <span>{t("patient.previousRisk")}</span>
                <strong>
                  {trajectory?.previousRiskScore ?? "—"}
                </strong>
              </div>
              <div className="trajectory-change">
                <span>{t("patient.change")}</span>
                <strong>
                  {trajectory?.riskChange !== undefined
                    ? `+${trajectory.riskChange}`
                    : "—"}
                </strong>
              </div>
              <div className="trajectory-change">
                <span>{t("patient.confidence")}</span>
                <strong>
                  {trajectory?.confidence
                    ? `${Math.round(
                        trajectory.confidence * 100
                      )}%`
                    : "—"}
                </strong>
              </div>
            </div>
            <div className="trajectory-bar">
              <div
                className="trajectory-bar-fill"
                style={{
                  width: `${Math.min(riskScore, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* ------------------------------------------
              ACTIVE SYMPTOMS
              ------------------------------------------ */}

          <div className="patient-section-card">
            <div className="section-heading">
              <div>
                <div className="section-eyebrow">
                  {t("patient.currentSignals")}
                </div>
                <h2>
                  {t("patient.activeSymptoms")}
                </h2>
              </div>
            </div>
            <div className="symptom-list">
              {context?.activeSymptoms?.length ? (
                context.activeSymptoms.map(
                  (symptom, index) => (
                    <div
                      className="symptom-item"
                      key={`${symptom.name}-${index}`}
                    >
                      <div className="symptom-icon">
                        <Activity size={16} />
                      </div>
                      <div className="symptom-info">
                        <strong>{symptom.name}</strong>
                        <span>{fmt(symptom.status)}</span>
                      </div>
                      <div className="symptom-severity">
                        Severity {symptom.severity}/10
                      </div>
                    </div>
                  )
                )
              ) : (
                <div className="empty-state">
                  {t("patient.noSymptoms")}
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------
              MEDICATION ADHERENCE
              ------------------------------------------ */}

          <div className="patient-section-card">
            <div className="section-heading">
              <div>
                <div className="section-eyebrow">
                  {t("patient.medication")}
                </div>
                <h2>
                  {t("patient.adherencePattern")}
                </h2>
              </div>
              <Pill size={19} />
            </div>
            <div className="medication-list">
              {context?.medicationPatterns?.length ? (
                context.medicationPatterns.map(
                  (medication, index) => (
                    <div
                      className="medication-item"
                      key={`${medication.name}-${index}`}
                    >
                      <div>
                        <strong>{medication.name}</strong>
                        <span>{medication.notes}</span>
                      </div>
                      <span
                        className={`adherence-badge ${medication.adherence}`}
                      >
                        {fmt(medication.adherence)}
                      </span>
                    </div>
                  )
                )
              ) : (
                <div className="empty-state">
                  {t("patient.noMedication")}
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------
              RECENT VITALS
              ------------------------------------------ */}

          {latestVitals && (
            <div className="patient-section-card">
              <div className="section-heading">
                <div>
                  <div className="section-eyebrow">
                    MOST RECENT VITALS
                  </div>
                  <h2>Patient Vitals</h2>
                </div>
                <HeartPulse size={19} />
              </div>
              <div className="vitals-grid-detail">
                {latestVitals.temperature !== undefined && (
                  <div className="vital-item">
                    <Thermometer size={16} />
                    <span>Temperature</span>
                    <strong>
                      {latestVitals.temperature}°C
                    </strong>
                  </div>
                )}
                {latestVitals.heartRate !== undefined && (
                  <div className="vital-item">
                    <HeartPulse size={16} />
                    <span>Heart rate</span>
                    <strong>
                      {latestVitals.heartRate} bpm
                    </strong>
                  </div>
                )}
                {latestVitals.systolicBP !== undefined && (
                  <div className="vital-item">
                    <Activity size={16} />
                    <span>Blood pressure</span>
                    <strong>
                      {latestVitals.systolicBP}/
                      {latestVitals.diastolicBP}
                    </strong>
                  </div>
                )}
                {latestVitals.oxygenSaturation !==
                  undefined && (
                  <div className="vital-item">
                    <Stethoscope size={16} />
                    <span>SpO₂</span>
                    <strong>
                      {latestVitals.oxygenSaturation}%
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------
              LONGITUDINAL TIMELINE
              ------------------------------------------ */}

          <div className="patient-section-card">
            <div className="section-heading">
              <div>
                <div className="section-eyebrow">
                  LONGITUDINAL RECORD
                </div>
                <h2>Patient Timeline</h2>
              </div>
              <span className="attention-count">
                {timeline.length}
              </span>
            </div>
            <Timeline events={timeline} />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="patient-side-column">
          {/* ------------------------------------------
              AGENT DECISION / REASONING
              ------------------------------------------ */}

          <div className="patient-section-card agent-decision-card">
            <div className="section-eyebrow">
              AUTONOMOUS DECISION
            </div>
            <h2>Latest CareFlow Action</h2>
            {latestAnalysis ? (
              <>
                <div className="decision-status">
                  <CheckCircle2 size={17} /> Agent
                  completed
                </div>
                <div className="decision-action">
                  {fmt(
                    latestAnalysis.recommendedAction
                  )}
                </div>
                <p className="decision-message">
                  {latestAnalysis.ashaMessage}
                </p>
                <div className="decision-reasoning">
                  <div className="decision-reasoning-title">
                    <Brain size={15} /> Why CareFlow
                    Acted
                  </div>
                  <p>{latestAnalysis.reasoning}</p>
                </div>
                {latestAnalysis.keySignals?.length >
                  0 && (
                  <div
                    className="decision-signals"
                    style={{ marginTop: "10px" }}
                  >
                    <div className="decision-reasoning-title">
                      Key Signals
                    </div>
                    <ul
                      style={{
                        margin: "6px 0 0 16px",
                        padding: 0,
                        fontSize: "13px",
                        lineHeight: "1.6",
                      }}
                    >
                      {latestAnalysis.keySignals.map(
                        (signal, i) => (
                          <li key={i}>{signal}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                No agent analysis yet. Run the CareFlow
                agent to generate an assessment.
              </div>
            )}
          </div>

          {/* ------------------------------------------
              CARE PLAN
              ------------------------------------------ */}

          <div className="patient-section-card">
            <div className="section-eyebrow">CARE PLAN</div>
            <h2>Current Care Plan</h2>
            {carePlan ? (
              <div className="care-plan-detail">
                <div className="care-plan-row">
                  <span>Status</span>
                  <strong>{fmt(carePlan.status)}</strong>
                </div>
                <div className="care-plan-row">
                  <span>Priority</span>
                  <strong
                    className={`priority-${(carePlan.priority || "normal").toLowerCase()}`}
                  >
                    {fmt(carePlan.priority || "normal")}
                  </strong>
                </div>
                <div className="care-plan-row">
                  <span>Care state</span>
                  <strong>
                    {fmt(
                      carePlan.careState || patient?.currentState || "stable"
                    )}
                  </strong>
                </div>
                <div className="care-plan-row">
                  <span>Trajectory</span>
                  <strong>
                    {fmt(
                      carePlan.trajectoryStatus ||
                        trajectoryStatus
                    )}
                  </strong>
                </div>
                <div className="care-plan-row">
                  <span>Risk score</span>
                  <strong>
                    {carePlan.riskScore ?? riskScore}/100
                  </strong>
                </div>
                <div className="care-plan-row">
                  <span>Follow-up interval</span>
                  <strong>
                    Every{" "}
                    {carePlan.followUp?.intervalDays ||
                      followUp.intervalDays ||
                      7}{" "}
                    days
                  </strong>
                </div>
                {carePlan.followUp?.nextFollowUpAt && (
                  <div className="care-plan-row">
                    <span>Next follow-up</span>
                    <strong>
                      {fmtDate(
                        carePlan.followUp.nextFollowUpAt
                      )}
                    </strong>
                  </div>
                )}
                {carePlan.instructions?.length > 0 && (
                  <div
                    className="care-plan-row"
                    style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "6px",
                    }}
                  >
                    <span>Instructions</span>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "16px",
                        fontSize: "13px",
                        lineHeight: "1.6",
                      }}
                    >
                      {carePlan.instructions.map(
                        (inst, i) => (
                          <li key={i}>{inst}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
                {carePlan.ashaMessage && (
                  <div className="care-plan-row">
                    <span>ASHA message</span>
                    <strong
                      style={{ fontSize: "13px" }}
                    >
                      {carePlan.ashaMessage}
                    </strong>
                  </div>
                )}
                {carePlan.reasoning && (
                  <div
                    className="care-plan-row"
                    style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "4px",
                    }}
                  >
                    <span>Reasoning</span>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "13px",
                        lineHeight: "1.6",
                      }}
                    >
                      {carePlan.reasoning}
                    </p>
                  </div>
                )}
                {carePlan.lastReviewedAt && (
                  <div className="care-plan-row">
                    <span>Last reviewed</span>
                    <strong>
                      {fmtDate(carePlan.lastReviewedAt)}
                    </strong>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                No active care plan. Run the CareFlow agent
                to create one.
              </div>
            )}
          </div>

          {/* ------------------------------------------
              AGENT EXECUTION STEPS
              ------------------------------------------ */}

          <div className="patient-section-card">
            <div className="section-eyebrow">
              AGENT EXECUTION
            </div>
            <h2>Latest Agent Run</h2>
            {latestRun ? (
              <>
                <div className="agent-step-list">
                  {(latestRun.steps || []).map(
                    (step, index) => (
                      <div
                        className="agent-step"
                        key={step.step || index}
                      >
                        <div className="agent-step-number">
                          {String(index + 1).padStart(
                            2,
                            "0"
                          )}
                        </div>
                        <div className="agent-step-content">
                          <strong>{fmt(step.step)}</strong>
                          <span>{fmt(step.status)}</span>
                          {step.details && (
                            <small
                              style={{
                                color: "var(--muted)",
                                fontSize: "12px",
                              }}
                            >
                              {step.details.eventsAnalyzed !==
                                undefined &&
                                `${step.details.eventsAnalyzed} events`}
                              {step.details.riskLevel &&
                                ` · ${fmt(
                                  step.details.riskLevel
                                )}`}
                              {step.details
                                .recommendedAction &&
                                ` · ${fmt(
                                  step.details
                                    .recommendedAction
                                )}`}
                              {step.details
                                .followUpIntervalDays &&
                                ` · ${step.details.followUpIntervalDays}d`}
                            </small>
                          )}
                        </div>
                        <CheckCircle2 size={16} />
                      </div>
                    )
                  )}
                </div>
                {latestRun.durationMs && (
                  <div className="run-duration">
                    <Clock3 size={14} />
                    Completed in {latestRun.durationMs}ms
                  </div>
                )}
                {latestRun.startedAt && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--muted)",
                      marginTop: "6px",
                    }}
                  >
                    Started: {fmtDate(latestRun.startedAt)}
                    {latestRun.completedAt &&
                      ` · Completed: ${fmtDate(
                        latestRun.completedAt
                      )}`}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                No agent run recorded yet. Click "Run
                CareFlow Agent" to start.
              </div>
            )}
          </div>

          {/* ------------------------------------------
              PATIENT PROFILE
              ------------------------------------------ */}

          <div className="patient-section-card">
            <div className="section-eyebrow">
              PATIENT PROFILE
            </div>
            <h2>Patient Information</h2>
            <div className="profile-details">
              <div>
                <UserRound size={15} />
                <span>Language</span>
                <strong>
                  {patient?.preferredLanguage || "—"}
                </strong>
              </div>
              <div>
                <Activity size={15} />
                <span>Village</span>
                <strong>
                  {patient?.location?.village || "—"}
                </strong>
              </div>
              <div>
                <Activity size={15} />
                <span>District</span>
                <strong>
                  {patient?.location?.district || "—"}
                </strong>
              </div>
              <div>
                <CalendarClock size={15} />
                <span>Last visit</span>
                <strong>
                  {fmtDate(patient?.lastVisitAt)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
