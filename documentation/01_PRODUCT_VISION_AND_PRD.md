# Product Vision and PRD

## 1. Product identity

**Product:** Cortex  
**Primary tagline:** See where understanding breaks.  
**Secondary line:** Cortex traces a learner's reasoning, tests its diagnosis, and finds the smallest intervention that unlocks progress.

## 2. Product thesis

Most learning systems judge the final answer. Many AI tutors respond to an incorrect answer by immediately explaining the solution. That approach can produce a correct explanation without discovering why the learner was confused.

Cortex changes the sequence:

> Observe reasoning → reconstruct it → locate the first divergence → hypothesize the misconception → probe it → prescribe the smallest fix.

The product is not merely an answer checker. It is a diagnostic layer that creates evidence about how a learner is reasoning.

## 3. Problem statement

A wrong answer does not reveal the root cause of misunderstanding. Two learners can produce the same incorrect answer through different reasoning paths and need different interventions. Teachers can diagnose this by listening, asking targeted questions, and adjusting instruction. Current automated tools often skip that diagnostic work.

This creates three problems:

- learners receive explanations that do not address their actual misconception;
- teachers see scores but not the reasoning failure that produced them;
- adaptive systems personalize content based on correctness rather than understanding.

## 4. Target user

### One-day MVP user

A learner working through a conceptual math problem who can type a short explanation of their reasoning.

### Secondary viewer

A teacher, judge, or parent who wants to understand the learner's reasoning path and the evidence behind the diagnosis.

### Long-term platform customer

Education products that need a diagnostic API beneath tutoring, assessment, coding practice, or courseware experiences.

## 5. Jobs to be done

### Learner

- Help me understand exactly where my reasoning changed direction.
- Do not reteach everything I already understand.
- Ask me a question that helps prove what I do or do not understand.
- Give me one manageable next step.

### Educator

- Show me the misconception behind the error, not only the error itself.
- Show the evidence and confidence behind the diagnosis.
- Reveal patterns across learners without requiring me to review every response manually.

### Platform

- Convert an open-ended learner explanation into structured diagnostic data.
- Return a verified misconception and an intervention that another product can display.

## 6. Core product loop

### Observe

The learner receives a problem and submits an answer plus reasoning. Typed text is required for the MVP. Voice is optional and must feed the same text pipeline after transcription.

### Map

Cortex decomposes the response into ordered nodes:

- claims;
- calculations or operations;
- assumptions;
- conclusions;
- dependencies;
- confidence or uncertainty markers.

### Detect

Cortex compares the reasoning graph against a problem-specific rubric and identifies the earliest unsupported or invalid transition.

### Hypothesize

Cortex proposes a concise misconception hypothesis. The UI must label it as likely or provisional, never as certain knowledge about the learner.

### Probe

Cortex asks one question whose answer differentiates the proposed misconception from plausible alternatives.

### Prescribe

After the probe, Cortex updates the diagnosis and provides:

- a short explanation;
- a simple visual or counterexample;
- one transfer problem;
- an immediate retest criterion.

## 7. Demo problem

### Prompt

> A car travels 120 miles in two hours. What was its speed exactly one hour into the trip? Explain your reasoning.

### Demonstration response

> The car traveled 120 miles in two hours, so its speed was 60 mph. Therefore, after one hour, it was moving at 60 mph.

### Expected analysis

The learner correctly calculates average speed. The first divergence occurs when the learner applies the average to a particular moment without evidence that the car traveled at constant speed.

### Misconception hypothesis

> The learner may be treating average speed over an interval as equivalent to instantaneous speed at every moment in that interval.

### Adaptive probe

> Suppose the car was stopped for the first hour and traveled all 120 miles during the second hour. Would its average speed over the two hours still be 60 mph? What would its speed be exactly at the one-hour mark?

### Minimal intervention

Average speed describes the whole interval. Instantaneous speed describes one moment. Without information about how speed changed, the exact speed after one hour cannot be determined.

## 8. Product requirements

### Functional requirements

- Display a curated conceptual problem.
- Capture answer and reasoning in one text input.
- Produce structured reasoning nodes and edges.
- Mark each node as supported, uncertain, divergent, or downstream.
- Identify exactly one first-divergence node for the MVP.
- Present a concise misconception hypothesis, confidence, and evidence.
- Ask one adaptive probe.
- Accept the learner's probe response.
- Update diagnosis status to confirmed, weakened, rejected, or replaced.
- Generate a short intervention and transfer problem.
- Save the session through Butterbase.

### Quality requirements

- Initial diagnostic result appears within eight seconds under normal conditions.
- Every diagnosis references at least one reasoning node.
- AI output must pass schema validation before rendering.
- The interface must never claim certainty about an internal belief.
- The graph must remain readable at laptop presentation size.
- The golden demo path must work even if the external model is unavailable.

## 9. Product success metrics

### Hackathon success

- A judge understands the product difference in under 30 seconds.
- The complete Observe-to-Prescribe loop runs in under two minutes.
- The first divergence is visually obvious without explanation.
- The probe changes or confirms the diagnosis on screen.
- The system demonstrates a mandatory partner integration and completes Butterbase submission.

### Early product metrics

- First-divergence agreement with an expert-labeled dataset.
- Misconception confirmation rate after one probe.
- Reduction in instructional content compared with generic tutoring.
- Transfer-problem improvement after intervention.
- Teacher-rated usefulness and diagnostic clarity.

## 10. Product positioning

Cortex is not another chatbot and not a complete learning management system. Its wedge is diagnostic intelligence.

A useful positioning statement is:

> For learning platforms that personalize instruction, Cortex is a reasoning-diagnostic engine that identifies and verifies the learner's first misconception, unlike answer graders and generic AI tutors that respond only to the final answer.

## 11. Ethical and trust boundaries

- A diagnosis is evidence-based and provisional.
- Confidence is model confidence, not a psychological measurement.
- Do not infer intelligence, ability, disability, motivation, or personality.
- Do not use punitive language.
- Let learners inspect the evidence and revise their reasoning.
- Preserve only the minimum session data needed for the demo.
