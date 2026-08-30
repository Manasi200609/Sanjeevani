# CareFlow — Architecture Document

## Problem

ASHA workers in rural India monitor dozens of patients with chronic conditions. They cannot manually track longitudinal changes across multiple visits — symptom trajectories, medication adherence patterns, and risk escalations are easy to miss.

**CareFlow** is an autonomous longitudinal care coordination agent that continuously monitors patient health trajectories, reasons over longitudinal data using Gemini, detects meaningful changes, and autonomously adjusts care plans when warranted.

---

## Architecture Overview

```
                    PATIENT
                       │
                       ▼
                  VAIDYA CHAT
                  (Gemini)
                       │
                  PatientEvent
                       │
              ┌────────┴────────┐
              │                 │
         LOCAL MODE        PUB/SUB MODE
         (dev)             (Cloud Run)
              │                 │
              │          Pub/Sub Topic
              │                 │
              └────────┬────────┘
                       ▼
              CAREFLOW AGENT
              ┌────────┴────────┐
              │                 │
         Gemini Path        Groq Fallback
         (ADK or direct)    (development)
              │                 │
              ▼                 ▼
         9 FunctionTools   9 FunctionTools
              │                 │
              └────────┬────────┘
                       ▼
                    MongoDB
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
           CarePlan  Decision  AgentEvents
              │
              ▼
           Live Monitor
           (ASHA Worker)
```

---

## Google Technologies

### Gemini 3.7 Flash

**SDK:** `@google/generative-ai` v0.24.1
**Model:** `gemini-3.7-flash` (configurable via `GEMINI_MODEL`)

**Verified usage:**
- Agent longitudinal reasoning via function calling
- Vaidya patient chat responses
- Trajectory analysis (via aiProvider.js)

**Configuration:**
```env
GEMINI_API_KEY=your_key_here
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-3.7-flash
```

### Google Agent Development Kit (ADK)

**Package:** `@google/adk` v2.0.0
**Classes used:** `LlmAgent`, `FunctionTool`, `InMemoryRunner`

**Verified API:**
- `FunctionTool` accepts JSON Schema directly for `parameters`
- `InMemoryRunner.runEphemeral()` returns an async iterable of session events
- The ADK runner reads `GEMINI_API_KEY` from `process.env`
- The runner handles tool invocation internally (function call → FunctionTool.execute → result → model continues)

**Status:** ⚠️ CODE-READY BUT NOT LIVE VERIFIED (requires GEMINI_API_KEY)

The ADK path in `careflowAgent.js` is correctly implemented:
1. Creates `FunctionTool` instances with JSON Schema parameters
2. Creates `LlmAgent` with Gemini model + tools + instruction
3. Creates `InMemoryRunner` and calls `runEphemeral()`
4. Iterates the async generator to capture tool calls and final response

This path executes when `AI_PROVIDER=gemini` AND `GEMINI_API_KEY` is present AND the `@google/adk` import succeeds.

### Google Cloud Pub/Sub

**Package:** `@google-cloud/pubsub` v4.11.0

**Verified:**
- Abstraction layer in `pubsubService.js`
- Local mode: synchronous handler execution
- Pub/Sub mode: publishes to topics, subscribes with `@google-cloud/pubsub`
- Topics: `careflow-agent-trigger`, `careflow-patient-event`

**Status:** ⚠️ CODE-READY, local mode verified, Pub/Sub mode requires GCP credentials

### Cloud Run

**Dockerfile:** `server/Dockerfile`
**Status:** ⚠️ Deployment-ready (PORT handling, stateless design, env vars)

---

## Agent Lifecycle

### OBSERVE → REASON → PLAN → EXECUTE → COMMUNICATE

The orchestrator (`orchestrator.js`) manages the lifecycle:

1. **OBSERVE**: Deterministically builds patient context via `buildPatientContext()`
2. **REASON + PLAN + EXECUTE**: Delegates to `careflowAgent.js` — the LLM decides which tools to call
3. **COMMUNICATE**: Creates AgentEvents, completes AgentRun

The orchestrator does NOT manually determine the tool sequence. It delegates to the tool-calling agent, which lets the LLM decide.

---

## Agent Tools (9 FunctionTools)

All tools execute real MongoDB operations via Mongoose.

| Tool | Type | Description |
|------|------|-------------|
| `get_patient_context` | Read | Full longitudinal patient context |
| `get_patient_timeline` | Read | Chronological patient events |
| `get_patient_memory` | Read | Consolidated long-term memories |
| `analyze_trajectory` | Read | Deterministic risk/trajectory analysis |
| `get_active_care_plan` | Read | Current care plan |
| `get_previous_decisions` | Read | Recent care decisions |
| `create_care_decision` | **Write** | Persist the agent's decision |
| `update_care_plan` | **Write** | Update follow-up interval, priority |
| `record_patient_event` | **Write** | Record an agent-generated event |

---

## Execution Paths

### Path 1: Gemini + ADK (Primary — when GEMINI_API_KEY is set)

```
Gemini 3.7 Flash
    ↓
Google ADK LlmAgent
    ↓
FunctionTool (JSON Schema parameters)
    ↓
ADK InMemoryRunner.runEphemeral()
    ↓
Tool execution → MongoDB
    ↓
Result returned to Gemini
    ↓
Gemini decides next tool or produces final response
    ↓
AgentRun + AgentEvents persisted
```

### Path 2: Gemini Direct (Fallback — if ADK import fails)

```
Gemini 3.7 Flash
    ↓
@google/generative-ai function calling
    ↓
Manual tool loop in careflowAgent.js
    ↓
Tool execution → MongoDB
    ↓
Result sent back to Gemini
    ↓
Loop continues until final response
```

### Path 3: Groq (Development — when no Gemini key)

```
Groq LLM
    ↓
Groq function calling
    ↓
Manual tool loop in careflowAgent.js
    ↓
Tool execution → MongoDB
    ↓
Result sent back to Groq
    ↓
Loop continues until final response
```

---

## Execution Trace

Every agent run produces a trace in `AgentRun`:

```json
{
  "patientId": "...",
  "trigger": "patient_event",
  "status": "completed",
  "model": "gemini-3.7-flash",
  "framework": "google-adk",
  "steps": [
    { "step": "observe", "status": "completed", "details": { "eventsAnalyzed": 4 } },
    { "step": "reason", "status": "completed", "details": { "framework": "google-adk", "toolCalls": 7 } },
    { "step": "plan", "status": "completed", "details": { "decisionType": "increase_followup" } },
    { "step": "execute", "status": "completed", "details": { "intervalDays": 3 } },
    { "step": "communicate", "status": "completed" }
  ],
  "toolCalls": [
    { "name": "get_patient_context", "success": true },
    { "name": "get_patient_timeline", "success": true },
    { "name": "analyze_trajectory", "success": true },
    { "name": "get_active_care_plan", "success": true },
    { "name": "create_care_decision", "success": true },
    { "name": "update_care_plan", "success": true }
  ],
  "decisionId": "...",
  "executedAction": "increase_followup"
}
```

Each tool call also creates a `tool_called` AgentEvent for the Live Monitor.

---

## Live Monitor

The frontend Monitor page (`/asha`) consumes:

- `GET /api/agent/events` — all AgentEvents (signals, tool calls, reasoning, decisions)
- `GET /api/dashboard` — patient stats and attention list
- `GET /api/agent/patients/:id/runs` — agent run history with tool traces
- `GET /api/agent/runs/:runId` — full run replay with tool call details

---

## Demo System

| Endpoint | Purpose |
|----------|---------|
| `POST /api/demo/reset` | Clean all demo data |
| `POST /api/demo/seed` | Seed Savita Jadhav (CT-200) with 3 baseline events |
| `POST /api/demo/reset-and-seed` | Full reset + reseed |
| `POST /api/demo/scenario/worsening` | Create worsening event + run agent |
| `POST /api/demo/scenario/stable` | Create stable event + run agent |
| `GET /api/demo/status` | Current demo patient state |
| `GET /api/agent/runs/:runId` | Full run replay with tool trace |

---

## Environment Variables

```env
# REQUIRED for hackathon compliance
GEMINI_API_KEY=          # Gemini API key

# Required for data
MONGO_URI=               # MongoDB connection

# Configuration
GEMINI_MODEL=gemini-3.7-flash
AI_PROVIDER=gemini       # "gemini" or "groq"
AGENT_EXECUTION_MODE=local  # "local" or "pubsub"
PORT=5000
NODE_ENV=development

# Optional — Google Cloud (for pubsub mode)
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=us-central1

# Optional — Groq fallback (NOT hackathon compliant)
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
```

---

## Local Development

```bash
# Backend
cd server
cp .env.example .env   # Add GEMINI_API_KEY
npm install
npm run dev

# Frontend
cd client
npm install
npm run dev

# Run agent test
cd server
node src/tests/agentExecutionTest.js
```

## Cloud Run Deployment

```bash
cd server
docker build -t careflow-backend .
docker run -p 5000:5000 \
  -e GEMINI_API_KEY=... \
  -e MONGO_URI=... \
  -e AGENT_EXECUTION_MODE=pubsub \
  -e GOOGLE_CLOUD_PROJECT=... \
  careflow-backend
```
