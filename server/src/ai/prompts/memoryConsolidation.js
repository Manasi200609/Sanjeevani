export const memoryConsolidationPrompt = ({
  events = [],
  decisions = [],
}) => `
Summarize the patient's longitudinal history using only the
supplied events and care decisions.

Identify:
- recurring or worsening symptoms
- medication adherence patterns
- risk trend
- important care decisions
- meaningful follow-up changes

Do not diagnose and do not invent facts.

EVENTS:
${JSON.stringify(events, null, 2)}

DECISIONS:
${JSON.stringify(decisions, null, 2)}
`;
