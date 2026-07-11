# Post-Hackathon Roadmap

## 1. Product direction

The one-day MVP proves a diagnostic interaction. The next product question is whether verified misconception data improves learning outcomes and teacher decisions better than answer-level tutoring alone.

## 2. Phase 1: Reliable domain module

Build a production-quality module for one topic such as rates and functions.

- 20–50 curated problems;
- expert-authored rubrics;
- misconception taxonomy;
- labeled learner explanations;
- first-divergence evaluation;
- probe-quality evaluation;
- teacher review workflow;
- calibrated confidence.

Success signal: experts agree with the first divergence and misconception on a strong majority of representative responses.

## 3. Phase 2: Learner model and memory

Track only verified learning evidence:

- mastered concepts;
- recurring misconceptions;
- probe outcomes;
- transfer performance;
- intervention effectiveness.

An optional memory layer such as EverMind can store compact, inspectable learning events. The system should distinguish between unverified hypotheses and confirmed evidence.

## 4. Phase 3: Educator product

- class misconception clusters;
- evidence samples;
- lesson-level alerts;
- suggested small-group interventions;
- teacher approval and correction;
- export to existing learning systems.

The teacher view should answer: “Where is understanding breaking across this class?”

## 5. Phase 4: Diagnostic API

Expose Cortex as a platform service:

```text
POST /diagnose
POST /probe
POST /verify
GET /learner/concept-state
GET /class/misconception-clusters
```

Potential customers include AI tutors, course platforms, coding interview tools, assessment systems, and learning management systems.

## 6. Domain expansion strategy

Expand only where the team can provide:

- a clear reasoning rubric;
- recurring misconception patterns;
- meaningful probe questions;
- measurable transfer outcomes.

Good early domains:

- conceptual algebra and calculus;
- introductory physics;
- programming and debugging;
- logic and argumentation;
- scientific reasoning.

Avoid claiming general diagnostic accuracy before domain-specific evaluation.

## 7. Defensibility

The moat is not the graph visualization or a single prompt. It can emerge from:

- expert-labeled reasoning traces;
- misconception taxonomies;
- high-information probe policies;
- intervention-effectiveness data;
- teacher corrections;
- domain-specific evaluation infrastructure;
- integrations that make Cortex the diagnostic layer beneath learning products.

## 8. Business hypotheses

### B2B API

Education products pay per diagnostic interaction or active learner.

### Teacher/copilot product

Schools or tutoring organizations pay for class-level diagnostic insight and targeted intervention workflows.

### Direct learner product

Learners use Cortex during problem-solving, with a free diagnostic tier and paid longitudinal learning support.

The hackathon demo should imply these possibilities without attempting to validate all of them.

## 9. Research questions

- How accurately can the system identify the earliest divergence?
- Does one targeted probe improve diagnostic precision?
- Does a minimal intervention improve transfer more than a full explanation?
- How should confidence be calibrated and communicated?
- When should the system defer to an educator?
- How much learner history improves diagnosis without anchoring bias?

## 10. Next seven days after the hackathon

1. Preserve all demo inputs and outputs.
2. Ask 3–5 educators to label the same reasoning traces.
3. Compare Cortex against a generic tutor baseline.
4. Create ten paraphrased responses for the demo problem.
5. Measure first-divergence consistency.
6. Interview learners about whether the diagnosis felt accurate and respectful.
7. Decide whether to deepen the math module or test programming/debugging next.
