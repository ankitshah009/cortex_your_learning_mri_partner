# Test Plan, Risks, and Fallbacks

## 1. Testing objective

The product must be reliable enough for a live demonstration and honest enough to avoid presenting an AI hypothesis as fact.

## 2. Critical-path test matrix

| Test | Expected result | Priority |
|---|---|---|
| Known misconception response | Correct first divergence and probe | P0 |
| Correct reasoning | No false misconception; positive feedback | P0 |
| Constant-speed assumption stated | Flags unsupported assumption, not concept confusion | P0 |
| Arithmetic error | Arithmetic is first divergence | P0 |
| Empty/short input | Friendly validation error | P0 |
| Malformed model output | Retry, then fallback | P0 |
| Provider timeout | Loading ends and retry appears | P0 |
| Probe confirms hypothesis | Status becomes confirmed | P0 |
| Probe contradicts hypothesis | Status weakens/rejects/replaces | P0 |
| Public deployed URL | Full loop works on a clean browser | P0 |
| Butterbase persistence | Session record is visible | P0 |
| Small laptop viewport | Main diagnosis remains readable | P1 |
| Voice input | Transcript reaches same flow | P2 |

## 3. Demo reliability checklist

Run five consecutive end-to-end tests on the deployed URL:

1. initial page loads;
2. response submits;
3. graph renders;
4. diagnosis shows evidence;
5. probe submits;
6. intervention renders;
7. session appears in Butterbase;
8. reset works.

Also force one model failure and verify the golden fallback.

## 4. Major risks

### Risk: LLM returns inconsistent graph structure

Mitigation:

- strict schema;
- low temperature;
- curated problem config;
- post-processing invariants;
- one repair retry;
- golden fixture fallback.

### Risk: The model diagnoses the final error instead of the first divergence

Mitigation:

- explicitly define first divergence in the system prompt;
- provide canonical steps;
- test multiple variants;
- deterministically choose the earliest invalid node from proposed statuses.

### Risk: Probe merely teaches the answer

Mitigation:

- require the probe to separate hypothesis from alternatives;
- include purpose and confirm/falsify criteria;
- review the golden probe manually.

### Risk: The interface looks like another chatbot

Mitigation:

- reasoning graph is the central surface;
- diagnosis and evidence are visible before the probe;
- keep chat bubbles minimal;
- narrate the preserved correct reasoning.

### Risk: 3D visualization consumes build time

Mitigation:

- use a readable 2D graph;
- use the brain only as a static brand asset;
- add advanced visualization only after feature freeze criteria are met.

### Risk: Partner integration or submission is delayed

Mitigation:

- configure Butterbase first;
- make a test record before UI work;
- draft submission metadata early;
- complete submission before feature polish is finished.

### Risk: Internet or provider failure during judging

Mitigation:

- cache the golden response locally;
- keep a fixture-mode query parameter or environment flag;
- save a screen recording;
- keep the app usable after initial load when possible.

### Risk: Diagnosis feels invasive or overconfident

Mitigation:

- use “may” and “likely” language;
- show evidence;
- let the probe revise the hypothesis;
- avoid psychological traits;
- call it a reasoning diagnosis, not mind reading.

## 5. Fallback hierarchy

1. Retry the live model call once.
2. Use a cached response for the exact same learner input.
3. Load the golden fixture for the curated demo.
4. Play the backup recording only if the application cannot load.

The team should know which fallback is active, but the learner-facing interface does not need to expose engineering details during the demo.

## 6. Go/no-go review at feature freeze

### Go

- full flow works five times;
- first divergence is correct;
- probe update is visible;
- Butterbase record exists;
- deployed URL is stable;
- fallback is tested;
- pitch fits 90 seconds.

### No-go until fixed

- graph shows contradictory node states;
- diagnosis has no evidence;
- model can claim certainty or infer learner traits;
- probe does not influence the result;
- public deployment differs from local behavior;
- submission has not been completed.

## 7. Evaluation after the event

Collect examples where:

- the first divergence was disputed;
- the hypothesis was rejected by the probe;
- the intervention felt too broad;
- the learner's wording was ambiguous;
- the model invented reasoning.

These cases should become the first labeled evaluation dataset.
