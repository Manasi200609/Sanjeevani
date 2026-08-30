import { getPatientTimeline as apiGetTimeline } from "./api";

export const fetchPatientTimeline = async (patientId) => {
  const data = await apiGetTimeline(patientId);

  // Backend shape: { success, patientId, count, timeline: [...] }
  return data?.timeline || [];
};
