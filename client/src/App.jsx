import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
} from "react-router-dom";
import { LanguageProvider } from "./services/LanguageContext";
import AppLayout from "./components/layout/AppLayout";
import Landing from "./pages/Landing";
import Monitor from "./pages/Monitor";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientDetails from "./pages/PatientDetails";
import AgentActivity from "./pages/AgentActivity";
import Settings from "./pages/Settings";
import RecordVisit from "./pages/RecordVisit";
import PatientLayout from "./components/patient/PatientLayout";
import PatientHome from "./pages/patient/PatientHome";
import PatientChat from "./pages/patient/PatientChat";
import PatientHealth from "./pages/patient/PatientHealth";
import PatientTimeline from "./pages/patient/PatientTimeline";
import PatientMedications from "./pages/patient/PatientMedications";
import PatientProfile from "./pages/patient/PatientProfile";

// ============================================================
// ASHA ROUTED PAGES
// ============================================================

function MonitorRoute() {
  const navigate = useNavigate();
  const handleSelectPatient = (patientId) =>
    navigate(`/asha/patients/${patientId}`);
  return (
    <Monitor onSelectPatient={handleSelectPatient} />
  );
}

function DashboardRoute() {
  const navigate = useNavigate();
  const handleSelectPatient = (patientId) =>
    navigate(`/patients/${patientId}`);
  return (
    <Dashboard onSelectPatient={handleSelectPatient} />
  );
}

function PatientsRoute() {
  const navigate = useNavigate();
  const handleSelectPatient = (patientId) =>
    navigate(`/patients/${patientId}`);
  return (
    <Patients onSelectPatient={handleSelectPatient} />
  );
}

function PatientDetailsRoute() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const handleBack = () => navigate("/patients");
  return (
    <PatientDetails
      patientId={patientId}
      onBack={handleBack}
    />
  );
}

function AgentActivityRoute() {
  const navigate = useNavigate();
  const handleSelectPatient = (patientId) =>
    navigate(`/patients/${patientId}`);
  return (
    <AgentActivity
      onSelectPatient={handleSelectPatient}
    />
  );
}

function RecordVisitRoute() {
  const navigate = useNavigate();
  const handleNavigate = (page, patientId) => {
    if (page === "patient" && patientId) {
      navigate(`/patients/${patientId}`);
    } else {
      navigate(`/asha/${page}`);
    }
  };
  return (
    <RecordVisit onNavigate={handleNavigate} />
  );
}

// ============================================================
// APP
// ============================================================

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          {/* ---- LANDING / ROLE SELECTION ---- */}
          <Route path="/" element={<Landing />} />

          {/* ---- ASHA WORKER SIDE ---- */}
          <Route
            path="/asha"
            element={
              <AppLayout>
                <MonitorRoute />
              </AppLayout>
            }
          />
          <Route
            path="/asha/dashboard"
            element={
              <AppLayout>
                <MonitorRoute />
              </AppLayout>
            }
          />
          <Route
            path="/asha/patients"
            element={
              <AppLayout>
                <PatientsRoute />
              </AppLayout>
            }
          />
          <Route
            path="/asha/patients/:patientId"
            element={
              <AppLayout>
                <PatientDetailsRoute />
              </AppLayout>
            }
          />
          <Route
            path="/asha/agent"
            element={
              <AppLayout>
                <AgentActivityRoute />
              </AppLayout>
            }
          />
          <Route
            path="/asha/record"
            element={
              <AppLayout>
                <RecordVisitRoute />
              </AppLayout>
            }
          />
          <Route
            path="/asha/settings"
            element={
              <AppLayout>
                <Settings />
              </AppLayout>
            }
          />

          {/* ---- PATIENT SIDE ---- */}
          <Route
            path="/patient/home"
            element={<PatientLayout><PatientHome /></PatientLayout>}
          />
          <Route
            path="/patient/chat"
            element={<PatientLayout><PatientChat /></PatientLayout>}
          />
          <Route
            path="/patient/health"
            element={<PatientLayout><PatientHealth /></PatientLayout>}
          />
          <Route
            path="/patient/timeline"
            element={<PatientLayout><PatientTimeline /></PatientLayout>}
          />
          <Route
            path="/patient/medications"
            element={<PatientLayout><PatientMedications /></PatientLayout>}
          />
          <Route
            path="/patient/profile"
            element={<PatientLayout><PatientProfile /></PatientLayout>}
          />

          {/* ---- LEGACY ROUTES (backward compat) ---- */}
          <Route
            path="/dashboard"
            element={
              <AppLayout>
                <MonitorRoute />
              </AppLayout>
            }
          />
          <Route
            path="/patients"
            element={
              <AppLayout>
                <PatientsRoute />
              </AppLayout>
            }
          />
          <Route
            path="/patients/:patientId"
            element={
              <AppLayout>
                <PatientDetailsRoute />
              </AppLayout>
            }
          />
          <Route
            path="/agent"
            element={
              <AppLayout>
                <AgentActivityRoute />
              </AppLayout>
            }
          />
          <Route
            path="/record"
            element={
              <AppLayout>
                <RecordVisitRoute />
              </AppLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <AppLayout>
                <Settings />
              </AppLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
