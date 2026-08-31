import { useEffect, useState, useCallback } from "react";
import {
  Users, AlertTriangle, CalendarClock, ShieldAlert,
  ArrowUpRight, ArrowRight, Activity, Brain, Clock3,
  RefreshCw, Play, CheckCircle2, Sparkles,
} from "lucide-react";
import { useLanguage } from "../services/LanguageContext";
import {
  getDashboard, runSimulationSetup, runAllAgents,
} from "../services/api";

function StatCard({ label, value, change, icon: Icon, type }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className={`stat-icon ${type}`}><Icon size={19} /></div>
        <ArrowUpRight size={17} className="stat-arrow" />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className={`stat-change ${type}`}>{change}</div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const className = priority.toLowerCase();
  return (
    <span className={`priority-badge ${className}`}>
      <span className="priority-dot" />
      {priority}
    </span>
  );
}

function PatientRow({ patient, onSelectPatient }) {
  const followUpDays = patient.followUp?.intervalDays ?? 7;
  const initials = patient.name?.split(" ").map(w => w[0]).join("").slice(0, 2);
  const trajectoryClass = patient.trajectoryStatus?.toLowerCase() === "worsening" ? "worsening"
    : patient.trajectoryStatus?.toLowerCase() === "improving" ? "stable"
    : patient.currentState === "watch" ? "watch" : "stable";

  return (
    <div className="patient-row clickable" onClick={() => onSelectPatient?.(patient._id)}>
      <div className="patient-main">
        <div className="patient-avatar">{initials}</div>
        <div className="patient-identity">
          <div className="patient-name">{patient.name}</div>
          <div className="patient-meta">{patient.patientCode} · {patient.age} yrs · {patient.location?.village || "—"}</div>
        </div>
      </div>
      <div className="patient-trajectory">
        <div className="trajectory-label">TRAJECTORY</div>
        <div className={`trajectory-value ${trajectoryClass}`}>
          <Activity size={14} /> {patient.trajectoryStatus || "stable"}
        </div>
      </div>
      <div className="patient-risk">
        <div className="trajectory-label">RISK</div>
        <div className="risk-value">
          <span>{patient.riskScore ?? 0}</span><span className="risk-max">/100</span>
        </div>
      </div>
      <div className="patient-priority">
        <PriorityBadge priority={patient.priority || "normal"} />
      </div>
      <div className="patient-followup">
        <div className="trajectory-label">NEXT FOLLOW-UP</div>
        <div className="followup-value"><Clock3 size={14} /> {followUpDays} {window.__lang === "hi" ? "दिन" : window.__lang === "mr" ? "दिवस" : "days"}</div>
      </div>
      <button className="row-action" aria-label={`Open ${patient.name}`}>
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

function DashboardAgentActivity({ recentRuns, onSelectPatient, t }) {
  if (!recentRuns || recentRuns.length === 0) {
    return (
      <div className="agent-activity-card">
        <div className="section-heading">
          <div>
            <div className="section-eyebrow">{t("dashboard.autonomousCare")}</div>
            <h2>{t("dashboard.agentActivity")}</h2>
          </div>
        </div>
        <div className="agent-empty-state">
          <Brain size={28} />
          <p>{t("dashboard.noAgentRuns")}</p>
          <p className="agent-empty-hint">{t("dashboard.runSimulationSee")}</p>
        </div>
      </div>
    );
  }

  const latestRun = recentRuns[0];
  const patientName = latestRun.patientId?.name || latestRun.patientId?.patientCode || "Patient";
  const patientCode = latestRun.patientId?.patientCode || "";
  const patientId = latestRun.patientId?._id;

  return (
    <div className="agent-activity-card">
      <div className="section-heading">
        <div>
          <div className="section-eyebrow">{t("dashboard.autonomousCare")}</div>
          <h2>{t("dashboard.agentActivity")}</h2>
        </div>
        <div className="live-indicator"><span /> Live</div>
      </div>
      <div className="agent-run clickable" onClick={() => patientId && onSelectPatient?.(patientId)}>
        <div className="run-icon"><Brain size={19} /></div>
        <div className="run-content">
          <div className="run-title">{t("dashboard.completedPatientReview")}</div>
          <div className="run-description">
            {patientName}{patientCode ? ` (${patientCode})` : ""} · {latestRun.aiAnalysis?.riskLevel || "analyzed"} · {latestRun.executedAction || latestRun.aiAnalysis?.recommendedAction || "completed"}
          </div>
          <div className="run-time">
            <Clock3 size={13} />
            {latestRun.durationMs ? `${t("dashboard.completedIn")} ${latestRun.durationMs}ms` : t("dashboard.recentlyCompleted")}
          </div>
        </div>
        <div className="run-status">{latestRun.status === "completed" ? t("dashboard.completed") : latestRun.status}</div>
      </div>
      <div className="agent-loop">
        {["Observe", "Reason", "Plan", "Execute", "Communicate"].map((step, i) => (
          <div key={step} style={{ display: "contents" }}>
            <div className={`loop-step ${latestRun.status === "completed" ? "completed" : ""}`}>
              <span>{String(i + 1).padStart(2, "0")}</span> {step}
            </div>
            {i < 4 && <div className="loop-line" />}
          </div>
        ))}
      </div>
      {recentRuns.length > 1 && (
        <div className="agent-run-list">
          {recentRuns.slice(1, 4).map((run) => {
            const name = run.patientId?.name || run.patientId?.patientCode || "Patient";
            return (
              <div className="agent-run-list-item" key={run._id}>
                <div className="run-list-icon"><Activity size={14} /></div>
                <div className="run-list-content">
                  <span className="run-list-name">{name}</span>
                  <span className="run-list-action">{run.executedAction || "analyzed"}</span>
                </div>
                <span className={`run-list-status ${run.status === "completed" ? "success" : "error"}`}>{run.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ onSelectPatient }) {
  const { t, language } = useLanguage();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [error, setError] = useState("");
  const [setupMessage, setSetupMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleSetupSimulation = async () => {
    try {
      setSettingUp(true);
      setSetupMessage("");
      setError("");
      setSetupMessage(t("dashboard.settingUp"));
      await runSimulationSetup(5);
      setSetupMessage("Running Sanjeevani agents...");
      await runAllAgents();
      await loadDashboard();
      setSetupMessage(t("dashboard.setupDemo") + "!");
    } catch (err) {
      console.error("Simulation setup error:", err);
      setError(err.response?.data?.message || t("common.error"));
      setSetupMessage("");
    } finally {
      setSettingUp(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="dashboard loading-state">
        <RefreshCw size={22} className="spin" />
        <span>{t("common.loading")}</span>
      </div>
    );
  }

  const stats = dashboardData?.stats || { totalPatients: 0, needsAttention: 0, followUpsDue: 0, urgentCases: 0 };
  const attentionPatients = dashboardData?.attentionPatients || [];
  const recentRuns = dashboardData?.recentAgentRuns || [];
  const hasData = stats.totalPatients > 0;

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase();

  return (
    <div className="dashboard">
      <section className="dashboard-intro">
        <div>
          <p className="intro-kicker">{dayName}, {dateStr}</p>
          <h2>{t("dashboard.greeting")}</h2>
          <p>{hasData ? t("dashboard.description") : t("dashboard.noData")}</p>
        </div>
        <div className="dashboard-actions">
          {!hasData && (
            <button className="setup-button" onClick={handleSetupSimulation} disabled={settingUp}>
              {settingUp ? <><RefreshCw size={15} className="spin" /> {t("dashboard.settingUp")}</> : <><Sparkles size={15} /> {t("dashboard.setupDemo")}</>}
            </button>
          )}
          {hasData && (
            <button className="setup-button secondary" onClick={handleSetupSimulation} disabled={settingUp}>
              {settingUp ? <><RefreshCw size={15} className="spin" /> {t("dashboard.resetting")}</> : <><Play size={15} /> {t("dashboard.resetDemo")}</>}
            </button>
          )}
          <button className="setup-button secondary" onClick={loadDashboard} disabled={loading}>
            <RefreshCw size={15} /> {t("dashboard.refresh")}
          </button>
          <div className="system-status">
            <div className="system-status-icon"><Activity size={18} /></div>
            <div>
              <span>{t("dashboard.agentStatus")}</span>
              <strong>{t("dashboard.monitoring")}</strong>
            </div>
            <div className="system-live-dot" />
          </div>
        </div>
      </section>

      {setupMessage && (
        <div className="setup-message">
          <RefreshCw size={14} className="spin" /> {setupMessage}
        </div>
      )}

      {error && (
        <div className="inline-error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <section className="stats-grid">
        <StatCard
          label={t("dashboard.totalPatients")}
          value={String(stats.totalPatients)}
          change={hasData ? `${stats.totalPatients} ${t("dashboard.active")}` : "No data yet"}
          icon={Users} type="neutral"
        />
        <StatCard
          label={t("dashboard.needsAttention")}
          value={String(stats.needsAttention)}
          change={stats.urgentCases > 0 ? `${stats.urgentCases} ${t("dashboard.urgent")}` : t("dashboard.allStable")}
          icon={AlertTriangle} type="warning"
        />
        <StatCard
          label={t("dashboard.followUpsDue")}
          value={String(stats.followUpsDue)}
          change={t("dashboard.next7Days")}
          icon={CalendarClock} type="blue"
        />
        <StatCard
          label={t("dashboard.urgentCases")}
          value={String(stats.urgentCases)}
          change={stats.urgentCases > 0 ? t("dashboard.requiresReview") : t("dashboard.noUrgentCases")}
          icon={ShieldAlert} type="danger"
        />
      </section>

      <section className="dashboard-grid">
        <div className="patients-card">
          <div className="section-heading">
            <div>
              <div className="section-eyebrow">{t("dashboard.patientMonitoring")}</div>
              <h2>{t("dashboard.patientsRequiringAttention")}</h2>
            </div>
            {attentionPatients.length > 0 && (
              <span className="attention-count">{attentionPatients.length}</span>
            )}
          </div>
          {attentionPatients.length > 0 ? (
            <div className="patient-list">
              {attentionPatients.map((patient) => (
                <PatientRow key={patient._id} patient={patient} onSelectPatient={onSelectPatient} />
              ))}
            </div>
          ) : (
            <div className="empty-state-card">
              <CheckCircle2 size={24} />
              <p>{t("dashboard.noPatientsAttention")}</p>
              <p className="empty-hint">{hasData ? t("dashboard.allPatientsStable") : t("dashboard.runSimulation")}</p>
            </div>
          )}
        </div>

        <DashboardAgentActivity recentRuns={recentRuns} onSelectPatient={onSelectPatient} t={t} />
      </section>
    </div>
  );
}
