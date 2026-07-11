# TODOS

Deferred items from the 2026-07-11 engineering + CEO reviews. Each entry carries
enough context to pick up cold.

## P1 — correctness

- [ ] **Fix prompt-contaminated understanding scoring.** `classifyTurn` in
  `frontend/src/backend/mock.ts` concatenates Cora's prompt with the student
  response, so a prompt containing "remember"/"future"/"similar" earns
  high-value evidence (+17 memory_rule) regardless of what the student typed.
  Confirmed independently by Codex review and pinned by
  `mock.classify.test.ts` (which documents the current behavior — update those
  assertions with the fix). Fix: classify the student's text only.
  Why deferred: changes learning-progression behavior; deserves its own change
  and a quick play-through, not a drive-by during demo prep.

- [ ] **"Correct" probe answer still teaches the mix-up and records "repaired".**
  `StageRail.tsx` confirmed-stage copy acknowledges a plot twist, but completion
  logic keys off `diagnosis.mixup`, not `probeOutcome`
  (`SolvePage.tsx` celebration effect). A learner who answers the probe
  correctly gets taught a misconception they may not have, and the session is
  stored as a repair. Fix: branch the lesson/celebration/recording on
  `probeOutcome === "correct"` (skip or soften the lesson, record "solid-after-probe").

## P2 — architecture / DRY

- [ ] **Consolidate Diagnosis validation (3 divergent implementations).**
  `functions/analyze/index.ts` (strict, exactly-3 probe options),
  `frontend/scripts/cortex-api.mjs normalizeMixup` (repairs, allows 2-4,
  synthesizes options), `frontend/src/backend/live.ts` (minimal). Extract one
  shared validator; also unblocks unit tests for the analyze validators
  (`functions/analyze/index.ts` exports nothing today — the vitest agent had to
  skip it).

- [ ] **Extract a `withFallback(fn, mock)` helper in the provider layer.** The
  silent try/console.warn/mock pattern is copy-pasted ~5x across
  `live.ts`/`everos.ts`. Also consider surfacing persistent live-endpoint
  failure to the user (today it always "works" with seeded data).

- [ ] **EverOS key architecture.** `VITE_EVEROS_API_KEY` inlines a bearer token
  into the public bundle if ever set in a deployed build (currently unset in
  CI, so nothing leaks today). Move EverOS calls server-side (the `api`
  function) before enabling memory in production. Also: `getMemoryEvidence`
  is implemented but has no caller — wire it in or drop it.

- [ ] **localStorage schema versioning/migration.** Four persistence namespaces
  (`cortex-app`, `cortex-created-courses`, `cortex-imported-homework-library`,
  custom problems) with no version keys; a shape change strands returning
  users. Add a version field + migrate hook to each.

## P3 — cleanup / product

- [ ] **Dead code sweep.** `parseJsonObject` (cortex-api.mjs:810),
  `islandStates`/`IslandMap` (pre-3D visualization), duplicated
  `slugify`/color palettes between `courseStore.ts` and `cortex-api.mjs`
  (already drifted: random vs modulo color).

- [ ] **Knowledge graph edges measure combinatorics, not knowledge.** Every
  concept pair in a course gets an edge (`coOccurrence` incremented once per
  pair). Compute co-occurrence at the problem level so "connections grown"
  means something.

- [ ] **Mastery formula overweights a single practiced problem.** One 100-score
  problem among ten yields ~90% mastery (`knowledgeGraph.ts` evidenceRatio).
  Weight by coverage of the concept's problems.

- [ ] **Neuron firing after a solve rarely renders.** The graph unmounts during
  solving, so `useFiredNodes` has no previous map to diff on return
  (`BrainGraph.tsx`). Persist last-seen mastery per node (store) so the fire
  animation triggers on remount.

## From the CEO review (90-day platform plan)

Plan: `~/.gstack/projects/ankitshah009-cortex_your_learning_mri_partner/ceo-plans/2026-07-11-platform-diagnostic-api.md`

- [ ] **Webhooks/event stream** (`diagnosis.completed`, `misconception.confirmed`) —
  deferred until the first design partner's integration requirements exist.
- [ ] **Class misconception-clusters endpoint** — deferred until the verified-evidence
  ledger accumulates real multi-learner data from a deployed partner.
- [ ] **Teacher dashboard UI** — API-first strategy; partners render their own views.
- [ ] **Multi-domain expansion** — gated on the first domain meeting the eval bar
  (first-divergence agreement ≥75%, ECE ≤ 0.10).
