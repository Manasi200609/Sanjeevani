import {
  getActiveCarePlan,
  getCarePlanHistory,
} from "./api";

export const fetchActiveCarePlan = async (patientId) => {
  try {
    const data = await getActiveCarePlan(patientId);
    return data?.carePlan || null;
  } catch {
    return null;
  }
};

export const fetchCarePlanHistory = async (patientId) => {
  try {
    const data = await getCarePlanHistory(patientId);
    return data?.carePlans || [];
  } catch {
    return [];
  }
};
