export const eventExtractionPrompt = (event) => `
Extract structured longitudinal observations from this
patient event. Do not invent information.

Return:
- symptoms
- vitals
- medication adherence
- severity
- riskScore
- trajectorySignal
- concise notes

EVENT:
${JSON.stringify(event, null, 2)}
`;
