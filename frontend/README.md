# Cortex Frontend — Watch Your Brain Learn

Student-facing demo UI for Cortex: a playful "brain scan" that finds where a
learner's reasoning first breaks, verifies the mix-up with one probe question,
and repairs it with the smallest possible fix.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Demo flow (2.5 minutes)

1. **Home** — pick a name/avatar, see your brain as concept islands.
   Speed Springs has a wobbly spot (an unresolved mix-up from EverOS memory).
2. **Start today's adventure** — read Rex's Round Trip, submit your reasoning
   (pre-filled with the classic wrong answer).
3. Watch the **thought path** build: bubbles hop in, connections draw,
   and the hidden wobbly step is discovered.
4. Cora shares her **hunch** (with memory evidence), asks one **probe question**,
   and confirms the mix-up. Celebration, not shame.
5. The **tiny fix** repairs the wobbly bubble and the whole path relights.
6. Back home: Speed Springs glows, a new bridge grows. Your brain grew.

## Presenter keys

- `→` advance a stage (auto-answers the probe if skipped)
- `←` go back a stage
- `r` restart the scan

## Architecture

- `src/stages/stageMachine.ts` — the demo spine; every component renders from the current stage
- `src/scenarios/` — scenario content (problem, reasoning chain, probe, lesson)
- `src/backend/` — `DataProvider` seam; the demo runs on `mock.ts`, swap in
  Butterbase/EverOS adapters without touching UI code
- `src/components/thought-path/` — React Flow canvas with custom thought bubbles
- `src/components/mascot/` — Cora
- `src/components/brain-map/` — the island map (EverOS long-term memory view)
