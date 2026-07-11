# Demo Script and Pitch

## 1. Core narrative

Most AI tutors answer too early. Cortex diagnoses first.

The demo should show that Cortex preserves the learner's correct reasoning, locates the first invalid inference, tests its own hypothesis, and teaches only the missing distinction.

## 2. 20-second opener

> Most learning tools evaluate the final answer. If a learner is wrong, an AI tutor explains the solution. But two students can reach the same wrong answer for completely different reasons. Cortex traces the learner's reasoning, finds the first place understanding breaks, tests that diagnosis with one adaptive question, and gives the smallest next step.

## 3. 90-second live demo

### 0–15 seconds: Set up the problem

> Here is a simple question: a car travels 120 miles in two hours. What was its speed exactly one hour into the trip? Our learner says, “120 divided by two is 60, so after one hour it was moving at 60 miles per hour.”

Click **Trace my reasoning**.

### 15–35 seconds: Reveal the reasoning graph

> Cortex reconstructs the argument instead of grading only the last sentence. The calculation of the two-hour average is correct. Cortex preserves that. The reasoning breaks at the next step, where the learner applies the interval average to one exact moment.

Point to the highlighted first-divergence node.

### 35–55 seconds: Show the hypothesis

> Cortex forms a testable hypothesis: the learner may be treating average speed as instantaneous speed. It also shows the exact evidence and keeps the conclusion provisional.

Point to confidence and evidence.

### 55–75 seconds: Verify

> Rather than teaching immediately, Cortex asks one question designed to test the diagnosis.

Submit the prepared probe answer:

> “The average would still be 60 mph, but the speed after one hour would not have to be 60 mph.”

### 75–90 seconds: Prescribe

> The answer confirms the missing distinction. Cortex now gives a three-minute explanation, one visual counterexample, and one transfer problem—nothing the learner does not need.

End with:

> Other products ask, “What should we teach next?” Cortex asks, “What misunderstanding should we fix next?”

## 4. Three-minute pitch structure

### Problem

Final answers hide the reasoning path. Generic explanations often reteach concepts the learner already understands.

### Insight

Expert teachers diagnose before teaching. A well-designed probe creates evidence that can verify a misconception rather than merely guessing it.

### Product

Cortex converts reasoning into a graph, identifies the first divergence, proposes a hypothesis, probes it, and prescribes the smallest intervention.

### Technology

- curated problem rubric;
- structured LLM reasoning analysis;
- deterministic schema validation;
- evidence-linked graph;
- second model call for hypothesis verification;
- Butterbase-backed session persistence and submission.

### Why now

Language models can interpret open-ended explanations, but the product value comes from the pedagogical workflow and trust layer—not merely model capability.

### Vision

Cortex can become the diagnostic API beneath tutoring platforms, courses, coding tools, and classroom systems. Instead of personalizing only by right or wrong, those systems can personalize by verified misconception.

## 5. Judge questions and answers

### “Is this just prompting an LLM?”

> The model extracts and evaluates reasoning, but the product is the diagnostic protocol: problem-specific rubric, structured evidence graph, earliest-divergence logic, a discriminating probe, diagnosis update, and minimum intervention. We validate every output and tie every diagnosis to evidence.

### “How is this different from ChatGPT asking follow-up questions?”

> ChatGPT can ask follow-ups, but Cortex makes diagnosis the primary structured output. It identifies a specific first divergence, exposes evidence and confidence, and asks a probe designed to confirm or falsify one hypothesis before teaching.

### “Can it work for any subject?”

> The architecture is general, but today's proof is intentionally narrow. Reliability comes from subject-specific problem rubrics and misconception libraries. We would expand domain by domain and evaluate against expert labels.

### “What happens when the model is wrong?”

> The diagnosis is clearly provisional, the learner can inspect the evidence, and the probe gives the system a chance to reject or replace its hypothesis. Production use would include educator review and calibrated evaluation.

### “Why use Butterbase?”

> Butterbase provides the backend and persistence layer for diagnostic sessions and supports the event's required submission workflow. It lets us focus the build time on the learning interaction instead of backend configuration.

### “Where does memory fit?”

> A memory layer could track verified misconceptions and mastered concepts across sessions. We intentionally kept it optional today because the core value must first be demonstrated within one interaction.

## 6. Presentation details

- Prefill all responses before the demo.
- Keep fixture fallback ready but start with the live model.
- Never type long text on stage.
- Avoid saying “we read the learner's mind.” Say “we form and test a hypothesis from their expressed reasoning.”
- Do not spend demo time on login, settings, or backend tables.
- Mention the partner integration once in the pitch and be ready to show the stored session if asked.
