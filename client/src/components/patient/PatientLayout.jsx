import PatientSidebar from "./PatientSidebar";
import PatientTopbar from "./PatientTopbar";

export default function PatientLayout({ children }) {
  return (
    <div className="patient-layout">
      <PatientSidebar />
      <div className="patient-main">
        <PatientTopbar />
        <main className="patient-content">
          {children}
        </main>
      </div>

      <style>{`
        .patient-layout {
          min-height: 100vh;
          background: #071F1C;
          color: #F0F4F8;
        }

        .patient-main {
          margin-left: 248px;
          min-height: 100vh;
          background: #071F1C;
          position: relative;
        }

        .patient-content {
          padding: 88px 36px 48px;
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
          background: transparent;
        }

        @media (max-width: 900px) {
          .patient-main {
            margin-left: 0;
          }
          .patient-content {
            padding: 76px 16px 40px;
          }
        }
      `}</style>
    </div>
  );
}
