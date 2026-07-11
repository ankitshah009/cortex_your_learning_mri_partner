# One-Day Execution Plan

## 1. Operating principle

Build a complete vertical slice before adding polish. At every checkpoint, the product should be closer to a demoable Observe → Map → Detect → Hypothesize → Probe → Prescribe loop.

The event schedule lists build time beginning in the late morning and demos at 5:00 PM. Treat 4:15 PM as the real feature freeze so there is time to deploy, submit, and rehearse.

## 2. Team roles

### Builder A: Product/frontend

- owns page structure and interaction states;
- builds reasoning graph and diagnosis UI;
- integrates API responses;
- owns demo choreography and visual polish.

### Builder B: Backend/AI

- configures Butterbase and submission path;
- builds problem config and APIs;
- writes prompts and validators;
- owns persistence, deployment, and fallback mode.

### Solo-builder adaptation

Work in the same order but use simple CSS cards instead of React Flow until both endpoints work. Avoid voice and the second problem.

## 3. Hour-by-hour plan

### 10:30–11:00 — Scope lock and infrastructure

Deliverables:

- repository created;
- Butterbase MCP connected;
- application created;
- one test write succeeds;
- frontend shell deployed;
- model key configured;
- demo problem and expected output agreed.

Decision gate: If Butterbase setup is blocked for more than 15 minutes, one person continues setup while the other builds against local fixtures.

### 11:00–12:00 — Static vertical slice

Frontend:

- problem card;
- reasoning input;
- static reasoning trace using `golden-diagnostic.json`;
- diagnosis card;
- probe input;
- intervention card.

Backend:

- problem configuration;
- JSON schema/Zod types;
- API stubs returning golden fixtures;
- Butterbase session entity.

Checkpoint: The entire demo can be clicked through with fixture data.

### 12:00–1:00 — Real diagnosis endpoint

- implement model client;
- add diagnostic prompt;
- validate output;
- normalize nodes and first divergence;
- save session;
- connect live endpoint to UI;
- add one retry and fallback.

Checkpoint: The supplied student response produces a valid graph at least three times in a row.

### 1:00–1:45 — Probe verification endpoint

- create verification prompt;
- define confirm/weaken/reject criteria;
- return updated status and intervention;
- persist probe response;
- connect UI.

Checkpoint: Two different probe answers visibly produce at least two update states.

### 1:45–2:45 — Make the magic moment obvious

- improve node layout;
- animate supported nodes before divergence;
- add evidence linking;
- show hypothesis confidence and caveat;
- implement two-scenario corrective visual;
- keep all content above the fold where possible.

Checkpoint: A new observer can identify the first divergence in under five seconds.

### 2:45–3:30 — Reliability and deployment

- test public URL;
- add loading and error states;
- add fixture mode environment flag;
- test rate-limit behavior;
- verify Butterbase records;
- run the full flow on a second laptop/browser;
- complete submission metadata draft.

Checkpoint: Five consecutive full demo runs succeed, including one forced fallback run.

### 3:30–4:00 — Pitch and judge framing

- rehearse the 90-second demo;
- trim copy and latency pauses;
- prepare one sentence for problem, insight, technology, and vision;
- capture backup screenshots or a short screen recording;
- confirm partner integration is visible and explainable.

### 4:00–4:15 — Feature freeze

No new features. Fix only issues that block the demo.

- final production deploy;
- submit through Butterbase MCP;
- open all required tabs;
- prefill the learner response;
- verify audio, zoom, and internet;
- save backup local route or fixture mode.

### 4:15–5:00 — Rehearsal and buffer

- run the demo repeatedly;
- test one unexpected learner input;
- decide who speaks at each step;
- verify the final submission;
- avoid last-minute dependency upgrades.

## 4. Critical path

```text
Butterbase setup
  → schema and problem config
  → static complete UI
  → live diagnosis
  → live probe verification
  → persistence
  → deployment
  → submission
  → rehearsal
```

## 5. Parallel work plan

| Time | Builder A | Builder B |
|---|---|---|
| Setup | UI shell and design tokens | Butterbase, model, schema |
| Static slice | All cards and graph | Fixtures, APIs, problem config |
| Live diagnosis | Loading/error integration | Prompt, model, validator |
| Verification | Update UI and visual | Verify endpoint and persistence |
| Polish | Animation and visual | Reliability and deployment |
| Final | Demo and pitch | Submission and backup |

## 6. Stop conditions

Stop adding features when any condition is true:

- the core flow is not stable by 2:30 PM;
- public deployment has not succeeded by 3:00 PM;
- Butterbase submission has not been tested by 3:30 PM;
- the team cannot run the demo five times consecutively;
- the live model output is inconsistent with the core diagnosis.

At that point, switch to reliability work and fixtures.

## 7. Final deliverables

- public application URL;
- source repository;
- Butterbase-backed session record;
- submitted project entry;
- 90-second live demo;
- three-minute extended explanation if judges ask;
- fallback fixture and backup recording;
- concise README describing architecture and sponsor use.
