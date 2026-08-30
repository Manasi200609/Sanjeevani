import AttentionPatientCard from "./AttentionPatientCard";

export default function AttentionList({ patients = [] }) {
  return (
    <div className="attention-list">
      {patients.length > 0 ? (
        patients.map((patient) => (
          <AttentionPatientCard
            key={patient._id || patient.patientCode}
            patient={patient}
          />
        ))
      ) : (
        <div className="empty-state">
          No patients currently require attention.
        </div>
      )}
    </div>
  );
}