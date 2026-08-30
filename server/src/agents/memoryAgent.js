import {
  consolidateRecentMemory,
  getConsolidatedMemory,
} from "../memory/memoryConsolidation.js";

export const consolidatePatientMemory = async (patientId) => {
  return consolidateRecentMemory(patientId);
};

export const getPatientMemory = async (patientId) => {
  return getConsolidatedMemory(patientId);
};
