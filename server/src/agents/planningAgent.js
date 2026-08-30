import {
  createCarePlan,
  applyCareDecision,
} from "../services/carePlanner.js";

export const createCarePlanDecision = async ({
  patientId,
  analysis,
  context,
}) => {
  return createCarePlan({
    patientId,
    analysis,
    context,
  });
};

// Alias used by the orchestrator.
export const createPlan = createCarePlanDecision;

export const executeCareDecision = async (decisionId) => {
  return applyCareDecision(decisionId);
};
