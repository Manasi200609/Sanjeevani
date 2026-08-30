import axios from "axios";

// ============================================================
// API CLIENT
// ============================================================
//
// All backend communication goes through this module.
// The base URL is configurable via the VITE_API_BASE_URL
// environment variable. Falls back to localhost:5000/api
// for local development.
// ============================================================

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================
//
// Normalizes errors so every caller gets a consistent shape:
// { message: string, status?: number }
// ============================================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";

    const status =
      error.response?.status || null;

    const normalized = new Error(message);
    normalized.status = status;

    return Promise.reject(normalized);
  }
);

// ============================================================
// PATIENTS
// ============================================================

export const getPatients = async () => {
  const response = await api.get("/patients");
  return response.data;
};

export const getPatient = async (patientId) => {
  const response = await api.get(
    `/patients/${patientId}`
  );
  return response.data;
};export const createPatient = async (patientData) => {
  const response = await api.post(
    "/patients",
    patientData
  );

  return response.data;
};

export const updatePatient = async (patientId, updates) => {
  const response = await api.put(
    `/patients/${patientId}`,
    updates
  );

  return response.data;
};

// ============================================================
// PATIENT EVENTS
// ============================================================

export const createPatientEvent = async (
  patientId,
  eventData
) => {
  const response = await api.post(
    `/events/${patientId}/events`,
    eventData
  );

  return response.data;
};

export const getPatientTimeline = async (
  patientId
) => {
  const response = await api.get(
    `/events/${patientId}/timeline`
  );

  return response.data;
};

// ============================================================
// TRAJECTORY
// ============================================================

export const getPatientTrajectory = async (
  patientId
) => {
  const response = await api.get(
    `/agent/patients/${patientId}/trajectory`
  );

  return response.data;
};

// ============================================================
// PATIENT CONTEXT
// ============================================================

export const getPatientContext = async (
  patientId
) => {
  const response = await api.get(
    `/agent/patients/${patientId}/context`
  );

  return response.data;
};

// ============================================================
// AI ANALYSIS
// ============================================================

export const getAIAnalysis = async (
  patientId
) => {
  const response = await api.get(
    `/agent/patients/${patientId}/ai-analysis`
  );

  return response.data;
};

// ============================================================
// CAREFLOW AGENT
// ============================================================

export const runCareFlowAgent = async (
  patientId,
  trigger = "manual"
) => {
  const response = await api.post(
    `/agent/patients/${patientId}/run`,
    {
      trigger,
    },
    { timeout: 180000 }
  );

  return response.data;
};

// ============================================================
// AGENT RUNS
// ============================================================

export const getLatestAgentRun = async (
  patientId
) => {
  const response = await api.get(
    `/agent/patients/${patientId}/runs/latest`
  );

  return response.data;
};

export const getAgentRunHistory = async (
  patientId,
  limit = 20
) => {
  const response = await api.get(
    `/agent/patients/${patientId}/runs`,
    {
      params: {
        limit,
      },
    }
  );

  return response.data;
};

export const getAgentRunReplay = async (runId) => {
  const response = await api.get(`/agent/runs/${runId}`);
  return response.data;
};

// ============================================================
// CARE PLANS
// ============================================================

export const getActiveCarePlan = async (
  patientId
) => {
  const response = await api.get(
    `/care-plans/patient/${patientId}`
  );

  return response.data;
};

export const getCarePlanHistory = async (
  patientId
) => {
  const response = await api.get(
    `/care-plans/patient/${patientId}/history`
  );

  return response.data;
};

export const createCarePlan = async (
  patientId,
  carePlanData
) => {
  const response = await api.post(
    `/care-plans/patient/${patientId}`,
    carePlanData
  );

  return response.data;
};

export const updateCarePlan = async (
  carePlanId,
  updates
) => {
  const response = await api.put(
    `/care-plans/${carePlanId}`,
    updates
  );

  return response.data;
};

export const completeCarePlan = async (
  carePlanId
) => {
  const response = await api.patch(
    `/care-plans/${carePlanId}/complete`
  );

  return response.data;
};

// ============================================================
// CARE DECISIONS
// ============================================================

export const applyCareDecision = async (
  decisionId
) => {
  const response = await api.post(
    `/agent/decisions/${decisionId}/apply`
  );

  return response.data;
};

// ============================================================
// DASHBOARD
// ============================================================

export const getDashboard = async () => {
  const response = await api.get("/dashboard");
  return response.data;
};

// ============================================================
// AGENT EVENTS (Live Monitor)
// ============================================================

export const getAgentEvents = async (limit = 30) => {
  const response = await api.get("/agent/events", {
    params: { limit },
  });
  return response.data;
};

export const getPatientAgentEvents = async (patientId, limit = 20) => {
  const response = await api.get(`/agent/events/patient/${patientId}`, {
    params: { limit },
  });
  return response.data;
};

// ============================================================
// SIMULATION
// ============================================================

export const runSimulationSetup = async (
  days = 5
) => {
  const response = await api.post(
    "/simulation/setup",
    { days }
  );
  return response.data;
};

export const generateEvents = async (
  days = 5
) => {
  const response = await api.post(
    "/simulation/generate-events",
    { days }
  );
  return response.data;
};

export const runAllAgents = async () => {
  const response = await api.post(
    "/simulation/run-all-agents"
  );
  return response.data;
};


// ============================================================
// RECORD VISIT (ASHA Worker)
// ============================================================

export const recordVisit = async (patientId, visitData) => {
  const response = await api.post("/visits", {
    patientId,
    ...visitData,
  });
  return response.data;
};

export default api;