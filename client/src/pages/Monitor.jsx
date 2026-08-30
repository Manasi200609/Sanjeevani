import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import StreamSummaryBar from "../components/monitor/StreamSummaryBar";
import EventStream from "../components/monitor/EventStream";
import AgentStatusPulse from "../components/monitor/AgentStatusPulse";
import AgentPipeline from "../components/agent/AgentPipeline";
import { getDashboard, getPatients, getAgentRunHistory } from "../services/api";
import { useLanguage } from "../services/LanguageContext";

// ============================================================
// MONITOR PAGE
// ============================================================

export default function Monitor({ onSelectPatient }) {
  const { t } = useLanguage();
  const [dashboardData, setDashboardData] = useState(null);
  const [latestRun, setLatestRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -------------------------------------------------------
  // Load dashboard data for summary + status
  // -------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading((prev) => !dashboardData && prev);
      setError("");

      const data = await getDashboard();
      setDashboardData(data);

      // Get the latest agent run across all patients
      const patients = data?.attentionPatients || [];
      if (patients.length > 0) {
        try {
          const runsData = await getAgentRunHistory(patients[0]._id, 1);
          if (runsData?.runs?.length > 0) {
            const run = runsData.runs[0];
            // Ensure patientId is populated
            if (!run.patientId || typeof run.patientId === "string") {
              run.patientId = {
                _id: patients[0]._id,
                name: patients[0].name,
                patientCode: patients[0].patientCode,
              };
            }
            setLatestRun(run);
          }
        } catch {
          // Not critical — agent pipeline just won't show
        }
      }
    } catch (err) {
      console.error("Monitor load error:", err);
      if (!dashboardData) {
        setError(err.message || "Failed to load monitoring data");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Poll dashboard summary every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const stats = dashboardData?.stats || {};
  const attentionPatients = dashboardData?.attentionPatients || [];
  const agentStatus = loading ? "active" : error ? "error" : "active";

  return (
    <div className="monitor-page">
      {/* ---- SYSTEM HEADER ---- */}
      <section className="monitor-header">
        <div>
          <p className="section-eyebrow">{t("monitor.eyebrow")}</p>
          <h2 className="page-title">{t("monitor.title")}</h2>
          <p className="page-subtitle">
            {attentionPatients.length > 0
              ? t("monitor.attentionCount").replace("{count}", attentionPatients.length).replace("{s}", attentionPatients.length !== 1 ? "s" : "")
              : t("monitor.allStable")}
          </p>
        </div>
      </section>

      {/* ---- ERROR STATE ---- */}
      {error && !dashboardData && (
        <div className="inline-error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* ---- LOADING STATE ---- */}
      {loading && !dashboardData && (
        <div className="loading-state">
          <RefreshCw size={22} className="spin" />
          <span>{t("monitor.connecting")}</span>
        </div>
      )}

      {/* ---- MAIN CONTENT ---- */}
      {dashboardData && (
        <>
          {/* Summary Bar */}
          <StreamSummaryBar
            stats={stats}
            agentStatus={agentStatus}
            lastCheck={dashboardData.generatedAt}
          />

          {/* Two-column layout */}
          <div className="monitor-grid">
            {/* Left column: Event Stream (dominant) */}
            <div className="monitor-stream-col">
              <EventStream onSelectPatient={onSelectPatient} />
            </div>

            {/* Right column: Agent Pipeline + Status */}
            <div className="monitor-side-col">
              {/* Agent Status Pulse */}
              <AgentStatusPulse
                status={agentStatus}
                patientCount={stats.totalPatients || 0}
                lastCheck={dashboardData.generatedAt}
              />

              {/* Latest Agent Pipeline */}
              {latestRun && (
                <div className="monitor-pipeline-section">
                  <div className="section-eyebrow" style={{ marginBottom: "10px" }}>
                    {t("monitor.latestAgentRun")}
                  </div>
                  <AgentPipeline run={latestRun} compact />
                </div>
              )}

              {/* Attention Patients Quick List */}
              {attentionPatients.length > 0 && (
                <div className="monitor-attention-section">
                  <div className="section-eyebrow" style={{ marginBottom: "10px" }}>
                    {t("monitor.requiringAttention")}
                  </div>
                  <div className="attention-quick-list">
                    {attentionPatients.slice(0, 5).map((patient) => (
                      <div
                        key={patient._id}
                        className="attention-quick-item clickable"
                        onClick={() => onSelectPatient?.(patient._id)}
                      >
                        <div className="attention-quick-avatar">
                          {patient.name?.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                        <div className="attention-quick-info">
                          <div className="attention-quick-name">{patient.name}</div>
                          <div className="attention-quick-meta">
                            {patient.patientCode} · {t("monitor.risk")} {patient.riskScore ?? 0}/100 · {patient.trajectoryStatus || "stable"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .monitor-page {
          max-width: 1600px;
          margin: 0 auto;
        }

        .monitor-header {
          margin-bottom: 20px;
        }

        .monitor-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.6fr);
          gap: 20px;
          align-items: start;
        }

        .monitor-stream-col {
          min-width: 0;
        }

        .monitor-side-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: sticky;
          top: 104px;
        }

        .monitor-pipeline-section {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
        }

        .monitor-attention-section {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
        }

        .attention-quick-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .attention-quick-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 8px;
          transition: background 0.15s ease;
        }

        .attention-quick-item:hover {
          background: var(--bg-elevated);
        }

        .attention-quick-avatar {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--teal-light);
          color: var(--teal);
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .attention-quick-info {
          flex: 1;
          min-width: 0;
        }

        .attention-quick-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .attention-quick-meta {
          font-size: 9px;
          color: var(--muted);
          margin-top: 2px;
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .monitor-grid {
            grid-template-columns: 1fr;
          }

          .monitor-side-col {
            position: static;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          }
        }

        @media (max-width: 700px) {
          .monitor-side-col {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
