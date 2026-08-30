import { useState, useEffect } from "react";
import { useLanguage } from "../services/LanguageContext";
import { getPatients, recordVisit } from "../services/api";
import {
  ClipboardCheck,
  User,
  Activity,
  Stethoscope,
  Pill,
  FileText,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  Heart,
  Droplets,
  Weight,
  Search,
  X,
  ChevronDown,
} from "lucide-react";

const fmt = (v) => String(v || "").replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

export default function RecordVisit({ onNavigate }) {
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [weight, setWeight] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState("");
  const [adherence, setAdherence] = useState("good");
  const [severity, setSeverity] = useState("routine");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [patientSearch, setPatientSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    setLoadingPatients(true);
    getPatients()
      .then((res) => setPatients(res?.patients || []))
      .catch(() => setPatients([]))
      .finally(() => setLoadingPatients(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError(t("visit.patientRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const bpParts = (bloodPressure || "").split("/").map((s) => Number(s.trim())).filter((n) => !isNaN(n));
      const symptomList = symptoms.split(",").map((s) => s.trim()).filter(Boolean).map((name) => ({ name, severity: 5, status: "new" }));
      const medList = medications.split(",").map((m) => m.trim()).filter(Boolean).map((name) => ({ name, adherence, notes: "" }));

      await recordVisit(selectedPatient, {
        symptoms: symptomList.length ? symptomList : undefined,
        vitals: {
          ...(bpParts.length >= 2 ? { systolicBP: bpParts[0], diastolicBP: bpParts[1] } : {}),
          heartRate: heartRate ? Number(heartRate) : undefined,
          temperature: temperature ? Number(temperature) : undefined,
          oxygenSaturation: oxygenSaturation ? Number(oxygenSaturation) : undefined,
          weight: weight ? Number(weight) : undefined,
        },
        notes,
        medications: medList.length ? medList : undefined,
        severity: severity === "routine" ? "low" : severity === "moderate" ? "moderate" : "high",
      });
      setSuccess(true);
      // Reset form
      setSelectedPatient("");
      setSymptoms("");
      setBloodPressure("");
      setHeartRate("");
      setTemperature("");
      setWeight("");
      setBloodSugar("");
      setOxygenSaturation("");
      setNotes("");
      setMedications("");
      setAdherence("good");
      setSeverity("routine");
    } catch (err) {
      setError(t("visit.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page record-visit-page">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon record-visit-icon">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h1>{t("visit.title")}</h1>
            <p className="page-subtitle">{t("visit.subtitle")}</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="alert alert-success" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ADE80", padding: "14px 18px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <CheckCircle2 size={18} />
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>Visit recorded successfully</div>
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "2px" }}>Event added to patient timeline. CareFlow has been notified.</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171", padding: "14px 18px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="visit-form">
        {/* Patient Selection */}
        <div className="form-section">
          <div className="form-section-header">
            <User size={16} />
            <span>{t("visit.selectPatient")}</span>
          </div>
          <div className="patient-selector" style={{ position: "relative" }}>
            {selectedPatient ? (
              <div
                className="form-input"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  background: "#0D2740",
                  borderColor: "#1E3A52",
                }}
                onClick={() => {
                  setSelectedPatient("");
                  setPatientSearch("");
                  setDropdownOpen(true);
                }}
              >
                <span style={{ color: "#F0F4F8" }}>
                  {patients.find((p) => p._id === selectedPatient)?.name || "Selected"}
                </span>
                <X size={16} style={{ color: "#64748B" }} />
              </div>
            ) : (
              <>
                <div style={{ position: "relative" }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#64748B",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: "36px", paddingRight: "36px" }}
                    placeholder={loadingPatients ? "Loading patients..." : "Search patient name or code..."}
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                    disabled={loadingPatients}
                  />
                  <ChevronDown
                    size={16}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#64748B",
                      pointerEvents: "none",
                    }}
                  />
                </div>
                {dropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: "4px",
                      background: "#0C1829",
                      border: "1px solid #1E3A52",
                      borderRadius: "10px",
                      maxHeight: "240px",
                      overflowY: "auto",
                      zIndex: 1000,
                      boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                    }}
                  >
                    {patients
                      .filter((p) => {
                        const q = patientSearch.toLowerCase();
                        return (
                          !q ||
                          (p.name || "").toLowerCase().includes(q) ||
                          (p.patientCode || "").toLowerCase().includes(q)
                        );
                      })
                      .map((p) => (
                        <div
                          key={p._id}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            borderBottom: "1px solid #1A2E47",
                            transition: "background 0.15s",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedPatient(p._id);
                            setPatientSearch("");
                            setDropdownOpen(false);
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#111F33")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ color: "#F0F4F8", fontWeight: 500, fontSize: "14px" }}>{p.name}</div>
                          <div style={{ color: "#64748B", fontSize: "12px", marginTop: "2px" }}>
                            {p.patientCode} · {p.preferredLanguage || "—"} · {fmt(p.priority || "normal")} priority
                          </div>
                        </div>
                      ))}
                    {patients.filter((p) => {
                      const q = patientSearch.toLowerCase();
                      return !q || (p.name || "").toLowerCase().includes(q) || (p.patientCode || "").toLowerCase().includes(q);
                    }).length === 0 && (
                      <div style={{ padding: "14px", color: "#64748B", textAlign: "center", fontSize: "13px" }}>
                        No patients found
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Symptoms */}
        <div className="form-section">
          <div className="form-section-header">
            <Stethoscope size={16} />
            <span>{t("visit.symptoms")}</span>
          </div>
          <textarea
            className="form-textarea"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder={t("visit.symptomsPlaceholder")}
            rows={3}
          />
        </div>

        {/* Vitals */}
        <div className="form-section">
          <div className="form-section-header">
            <Activity size={16} />
            <span>{t("visit.vitals")}</span>
          </div>
          <div className="vitals-grid">
            <div className="vital-field">
              <label><Droplets size={14} /> {t("visit.bloodPressure")}</label>
              <input
                type="text"
                className="form-input"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                placeholder={t("visit.bloodPressurePlaceholder")}
              />
            </div>
            <div className="vital-field">
              <label><Heart size={14} /> {t("visit.heartRate")}</label>
              <input
                type="number"
                className="form-input"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder={t("visit.heartRatePlaceholder")}
              />
            </div>
            <div className="vital-field">
              <label><Thermometer size={14} /> {t("visit.temperature")}</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder={t("visit.temperaturePlaceholder")}
              />
            </div>
            <div className="vital-field">
              <label><Weight size={14} /> {t("visit.weight")}</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={t("visit.weightPlaceholder")}
              />
            </div>
            <div className="vital-field">
              <label><Droplets size={14} /> {t("visit.bloodSugar")}</label>
              <input
                type="number"
                className="form-input"
                value={bloodSugar}
                onChange={(e) => setBloodSugar(e.target.value)}
                placeholder={t("visit.bloodSugarPlaceholder")}
              />
            </div>
            <div className="vital-field">
              <label><Activity size={14} /> SpO₂ (%)</label>
              <input
                type="number"
                className="form-input"
                value={oxygenSaturation}
                onChange={(e) => setOxygenSaturation(e.target.value)}
                placeholder="e.g. 97"
                min="70"
                max="100"
              />
            </div>
          </div>
        </div>

        {/* Medications */}
        <div className="form-section">
          <div className="form-section-header">
            <Pill size={16} />
            <span>{t("visit.medications")}</span>
          </div>
          <input
            type="text"
            className="form-input"
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
            placeholder={t("visit.medicationsPlaceholder")}
          />
          <div className="adherence-options">
            <label className="adherence-label">{t("visit.adherence")}</label>
            <div className="radio-group">
              {["good", "partial", "poor"].map((val) => (
                <label key={val} className={`radio-option ${adherence === val ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="adherence"
                    value={val}
                    checked={adherence === val}
                    onChange={(e) => setAdherence(e.target.value)}
                  />
                  <span>{t(`visit.adherence${val.charAt(0).toUpperCase() + val.slice(1)}`)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Severity */}
        <div className="form-section">
          <div className="form-section-header">
            <AlertCircle size={16} />
            <span>{t("visit.severity")}</span>
          </div>
          <div className="radio-group severity-group">
            {["routine", "moderate", "urgent"].map((val) => (
              <label key={val} className={`radio-option ${severity === val ? `active severity-${val}` : ''}`}>
                <input
                  type="radio"
                  name="severity"
                  value={val}
                  checked={severity === val}
                  onChange={(e) => setSeverity(e.target.value)}
                />
                <span>{t(`visit.severity${val.charAt(0).toUpperCase() + val.slice(1)}`)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="form-section">
          <div className="form-section-header">
            <FileText size={16} />
            <span>{t("visit.notes")}</span>
          </div>
          <textarea
            className="form-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("visit.notesPlaceholder")}
            rows={4}
          />
        </div>

        {/* Submit */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={submitting}
          >
            {submitting ? (
              <>{t("visit.submitting")}</>
            ) : (
              <>
                <ClipboardCheck size={18} />
                {t("visit.submit")}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
