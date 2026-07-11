# AI Diagnostic Engine

## 1. Engine goal

The engine should transform a learner's explanation into a small, evidence-linked hypothesis that can be tested. It should not attempt to infer a complete mental model from one response.

## 2. Input contract

The diagnostic engine receives:

- the problem prompt;
- the learner's answer and reasoning;
- the target concept;
- a canonical rubric;
- known misconception candidates;
- strict output instructions.

The engine does not receive an open web search or unrelated learner history for the MVP.

## 3. Reasoning representation

Each reasoning node contains:

- `id`: stable identifier;
- `type`: claim, operation, assumption, or conclusion;
- `text`: normalized statement;
- `evidence_excerpt`: exact or short paraphrased source from learner text;
- `depends_on`: earlier node IDs;
- `status`: supported, uncertain, first_divergence, or downstream;
- `explanation`: why the node received that status.

The graph should model the learner's reasoning as expressed, not silently replace it with the ideal solution.

## 4. Earliest-divergence algorithm

The LLM proposes the graph and node statuses. Deterministic code then enforces ordering and selects the earliest divergence.

Pseudo-logic:

```text
ordered_nodes = sort(nodes by sequence)
for node in ordered_nodes:
    if node is unsupported, invalid, or depends on an unstated critical assumption:
        first_divergence = node
        break
mark every later node that depends on it as downstream
```

The system should preserve valid earlier work. In the demo:

1. “120 miles / 2 hours” is supported.
2. “Average speed = 60 mph” is supported.
3. “Speed at exactly one hour = 60 mph” is the first divergence.

## 5. Misconception hypothesis formation

A valid hypothesis must:

- explain the first divergence;
- use cautious language;
- connect to evidence;
- be specific enough to test;
- avoid describing the learner's intelligence or identity.

Good:

> The learner may be treating average speed over an interval as the speed at every moment in that interval.

Bad:

> The learner does not understand calculus.

Bad:

> The learner is careless.

## 6. Probe generation

The probe is not just another practice question. It is an information-gathering action.

A strong probe should:

- isolate the disputed concept;
- be answerable in one or two sentences;
- distinguish the leading hypothesis from alternatives;
- avoid teaching the answer before the learner responds;
- have explicit confirmation and falsification criteria.

### Demo probe logic

Hypothesis: learner equates average and instantaneous speed.

Probe:

> Suppose the car was stopped during the first hour and traveled all 120 miles during the second hour. Would its average speed over the full two hours still be 60 mph? What would its speed be at exactly the one-hour mark?

Confirmation evidence:

- learner says the average remains 60 mph;
- learner recognizes the speed at one hour is not necessarily 60 mph;
- learner explains that the average does not determine a specific moment.

Contradictory evidence:

- learner continues to claim that average speed fixes every instantaneous speed;
- learner changes only the arithmetic without addressing the distinction.

Note: Depending on the learner's probe answer, the original diagnosis may be confirmed as a prior misconception that has now been corrected, or weakened if the original response was merely imprecise.

## 7. Diagnosis update states

### Confirmed

The answer supplies evidence that the hypothesized misconception caused the original divergence.

### Weakened

The answer shows partial understanding, suggesting the original wording may have overstated the misconception.

### Rejected

The answer shows the learner understands the distinction; another cause such as an unstated constant-speed assumption is more plausible.

### Replaced

The response supports a different misconception hypothesis. The replacement must include new evidence.

## 8. Intervention generation

The intervention should target the verified missing distinction and fit in a small card.

Required output:

- `title`;
- explanation under 100 words;
- one counterexample or visual specification;
- one transfer problem;
- one success criterion.

### Demo intervention

**Title:** Average versus instantaneous speed

**Explanation:** Average speed summarizes the full trip: total distance divided by total time. Instantaneous speed describes one specific moment. Many different speed patterns can produce the same two-hour average, so the average alone cannot tell us the exact speed after one hour.

**Visual:** Compare a constant-speed trip with a trip that is stopped for hour one and moves during hour two.

**Transfer problem:** A cyclist travels 30 miles in two hours. Can you determine the cyclist's speed exactly 30 minutes into the trip? Explain what additional information would be needed.

**Success criterion:** The learner states that an interval average does not determine a moment-level value.

## 9. Reliability strategy

### Curated misconception space

Provide the model with likely misconceptions for the chosen problem rather than asking it to invent an unlimited set. Suggested candidates:

- average speed equals instantaneous speed;
- constant speed is assumed without evidence;
- “after one hour” is confused with “during the first hour”;
- arithmetic error.

### Structured outputs

Use low temperature and strict JSON. Never render arbitrary model prose directly.

### Two-call design

- Call 1: reasoning graph, first divergence, hypothesis, and probe.
- Call 2: diagnosis update and intervention after the probe.

This preserves the key verification interaction while keeping complexity manageable.

### Optional deterministic content

The short lesson and transfer problem may be pre-authored in the problem config and selected by misconception ID. This is more reliable than generating all teaching content live. The model can still generate the diagnosis and probe.

## 10. Evaluation rubric for the hackathon

Score each generated result manually from 0–2:

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Faithfulness | Invents reasoning | Partially grounded | Fully grounded in learner text |
| Earliest divergence | Wrong step | Related but late | Correct earliest unsupported step |
| Hypothesis quality | Vague/judgmental | Plausible but broad | Specific, cautious, testable |
| Probe quality | Generic teaching | Related question | Discriminating diagnostic probe |
| Intervention | Generic solution | Partly targeted | Minimal and directly targeted |

A golden demo result should score at least 9/10.
