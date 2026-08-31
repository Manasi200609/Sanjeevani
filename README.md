# Sanjeevani (संजीवनी)
** Demo Link : [https://sanjeevani-murex.vercel.app/]

### **Life-giving care, revived by attention.**

> Healthcare's real shortage isn't information. It's attention. **Sanjeevani gives it back.**

In the old stories, *Sanjeevani* was the herb that revived the dying.

Sanjeevani is built around the same idea: **notice the decline before it becomes the crisis.**

---

## The Problem

An ASHA worker in rural India isn't managing one patient at a time.

She's managing **dozens of ongoing patient trajectories** — symptoms changing, medicines being missed, follow-ups becoming overdue, and risk signals accumulating over days or weeks.

Most digital health systems solve only the information problem:

**Record → Store → Display**

They tell the ASHA worker what happened.

They don't continuously reason about **what should happen next**.

Sanjeevani approaches the problem differently.

> **Given everything that has happened to this patient, what needs attention right now — and why?**

That requires an agent that can remember, reason, use tools, make decisions, respect human boundaries, and continue operating as new events arrive.

---

# What is Sanjeevani?

**Sanjeevani is a Google-powered autonomous longitudinal care-coordination agent for ASHA workers.**

It continuously reasons over patient trajectories rather than isolated interactions.

Its core agent loop is:

**Observe → Remember → Analyze → Assess → Decide → Replan → Act → Remember**

The agent doesn't simply generate a response.

It **changes the care plan based on accumulated evidence.**

### 1. Observe

A new health event arrives from the patient through **Vaidya**, our multilingual patient interface.

This may contain:

* Symptoms
* Vitals
* Medication adherence
* Severity
* Patient-reported changes
* Timestamped observations

---

### 2. Remember

Sanjeevani retrieves the patient's relevant longitudinal context from **MongoDB**.

The agent can access:

* Previous health events
* Patient history
* Clinical evidence
* Previous care decisions
* Follow-up history
* Existing care plan
* Previous agent runs
* Stored memories

The current event is therefore never evaluated completely in isolation.

---

### 3. Analyze — Gemini

**Gemini 3.7 Flash** analyzes the current event together with the retrieved longitudinal context.

Rather than asking:

> "What does this symptom mean?"

Sanjeevani asks:

> **"What has changed in this patient's trajectory, and does that change what the ASHA worker should do next?"**

This distinction is central to the system.

---

### 4. Assess

The agent converts the reasoning into structured signals:

* Risk level
* Trajectory
* Priority
* Key signals
* Follow-up requirement
* Recommended action

---

### 5. Decide

The agent operates within explicit care-protocol boundaries:

```text
MAINTAIN
   ↓
INCREASE
   ↓
URGENT
   ↓
ESCALATE
```

The system is designed to avoid unnecessary escalation.

A stable patient should remain stable.

A deteriorating patient should become more visible.

---

### 6. Human Boundary

Sanjeevani is **human-bounded by design**.

When a case crosses a configured human-decision boundary, the agent does not attempt to resolve the situation autonomously.

It pauses.

The ASHA worker reviews the case.

Only after human input can the workflow continue.

> **The agent handles coordination and prioritization.
> Human workers retain high-stakes clinical judgment.**

---

### 7. Replan & Act

Once a decision is made, Sanjeevani can update the patient's care plan.

For example:

```text
Previous follow-up: 7 days

        ↓
New deterioration detected

        ↓

New follow-up: 2 days
Priority: HIGH
Action: ASHA REVIEW
```

The important part is that the agent doesn't merely *recommend* a different interval.

It can **replan the longitudinal care workflow**.

---

### 8. Remember Again

The outcome of the agent run is persisted.

This creates a continuous loop:

```text
Patient event
      ↓
Agent reasoning
      ↓
Care decision
      ↓
ASHA action
      ↓
Outcome
      ↓
Longitudinal memory
      ↓
Next agent run
```

Every run therefore becomes part of the patient's future context.

---

# The Google Agentic Architecture

Sanjeevani is designed around Google's agent and cloud ecosystem.

```text
                         PATIENT
                            │
                            ▼
                  ┌──────────────────┐
                  │      Vaidya      │
                  │ Multilingual UI  │
                  └────────┬─────────┘
                           │
                    Sarvam AI
                  Voice → Text
                  Translation
                           │
                           ▼
                STRUCTURED HEALTH EVENT
                           │
                           ▼
              ┌────────────────────────┐
              │    GOOGLE CLOUD        │
              │                        │
              │  Pub/Sub / Eventarc    │
              │          │             │
              │          ▼             │
              │     Cloud Run          │
              │          │             │
              │          ▼             │
              │   Google ADK Agent     │
              │          │             │
              │          ▼             │
              │     Gemini 3.7 Flash   │
              │          │             │
              └──────────┼─────────────┘
                         │
                         ▼
                 LONGITUDINAL MEMORY
                      MongoDB
                         │
                         ▼
                  CARE PLAN / DECISION
                         │
                         ▼
                  ASHA DASHBOARD
                         │
                         ▼
                   HUMAN REVIEW
                         │
                         ▼
                    OUTCOME
                         │
                         └──────► MEMORY
```

Google Cloud provides the **agent execution, event-driven infrastructure, deployment and operational layer**, while MongoDB provides the application's longitudinal patient data layer.

---

# Why Google ADK?

Sanjeevani is not implemented as a fixed chain of API calls.

The agent has access to tools for retrieving and acting on patient information.

Through **Google's Agent Development Kit (ADK)**, the system can be structured as an agent capable of reasoning through multi-step workflows and using tools rather than following a completely hard-coded sequence. Google's ADK is explicitly designed for building, evaluating and deploying agents.

Conceptually:

```text
                 ┌──────────────────┐
                 │  Sanjeevani      │
                 │      Agent       │
                 └────────┬─────────┘
                          │
             ┌────────────┼────────────┐
             │            │            │
             ▼            ▼            ▼
       Patient        Timeline      Memory
        Context        Tool          Tool
             │            │            │
             └────────────┼────────────┘
                          │
                          ▼
                     Trajectory
                       Tool
                          │
                          ▼
                    Care Planner
                          │
                          ▼
                     ASHA Action
```

This means the reasoning layer can decide **which information it needs before making a care-coordination decision**.

---

# Event-Driven Agent Execution

Sanjeevani is designed to move beyond a request/response chatbot architecture.

A patient event can become an asynchronous trigger:

```text
New health event
      ↓
Google Cloud Pub/Sub
      ↓
Eventarc
      ↓
Cloud Run
      ↓
Sanjeevani Agent
      ↓
Gemini reasoning
      ↓
Care decision
      ↓
ASHA dashboard
```

Google Cloud supports Pub/Sub events being routed to Cloud Run through Eventarc, making this architecture suitable for event-driven agent workflows.

This matters because longitudinal care doesn't happen only when someone opens an application.

**The system should be able to react when the patient's state changes.**

---

# Google Cloud Infrastructure

Sanjeevani uses Google Cloud as its production execution layer.

### ☁️ Cloud Run

Hosts the production Sanjeevani backend and agent services.

The containerized application can scale without managing servers directly.

Google specifically documents Cloud Run as a deployment environment for AI agents and supports service, worker-pool and job patterns for different agent workloads.

### 🧠 Gemini

Provides the reasoning engine for:

* Longitudinal trajectory analysis
* Risk assessment
* Prioritization
* Care-plan reasoning
* Decision generation

**Model: Gemini 3.7 Flash**

Google's current model documentation lists Gemini 3.7 Flash as an August 2026 model with no announced shutdown date.

### 🤖 Google ADK

Provides the agent-development and orchestration layer.

### 🔄 Pub/Sub

Provides asynchronous event delivery between healthcare events and agent execution.

### ⚡ Eventarc

Connects cloud events to the Sanjeevani Cloud Run service.

### 🔐 Secret Manager

Production secrets such as API credentials should be kept outside application code and managed through Google Cloud's secret-management infrastructure. Google documents Secret Manager as a supported way for Cloud Run services to access secrets and configuration.

### 📊 Cloud Logging / Monitoring

Provides operational visibility into production agent execution, errors and service health.

---

# Patient Layer — Vaidya

The patient doesn't need to understand medical terminology.

They simply speak or type in their preferred language.

```text
Patient
   │
   ▼
Vaidya
   │
   ├── Voice
   ├── Text
   └── Language selection
   │
   ▼
Sarvam AI
   │
   ├── Speech → Text
   ├── Translation
   └── Text → Speech
   │
   ▼
Structured Health Event
   │
   ▼
Sanjeevani Agent
```

Vaidya is therefore the **accessibility layer**.

Sanjeevani is the **reasoning and coordination layer**.

The two work together without making multilingual interaction the core innovation.

---

# The Core Innovation: Longitudinal Attention

The most important capability isn't Gemini.

It isn't voice.

It isn't the dashboard.

It is **longitudinal attention**.

Consider two patients.

### Patient A

```text
Stable symptoms
No new risk signals
Medication adherence maintained
No meaningful trajectory change

              ↓

        MAINTAIN
```

### Patient B

```text
Increasing fatigue
        +
New dizziness
        +
Reduced medication adherence

              ↓

Trajectory worsening
              ↓
       Risk increases
              ↓
          ESCALATE
```

The same agent evaluates both patients.

It doesn't escalate simply because a symptom exists.

It reasons over **change across time**.

---

# Resource Allocation Under Scarcity

The real challenge for an ASHA worker isn't identifying one high-risk patient.

It's deciding **who gets attention first**.

Imagine:

```text
40 patients
     ↓
8 available visit slots
     ↓
Which 8 need attention?
```

Sanjeevani produces a prioritized care plan based on:

* Patient trajectory
* Risk signals
* Follow-up urgency
* Recent events
* Existing care plan
* Previous agent decisions

And critically, each prioritization comes with a **plain-language explanation**.

The ASHA worker doesn't have to trust a mysterious score.

She can see:

> **Why this patient moved up the queue.**

---

# Fully Replayable Agent Runs

Agentic systems can become difficult to trust when their actions are opaque.

Sanjeevani therefore persists each agent execution.

A run records:

```text
Agent Run
 ├── Patient context
 ├── Tools accessed
 ├── Tool results
 ├── Gemini analysis
 ├── Risk assessment
 ├── Care decision
 ├── Human boundary
 ├── Replanning
 └── Resulting care-plan state
```

This allows an ASHA worker or developer to **replay and inspect why the agent reached a decision**.

The goal is not simply autonomous AI.

The goal is **auditable autonomy**.

---

# Human-Bounded Autonomy

Sanjeevani is deliberately **not a diagnostic system**.

It does not attempt to replace clinicians or ASHA workers.

Instead:

```text
                    AGENT
                      │
             Can I safely proceed?
                 /          \
               YES            NO
                │              │
                ▼              ▼
             REPLAN       HUMAN REVIEW
                │              │
                ▼              ▼
              ACT         ASHA DECISION
                               │
                               ▼
                            REPLAN
```

This boundary is part of the architecture, not an afterthought.

The system is autonomous where coordination can safely be automated and deliberately human-controlled where judgment is required.

---

# Built With

### Google

`Gemini 3.7 Flash`
`Google ADK`
`Google Cloud`
`Cloud Run`
`Pub/Sub`
`Eventarc`
`Cloud Logging`
`Secret Manager`

### Backend

`Node.js`
`Express`
`MongoDB`
`Mongoose`
`JavaScript`

### Frontend

`React`
`Vite`
`CSS`
`Vercel`

### Multilingual Patient Interface

`Sarvam AI`
`Speech-to-Text`
`Text-to-Speech`
`Translation`

### Domain

`Healthcare`
`Agentic AI`
`Longitudinal Care`
`Rural Health`
`Multilingual AI`

---

# Production Deployment

```text
GitHub
   │
   ├──────────────► Vercel
   │                  │
   │                  ▼
   │            React Dashboard
   │
   └──────────────► Google Cloud
                      │
                 Cloud Build
                      │
                Artifact Registry
                      │
                  Cloud Run
                      │
               Sanjeevani API
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Gemini      Pub/Sub     MongoDB
          │           │
          │        Eventarc
          │           │
          └─────► Agent ◄────────┘
```

The frontend is deployed independently from the agent backend, while the production backend runs on Google Cloud.

---

# What We Verified

We tested the complete longitudinal reasoning loop using both deteriorating and stable patient trajectories.

### Worsening trajectory

```text
Increasing fatigue
       +
New dizziness
       +
Reduced medication adherence
       ↓
Trajectory deterioration
       ↓
Higher risk
       ↓
ESCALATE
       ↓
ASHA attention required
```

### Stable trajectory

```text
Stable symptoms
       +
No significant deterioration
       ↓
Stable trajectory
       ↓
MAINTAIN
```

The agent therefore demonstrates **differentiated decision-making rather than blanket escalation**.

---

# What's Next

The next stage is moving from simulated patient trajectories toward real-world validation.

We want to:

1. Validate prioritization and reprioritization against anonymized ASHA workflows.
2. Evaluate agent decisions against expert-reviewed cases.
3. Expand the multilingual, voice-first patient experience.
4. Strengthen production observability and evaluation.
5. Measure whether Sanjeevani actually reduces missed follow-ups and improves attention allocation.

The ultimate goal isn't to make an AI that knows more medical information.

It's to build an AI system that helps an ASHA worker **notice the right patient at the right time — and understand why.**

---

## The Sanjeevani Idea

> **Healthcare's real shortage isn't information. It's attention.**

Sanjeevani turns longitudinal patient data into **continuous, explainable, human-bounded action**.

**Observe. Remember. Reason. Prioritize. Act. Learn.**

**Life-giving care, revived by attention.**
