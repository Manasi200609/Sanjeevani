import { useEffect, useState, useCallback } from "react";
import {
  Brain, Activity, Clock3, RefreshCw, AlertTriangle,
  CheckCircle2, ChevronRight, Zap,
} from "lucide-react";
import { getPatients, getAgentRunHistory } from "../services/api";
import { useLanguage } from "../services/LanguageContext";

function RunCard({ run, onSelectPatient }) {
  const { t } = useLanguage();
  const patientName = run.patientId?.name || run.patientId?.patientCode || "Unknown";
  const patientCode = run.patientId?.patientCode || "";
  const patientId = run.patientId?._id;
  const analysis = run.aiAnalysis || {};
  const steps = run.steps || [];
  const completedSteps = steps.filter(s => s.status === "completed").length;

  return (
    <div className="agent-run-card clickable" onClick={() => patientId && onSelectPatient?.(patientId)}>
      <div className="run-card-header">
        <div className="run-card-patient">
          <Brain size={18} />
          <div>
            <div className="run-card-name">{patientName}</div>
            {patientCode && <div className="run-card-code">{patientCode}</div>}
          </div>
        </div>
        <span className={`run-list-status ${run.status === "completed" ? "success" : run.status === "failed" ? "error" : ""}`}>
          {run.status}
        </span>
      </div>
      <div className="run-card-body">
        {analysis.riskLevel && (
          <div className="run-card-tag"><Zap size={12} /> Risk: {analysis.riskLevel}</div>
        )}
        {run.executedAction && (
          <div className="run-card-tag action">{run.executedAction.replace(/_/g, " ")}</div>
        )}
        {analysis.ashaMessage && (
          <p className="run-card-message">{analysis.ashaMessage}</p>
        )}
      </div>
      <div className="run-card-footer">
        <div className="run-card-steps">
          <div className="run-card-steps-bar">
            <div className="run-card-steps-fill" style={{ width: steps.length ? `${(completedSteps / steps.length) * 100}%` : "0%" }} />
          </div>
          <span>{completedSteps}/{steps.length} {t("agent.steps")}</span>
        </div>
        <div className="run-card-meta">
          {run.durationMs && <span><Clock3 size={12} /> {run.durationMs}ms</span>}
          <span>{new Date(run.createdAt).toLocaleString()}</span>
        </div>
        <ChevronRight size={16} className="run-card-arrow" />
      </div>
    </div>
  );
}

export default function AgentActivity({ onSelectPatient }) {
  const { t } = useLanguage();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRuns = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const data = await getPatients();
      const patients = data.patients || [];
      const allRuns = [];
      for (const p of patients) {
        try {
          const json = await getAgentRunHistory(p._id, 5);
          if (json.runs) {
            json.runs.forEach(r => {
              if (!r.patientId || typeof r.patientId === "string") {
                r.patientId = { _id: p._id, name: p.name, patientCode: p.patientCode };
              }
              allRuns.push(r);
            });
          }
        } catch (_) { /* skip */ }
      }
      allRuns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRuns(allRuns);
    } catch (err) {
      setError(err.message || t("common.error"));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  if (loading) {
    return (<div className="dashboard loading-state"><RefreshCw size={22} className="spin" /><span>{t("common.loading")}</span></div>);
  }

  const completed = runs.filter(r => r.status === "completed").length;
  const failed = runs.filter(r => r.status === "failed").length;
  const running = runs.length - completed - failed;

  return (
    <div className="agent-activity-page">
      <section className="page-header">
        <div>
          <div className="section-eyebrow">{t("agent.autonomousAgent")}</div>
          <h2 className="page-title">{t("agent.agentActivity")}</h2>
          <p className="page-subtitle">
            {t("agent.totalRuns", { count: runs.length, s: runs.length !== 1 ? "s" : "" })}
            {runs.length > 0 && `, ${completed} ${t("agent.completed")}${failed > 0 ? `, ${failed} ${t("agent.failed")}` : ""}`}
          </p>
        </div>
        <button className="setup-button secondary" onClick={loadRuns}><RefreshCw size={14} /> {t("dashboard.refresh")}</button>
      </section>

      {error && (<div className="inline-error"><AlertTriangle size={16} /> {error}</div>)}

      {runs.length > 0 && (
        <section className="agent-overview-cards">
          <div className="agent-stat-card">
            <div className="agent-stat-icon"><Brain size={18} /></div>
            <div className="agent-stat-value">{runs.length}</div>
            <div className="agent-stat-label">{t("agent.totalRunsCount")}</div>
          </div>
          <div className="agent-stat-card success">
            <div className="agent-stat-icon"><CheckCircle2 size={18} /></div>
            <div className="agent-stat-value">{completed}</div>
            <div className="agent-stat-label">{t("agent.completedCount")}</div>
          </div>
          <div className="agent-stat-card warning">
            <div className="agent-stat-icon"><Activity size={18} /></div>
            <div className="agent-stat-value">{running}</div>
            <div className="agent-stat-label">{t("agent.runningCount")}</div>
          </div>
          {failed > 0 && (
            <div className="agent-stat-card error">
              <div className="agent-stat-icon"><AlertTriangle size={18} /></div>
              <div className="agent-stat-value">{failed}</div>
              <div className="agent-stat-label">{t("agent.failedCount")}</div>
            </div>
          )}
        </section>
      )}

      <section className="agent-runs-list">
        {runs.length > 0 ? (
          runs.map(run => (<RunCard key={run._id} run={run} onSelectPatient={onSelectPatient} />))
        ) : (
          <div className="empty-state-card">
            <Brain size={24} />
            <p>{t("agent.noRuns")}</p>
            <p className="empty-hint">{t("agent.runSimulationSee")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
