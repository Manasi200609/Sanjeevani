import { useState, useEffect } from "react";
import {
  UserRound,
  MapPin,
  Globe,
  Activity,
  Loader2,
} from "lucide-react";
import PatientSectionHeader from "../../components/patient/shared/PatientSectionHeader";
import { getPatients } from "../../services/api";

export default function PatientProfile() {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const data = await getPatients();
        const patients = data?.patients || [];
        if (patients.length > 0) {
          setPatient(patients[0]);
        } else {
          setError("No patient record found.");
        }
      } catch (err) {
        setError(err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, []);

  if (loading) {
    return (
      <div className="p-profile-page">
        <PatientSectionHeader eyebrow="ACCOUNT" title="My Profile" />
        <div className="p-profile-loading">
          <Loader2 size={20} className="spin" />
          Loading profile...
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-profile-page">
        <PatientSectionHeader eyebrow="ACCOUNT" title="My Profile" />
        <div className="p-profile-error">{error || "No patient data available."}</div>
      </div>
    );
  }

  const name = patient.name || "Patient";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const fmt = (val) => val || "Not provided";

  return (
    <div className="p-profile-page">
      <PatientSectionHeader eyebrow="ACCOUNT" title="My Profile" />

      <div className="p-profile-card">
        <div className="p-profile-avatar">{initials}</div>
        <h2 className="p-profile-name">{name}</h2>
        <div className="p-profile-status">
          <Activity size={12} />
          <span>Connected to Sanjeevani</span>
        </div>

        <div className="p-profile-details">
          <div className="p-profile-row">
            <UserRound size={16} />
            <span>Age</span>
            <strong>{fmt(patient.age)}</strong>
          </div>
          <div className="p-profile-row">
            <UserRound size={16} />
            <span>Gender</span>
            <strong>{fmt(patient.gender)}</strong>
          </div>
          <div className="p-profile-row">
            <Globe size={16} />
            <span>Language</span>
            <strong>{fmt(patient.preferredLanguage)}</strong>
          </div>
          <div className="p-profile-row">
            <MapPin size={16} />
            <span>Village</span>
            <strong>{fmt(patient.location?.village)}</strong>
          </div>
          <div className="p-profile-row">
            <MapPin size={16} />
            <span>District</span>
            <strong>{fmt(patient.location?.district)}</strong>
          </div>
          <div className="p-profile-row">
            <MapPin size={16} />
            <span>State</span>
            <strong>{fmt(patient.location?.state)}</strong>
          </div>
          <div className="p-profile-row">
            <Activity size={16} />
            <span>Patient Code</span>
            <strong>{fmt(patient.patientCode)}</strong>
          </div>
          {patient.trajectoryStatus && (
            <div className="p-profile-row">
              <Activity size={16} />
              <span>Trajectory</span>
              <strong className={`p-profile-trajectory ${patient.trajectoryStatus}`}>
                {fmt(patient.trajectoryStatus)}
              </strong>
            </div>
          )}
          {patient.followUp && (
            <div className="p-profile-row">
              <Activity size={16} />
              <span>Follow-up interval</span>
              <strong>{fmt(patient.followUp?.intervalDays)} days</strong>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .p-profile-page {
          max-width: 560px;
          width: 100%;
          min-width: 0;
        }

        .p-profile-loading {
          display: flex; align-items: center; gap: 8px;
          padding: 40px; color: #64748B; font-size: 12px;
          justify-content: center;
        }

        .p-profile-error {
          padding: 16px; border-radius: 8px;
          background: rgba(239, 68, 68, 0.12); color: #EF4444;
          font-size: 12px; font-weight: 500;
        }

        .p-profile-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 28px;
          background: #0D2E2A;
          border: 1px solid #1B453F;
          border-radius: 14px;
        }

        .p-profile-avatar {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(20, 184, 166, 0.12);
          color: #14B8A6;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .p-profile-name {
          margin: 0 0 6px;
          font-family: "Manrope", sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #F0F4F8;
        }

        .p-profile-status {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 20px;
          font-size: 11px;
          color: #22C55E;
          font-weight: 600;
        }

        .p-profile-details {
          width: 100%;
        }

        .p-profile-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 0;
          border-bottom: 1px solid #1B453F;
          font-size: 12px;
          color: #94A3B8;
        }

        .p-profile-row:last-child {
          border-bottom: 0;
        }

        .p-profile-row svg {
          color: #14B8A6;
          flex-shrink: 0;
        }

        .p-profile-row span:first-of-type {
          flex: 1;
        }

        .p-profile-row strong {
          color: #F0F4F8;
          font-weight: 600;
        }

        .p-profile-trajectory.worsening {
          color: #EF4444;
        }
        .p-profile-trajectory.stable {
          color: #22C55E;
        }

        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
