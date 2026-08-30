import { getPatients, getPatient } from "./api";

export const fetchPatients = async () => {
  const data = await getPatients();

  // getPatients() already returns response.data from axios.
  // The backend shape is: { success, count, patients: [...] }
  // Return just the patients array.
  return data?.patients || [];
};

export const fetchPatientById = async (patientId) => {
  const data = await getPatient(patientId);

  // Backend shape: { success, patient: {...} }
  return data?.patient || null;
};