import { useEffect, useState, useCallback } from "react";
import {
  ArrowRight, Activity, Clock3, Filter, RefreshCw,
  Users, Search, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { getPatients } from "../services/api";
import { useLanguage } from "../services/LanguageContext";

function PriorityBadge({ priority }) {
  return (
    <span className={`priority-badge ${priority.toLowerCase()}`}>
      <span className="priority-dot" />
      {priority}
    </span>
  );
}

function PatientRow({ patient, onClick }) {
  const { t } = useLanguage();
  const followUpDays = patient.followUp?.intervalDays ?? 7;
  const initials = patient.name?.split(" ").map(w => w[0]).join("").slice(0, 2);
  const trajectoryClass = patient.trajectoryStatus === "worsening" ? "worsening"
    : patient.trajectoryStatus === "improving" ? "stable"
    : patient.currentState === "watch" ? "watch" : "stable";
  const followUpText = patient.followUp?.nextFollowUpAt
    ? new Date(patient.followUp.nextFollowUpAt).toLocaleDateString()
    : `${followUpDays} ${t("common.days")}`;

  return (
    <div className="patient-row clickable" onClick={() => onClick?.(patient._id)}>
      <div className="patient-main">
        <div className="patient-avatar">{initials}</div>
        <div className="patient-identity">
          <div className="patient-name">{patient.name}</div>
          <div className="patient-meta">{patient.patientCode} · {patient.age} yrs · {patient.location?.village || "—"}</div>
        </div>
      </div>
      <div className="patient-trajectory">
        <div className="trajectory-label">{t("patients.trajectoryLabel")}</div>
        <div className={`trajectory-value ${trajectoryClass}`}>
          <Activity size={14} /> {patient.trajectoryStatus || "stable"}
        </div>
      </div>
      <div className="patient-risk">
        <div className="trajectory-label">{t("patients.priorityLabel")}</div>
        <PriorityBadge priority={patient.priority || "normal"} />
      </div>
      <div className="patient-followup">
        <div className="trajectory-label">{t("patients.followUpLabel")}</div>
        <div className="followup-value"><Clock3 size={14} /> {followUpText}</div>
      </div>
      <button className="row-action" aria-label={`Open ${patient.name}`}>
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

export default function Patients({ onSelectPatient }) {
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterTrajectory, setFilterTrajectory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const data = await getPatients();
      setPatients(data.patients || []);
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const filtered = patients.filter((p) => {
    if (filterPriority !== "all" && p.priority !== filterPriority) return false;
    if (filterTrajectory !== "all" && p.trajectoryStatus !== filterTrajectory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.name?.toLowerCase().includes(q) && !p.patientCode?.toLowerCase().includes(q) && !p.location?.village?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all: patients.length,
    urgent: patients.filter(p => p.priority === "urgent").length,
    high: patients.filter(p => p.priority === "high").length,
    elevated: patients.filter(p => p.priority === "elevated").length,
    normal: patients.filter(p => p.priority === "normal").length,
    worsening: patients.filter(p => p.trajectoryStatus === "worsening").length,
    stable: patients.filter(p => p.trajectoryStatus === "stable").length,
    improving: patients.filter(p => p.trajectoryStatus === "improving").length,
  };

  if (loading) {
    return (<div className="dashboard loading-state"><RefreshCw size={22} className="spin" /><span>{t("common.loading")}</span></div>);
  }

  return (
    <div className="patients-page">
      <section className="page-header">
        <div>
          <div className="section-eyebrow">{t("patients.management")}</div>
          <h2 className="page-title">{t("patients.allPatients")}</h2>
          <p className="page-subtitle">{t("patients.activeCount", { count: patients.length, s: patients.length !== 1 ? "s" : "" })}</p>
        </div>
      </section>

      {error && (<div className="inline-error"><AlertTriangle size={16} /> {error}</div>)}

      <section className="filter-bar">
        <div className="filter-group">
          <div className="filter-label"><Filter size={13} /> {t("patients.priority")}</div>
          <div className="filter-chips">
            {[
              { key: "all", label: `${t("patients.all")} (${counts.all})` },
              { key: "urgent", label: `${t("patients.urgent")} (${counts.urgent})` },
              { key: "high", label: `${t("patients.high")} (${counts.high})` },
              { key: "elevated", label: `${t("patients.elevated")} (${counts.elevated})` },
              { key: "normal", label: `${t("patients.normal")} (${counts.normal})` },
            ].map(f => (
              <button key={f.key} className={`filter-chip ${filterPriority === f.key ? "active" : ""}`} onClick={() => setFilterPriority(f.key)}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-label"><Activity size={13} /> {t("patients.trajectory")}</div>
          <div className="filter-chips">
            {[
              { key: "all", label: t("patients.all") },
              { key: "worsening", label: `${t("patients.worsening")} (${counts.worsening})` },
              { key: "stable", label: `${t("patients.stable")} (${counts.stable})` },
              { key: "improving", label: `${t("patients.improving")} (${counts.improving})` },
            ].map(f => (
              <button key={f.key} className={`filter-chip ${filterTrajectory === f.key ? "active" : ""}`} onClick={() => setFilterTrajectory(f.key)}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="search-bar">
          <Search size={15} />
          <input type="text" placeholder={t("patients.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </section>

      <section className="patients-list-card">
        <div className="section-heading">
          <div>
            <div className="section-eyebrow">{t("patients.patients")}</div>
            <h2>{filtered.length} patient{filtered.length !== 1 ? "s" : ""}{filterPriority !== "all" || filterTrajectory !== "all" || searchQuery ? ` ${t("patients.filtered")}` : ""}</h2>
          </div>
          <button className="setup-button secondary" onClick={loadPatients}><RefreshCw size={14} /> {t("dashboard.refresh")}</button>
        </div>
        {filtered.length > 0 ? (
          <div className="patient-list">
            {filtered.map(patient => (<PatientRow key={patient._id} patient={patient} onClick={onSelectPatient} />))}
          </div>
        ) : (
          <div className="empty-state-card">
            {patients.length === 0 ? (
              <><Users size={24} /><p>{t("patients.noPatientsFound")}</p><p className="empty-hint">{t("patients.goToDashboard")}</p></>
            ) : (
              <><CheckCircle2 size={24} /><p>{t("patients.noMatchFilters")}</p><p className="empty-hint">{t("patients.adjustFilters")}</p></>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
