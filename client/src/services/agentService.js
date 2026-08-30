import {
  getLatestAgentRun,
  getAgentRunHistory,
  runCareFlowAgent,
  getPatientContext,
} from "./api";

export const fetchLatestAgentRun = async (patientId) => {
  try {
    const data = await getLatestAgentRun(patientId);
    return data?.run || null;
  } catch {
    return null;
  }
};

export const fetchAgentRunHistory = async (
  patientId,
  limit = 20
) => {
  try {
    const data = await getAgentRunHistory(patientId, limit);
    return data?.runs || [];
  } catch {
    return [];
  }
};

export const executeCareFlowAgent = async (
  patientId,
  trigger = "manual"
) => {
  const data = await runCareFlowAgent(patientId, trigger);
  return data?.result || null;
};

export const fetchPatientContext = async (patientId) => {
  const data = await getPatientContext(patientId);
  return data?.context || null;
};
