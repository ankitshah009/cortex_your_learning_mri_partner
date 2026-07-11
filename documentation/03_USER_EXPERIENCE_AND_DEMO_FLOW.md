# User Experience and Demo Flow

## 1. UX goal

The experience should make one thing immediately visible: the learner did not misunderstand everything. Cortex preserves the correct portion of the reasoning and isolates the exact transition that needs attention.

## 2. Recommended screen structure

Use a single-page desktop experience with progressive stages rather than many routes. This reduces implementation risk and lets judges understand the complete loop at a glance.

### Header

- Cortex logo and tagline.
- Small stage indicator: Reason → Diagnose → Verify → Learn.
- Reset demo action.

### Left column: learner workspace

- Problem card.
- Student reasoning text area.
- Submit/analyze button.
- After submission, the text remains visible and becomes read-only.

### Center column: reasoning trace

- Vertical or left-to-right graph.
- Nodes reveal in order.
- Supported nodes use a success state.
- The first divergence uses a high-contrast warning state.
- Downstream nodes use a muted warning state.
- The graph should use 4–6 nodes; more will reduce clarity.

### Right column: diagnosis

- “Likely misconception” label.
- One-sentence hypothesis.
- Confidence bar.
- Evidence bullets tied to node labels.
- A visible “Hypothesis—not a final judgment” note.

### Bottom area: probe and prescription

Before the probe answer, show the adaptive question and input. After submission, replace or expand the area with updated status, the short lesson, the visual example, and a transfer problem.

## 3. Interaction stages

### Stage A: Reason

Initial state:

- Problem visible.
- Example reasoning can be prefilled for a reliable live demo, with an option to clear it.
- Main CTA: “Trace my reasoning.”

Desired feeling: familiar and low friction.

### Stage B: Diagnose

After submit:

1. Show a brief status sequence: “Extracting claims,” “Mapping dependencies,” “Checking the earliest divergence.”
2. Reveal supported nodes first.
3. Reveal the divergence node last with a short pulse.
4. Slide in diagnosis and evidence.

Desired feeling: Cortex is inspecting the reasoning, not merely grading the result.

### Stage C: Verify

Present one probe with a single text input.

The probe should feel like a teacher asking a purposeful follow-up, not a second unrelated quiz. Add a small label such as “Why Cortex is asking this” with one sentence: “This scenario separates average speed from speed at a specific moment.”

Desired feeling: the system is testing itself as well as the learner.

### Stage D: Learn

After the probe answer:

- Show diagnosis state: Confirmed, Weakened, Rejected, or Replaced.
- Explain what changed based on the response.
- Reveal a concise lesson.
- Show one simple visual counterexample.
- Present one transfer question.

Desired feeling: the intervention is precise because the diagnosis was verified.

## 4. Visual language

### Node states

| State | Meaning | Suggested treatment |
|---|---|---|
| Supported | Valid step supported by the problem or previous nodes | Check icon, calm border |
| Uncertain | Ambiguous or insufficiently explained | Question icon, neutral border |
| First divergence | Earliest invalid or unsupported inference | Warning icon, strongest highlight |
| Downstream | Depends on the divergence | Muted warning treatment |

Do not rely on color alone. Use icons, labels, and border patterns.

### Confidence

Display confidence as a broad cue, for example 82%, but include copy such as:

> Confidence reflects the evidence in this response, not certainty about the learner.

### Graph choice

Use React Flow, Cytoscape.js, or simple CSS cards connected by lines. A 3D brain graph is not recommended for the one-day MVP because it adds rendering and interaction risk without improving the diagnostic story.

The brain visual can remain a brand motif in the hero or loading state.

## 5. Simple corrective visual

For the speed example, use a two-row timeline rather than a custom simulation:

- Scenario A: constant 60 mph for both hours.
- Scenario B: 0 mph for hour one, then enough speed to cover 120 miles in hour two.

Both scenarios have the same average over two hours, but different speeds at the one-hour mark. This visual makes the misconception obvious in seconds.

## 6. Copy deck

### Hero

**See where understanding breaks.**  
Cortex traces your reasoning, tests its diagnosis, and finds the smallest next step.

### Analysis states

- Reconstructing your reasoning…
- Checking which steps are supported…
- Locating the first divergence…
- Forming a hypothesis to test…

### Diagnosis labels

- First point of divergence
- Likely misconception
- Evidence from your reasoning
- Confidence in this hypothesis

### Probe labels

- One question to test the diagnosis
- Why Cortex is asking this
- Update diagnosis

### Intervention labels

- What your answer confirmed
- The missing distinction
- Three-minute lesson
- Try one transfer problem

## 7. Live demo choreography

1. Start on the completed problem input.
2. Read the student's reasoning aloud.
3. Click “Trace my reasoning.”
4. Point out that the average calculation is preserved as correct.
5. Pause when the divergence node appears.
6. Read the misconception hypothesis and evidence.
7. Answer the adaptive probe.
8. Show the diagnosis becoming confirmed.
9. Reveal the minimal lesson and transfer task.
10. End on the statement: “Cortex does not ask what content to show next. It asks what misunderstanding to fix next.”

## 8. Accessibility and presentation constraints

- Use a minimum 16 px body font for projected screens.
- Ensure the divergent node can be identified without color.
- Keep diagnosis text to two short paragraphs maximum.
- Avoid scrolling during the first 60 seconds of the demo.
- Provide keyboard submission for both learner inputs.
- Keep the main demo functional at 1280×720.
