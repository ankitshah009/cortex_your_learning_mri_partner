# MVP Scope and Requirements

## 1. The one-day product bet

The MVP must prove one novel interaction:

> Cortex can identify a plausible root misconception from a learner's reasoning, verify it with one adaptive question, and give a smaller, more relevant intervention than a generic tutor.

Everything else is secondary.

## 2. In scope

### Core flow

1. Show one curated conceptual math problem.
2. Accept typed reasoning.
3. Analyze reasoning using a structured AI call.
4. Render an ordered reasoning graph.
5. Highlight the first divergence.
6. Show a misconception hypothesis, evidence, and confidence.
7. Ask one adaptive probe.
8. Accept a response and update the diagnosis.
9. Show one short lesson and one transfer problem.
10. Save the session and required project metadata to Butterbase.

### Optional only after the core flow is stable

- Browser speech-to-text feeding the same text field.
- A second curated problem.
- A small teacher insight line such as “8 of 23 students show this misconception,” using clearly labeled synthetic data.
- EverMind memory to recall a prior misconception across sessions.
- A subtle animated brain illustration for branding.

## 3. Explicitly out of scope

- A general-purpose tutor for arbitrary subjects.
- Continuous screen, camera, or microphone recording.
- Proctoring.
- Handwriting recognition.
- A persistent 3D brain-shaped knowledge graph.
- A complete student knowledge model.
- Automatic curriculum generation.
- Multi-class teacher dashboards.
- Real-time classroom monitoring.
- Production authentication, payments, or school integrations.
- High-stakes assessment claims.

These features may be part of the vision but create unacceptable one-day risk.

## 4. Primary persona and scenario

**Persona:** A curious high-school or early-college learner who can calculate an average but may confuse interval-level and moment-level quantities.

**Scenario:** The learner answers a conceptual rate problem. Cortex detects that the calculation is correct but the inference is not, asks a counterexample-based probe, and teaches only the missing distinction.

## 5. User stories and acceptance criteria

### Story 1: Submit reasoning

As a learner, I can type my answer and explanation so Cortex can diagnose my reasoning.

Acceptance criteria:

- The input requires at least 20 characters.
- The submit button shows a visible analysis state.
- The original response remains visible after submission.
- An error state offers retry and demo-data fallback.

### Story 2: See reasoning reconstructed

As a learner, I can see how Cortex interpreted my reasoning.

Acceptance criteria:

- At least three ordered nodes are shown.
- Nodes include a short title and evidence excerpt.
- Arrows show dependency order.
- The graph is usable without zooming or dragging.

### Story 3: Locate the first divergence

As a learner, I can see the earliest step that is not supported.

Acceptance criteria:

- Exactly one node is labeled “First point of divergence.”
- Earlier supported nodes remain visibly distinct.
- Later nodes are labeled as downstream rather than independently wrong.
- The diagnosis references the divergent node's ID.

### Story 4: Understand the hypothesis

As a learner, I can see what Cortex thinks I may believe and why.

Acceptance criteria:

- Copy says “likely misconception” or “hypothesis.”
- Confidence is displayed as a rough indicator, not certainty.
- One or two evidence statements are shown.
- The hypothesis is one sentence and understandable to a nontechnical audience.

### Story 5: Answer an adaptive probe

As a learner, I can answer one targeted question that tests the diagnosis.

Acceptance criteria:

- The probe directly discriminates the top hypothesis from at least one alternative.
- The response is saved.
- The updated diagnosis appears within eight seconds.
- Status is one of confirmed, weakened, rejected, or replaced.

### Story 6: Receive the smallest next step

As a learner, I receive a focused intervention instead of a full solution dump.

Acceptance criteria:

- Explanation is no more than 100 words.
- It contains one counterexample or simple visual specification.
- It includes exactly one transfer problem.
- It does not reveal the transfer answer until requested.

### Story 7: Complete partner-backed submission

As a team, we can demonstrate the required partner integration and submit through Butterbase.

Acceptance criteria:

- At least one application entity is persisted using Butterbase.
- The README explains where Butterbase is used.
- Submission steps are tested before the final hour.

## 6. Prioritization

### P0: Must work

- Problem screen and text input.
- Structured diagnosis endpoint.
- Reasoning trace visualization.
- First divergence and evidence.
- Probe and update.
- Intervention.
- Butterbase save/submission.
- Golden fallback fixture.

### P1: Strong polish

- Smooth transitions between stages.
- Confidence indicator.
- Animated graph reveal.
- One simple explanatory visual.
- Session reset.

### P2: Only with spare time

- Voice input.
- Second problem.
- EverMind memory.
- Teacher aggregate card.
- Custom brain visualization.

## 7. Definition of “real AI” for the demo

The demo should not be a fully hard-coded animation, but it also should not depend on unconstrained model behavior.

The acceptable middle ground is:

- the student text is actually sent to an LLM;
- the LLM returns a structured interpretation;
- a curated problem configuration supplies the rubric and known misconception space;
- deterministic code validates, orders, and renders the result;
- a stored golden response is available only for failure recovery.

## 8. Cut rules

When behind schedule, cut in this order:

1. voice input;
2. second problem;
3. class insight card;
4. custom animation;
5. teacher view;
6. database history screen.

Never cut the probe or the updated diagnosis. They are the key product differentiation.
