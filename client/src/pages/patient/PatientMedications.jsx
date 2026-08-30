import { Pill } from "lucide-react";
import PatientSectionHeader from "../../components/patient/shared/PatientSectionHeader";

export default function PatientMedications() {
  return (
    <div className="p-meds-page">
      <PatientSectionHeader
        eyebrow="PRESCRIPTIONS"
        title="My Medications"
      />

      <div className="p-meds-empty">
        <div className="p-meds-empty-icon">
          <Pill size={32} />
        </div>
        <h3>No medication information available yet</h3>
        <p>
          Your prescriptions and medication schedule
          will appear here once shared by your care
          team.
        </p>
      </div>

      <style>{`
        .p-meds-page {
          max-width: 800px;
          width: 100%;
          min-width: 0;
        }

        .p-meds-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 60px 20px;
          background: #0D2E2A;
          border: 1px solid #1B453F;
          border-radius: 12px;
        }

        .p-meds-empty-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: rgba(245, 158, 11, 0.12);
          color: #F59E0B;
          margin-bottom: 16px;
        }

        .p-meds-empty h3 {
          margin: 0 0 6px;
          font-family: "Manrope", sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #F0F4F8;
        }

        .p-meds-empty p {
          margin: 0;
          color: #94A3B8;
          font-size: 12px;
          line-height: 1.6;
          max-width: 340px;
        }
      `}</style>
    </div>
  );
}
