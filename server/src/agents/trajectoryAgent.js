import { analyzeTrajectoryWithAI } from "../ai/aiProvider.js";
import { buildPatientContext } from "../memory/contextBuilder.js";

export const analyzeTrajectory = async (contextOrPatientId) => {
  const context =
    typeof contextOrPatientId === "object"
      ? contextOrPatientId
      : await buildPatientContext(contextOrPatientId);

  return analyzeTrajectoryWithAI(context);
};
