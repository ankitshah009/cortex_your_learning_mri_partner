# Cortex: One-Day Implementation Package

**Tagline:** See where understanding breaks.

Cortex is an AI learning diagnostic that reconstructs a learner's reasoning, identifies the first meaningful divergence, tests its diagnosis with an adaptive question, and prescribes the smallest next learning step.

This package turns the current product idea into a buildable hackathon plan. It is designed for a team of one or two builders working toward a same-day demo.

## The one-sentence build target

By demo time, a learner can submit a typed explanation for one conceptual math problem; Cortex will render the explanation as a reasoning graph, highlight the earliest flawed inference, state a misconception hypothesis with evidence, ask one adaptive probe, and return a short corrective lesson plus one transfer problem.

## Non-negotiable event constraints

The event page states that teams consist of one or two builders, a Cloud/AI partner integration is mandatory, the build period begins after the morning sessions, demos begin at 5:00 PM, and projects must be submitted through Butterbase MCP. For this package, Butterbase is the required backend and submission integration. EverMind or a sponsored model provider can be added only after the core loop works.

Event source: https://luma.com/beta-19of?tk=PkxEu0

## Product principles

1. **Diagnose before teaching.** Do not immediately generate an explanation.
2. **Find the first divergence.** The last wrong statement is often not the root misunderstanding.
3. **Treat diagnosis as a hypothesis.** The learner's response to a probe should confirm, weaken, or replace it.
4. **Prescribe the minimum intervention.** One explanation, one visual, one practice task, one retest.
5. **Show evidence.** Every diagnostic claim must point to a specific reasoning node.
6. **Make the demo deterministic.** Narrow domain, predefined rubric, structured outputs, and fallback fixtures.

## Recommended reading order

| File | Purpose |
|---|---|
| `01_PRODUCT_VISION_AND_PRD.md` | Product definition, audience, outcomes, and success criteria |
| `02_MVP_SCOPE_AND_REQUIREMENTS.md` | Exact one-day scope, user stories, acceptance criteria, and exclusions |
| `03_USER_EXPERIENCE_AND_DEMO_FLOW.md` | Screens, interactions, visual states, and judge-facing experience |
| `04_TECHNICAL_ARCHITECTURE.md` | Stack, components, request flow, deployment, and partner integration |
| `05_AI_DIAGNOSTIC_ENGINE.md` | Reasoning extraction, divergence detection, probe generation, and intervention logic |
| `06_DATA_MODEL_AND_API_CONTRACTS.md` | Entities, JSON formats, endpoints, validation, and state transitions |
| `07_ONE_DAY_EXECUTION_PLAN.md` | Hour-by-hour ownership and critical path |
| `08_PROMPT_LIBRARY.md` | Production-ready prompt templates and safety constraints |
| `09_DEMO_SCRIPT_AND_PITCH.md` | Live demo choreography, narration, and concise pitch |
| `10_TEST_PLAN_RISKS_AND_FALLBACKS.md` | Test matrix, failure modes, mitigations, and demo insurance |
| `11_POST_HACKATHON_ROADMAP.md` | Product evolution after the one-day proof |
| `12_BUILD_CHECKLIST.md` | A compact implementation checklist for the team |

## Included implementation aids

- `schemas/diagnostic-output.schema.json`: JSON Schema for the main AI response.
- `examples/problem-config.json`: curated problem, rubric, and known misconception.
- `examples/golden-diagnostic.json`: expected output for the demo response.
- `examples/api-examples.md`: concrete request and response examples.
- `assets/cortex-concept.jpeg`: current product visual supplied by the team.
- `source-material/`: copies of the original planning notes.

## Final definition of done

A successful demo does all of the following without manual intervention:

- accepts a typed student explanation;
- displays at least three ordered reasoning nodes;
- visually distinguishes correct reasoning from the first divergence;
- states one misconception hypothesis and evidence;
- asks a probe that can confirm or falsify the hypothesis;
- updates the diagnosis after the learner answers;
- provides a three-minute-or-less learning intervention;
- presents one transfer question;
- persists or submits the session through Butterbase;
- can recover using a seeded demo fixture if an AI call fails.
