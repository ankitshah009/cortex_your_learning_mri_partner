# Cortex Frontend — Watch Your Brain Learn

Student-facing demo UI for Cortex: a playful "brain scan" that guides a student
through their homework, finds where their reasoning first breaks, verifies the
mix-up with one probe question, and repairs it with the smallest possible fix.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Demo flow

1. **Home** — pick a name/avatar, see your brain as concept islands and your
   assigned homework (Motion & Rates Worksheet, 3 problems, progress bar).
2. **Homework page** — problems listed in order with status chips
   (Not scanned / Up next! / Solid ✓ / Fixed a mix-up 💡).
3. **Problem 1, Rex's Round Trip** — the classic mix-up arc: thought path
   builds, the hidden wobbly step is found, Cora's hunch + memory evidence,
   one probe question, tiny fix, repair cascade, confetti.
4. **Problem 2, Mia's Bike Ride** — the reasoning is CORRECT: the scan traces
   it, finds no mix-up, and celebrates a solid path. (This is what makes the
   guide feel honest: it doesn't invent bugs.)
5. **Problem 3, Meet in the Middle** — a second, different mix-up
   (the Solo-Walker Mix-up).
6. Each celebration offers **Next problem ➡️** until the homework is done;
   the brain map brightens island by island.

## Presenter keys (on the scan screen)

- `→` advance a stage (auto-answers the probe if skipped)
- `←` go back a stage
- `r` restart the scan

## Wiring a real backend

The UI talks only to the `DataProvider` interface (`src/backend/provider.ts`).

- Default: `mock.ts` serves seeded content from `src/scenarios/`.
- Live mode: set `VITE_ANALYZE_URL` in `.env` (see `.env.example`). The app
  POSTs `{ problemId, reasoning }` and expects a `Diagnosis` JSON back
  (`src/scenarios/types.ts`). Any failure falls back to seeded content, so a
  live demo can never stall.
- To add homework/problems: author a `Problem` + `Diagnosis` pair in
  `src/scenarios/` and register them in `src/scenarios/homework.ts`.

## Architecture

- `src/stages/stageMachine.ts` — the demo spine; every component renders from the current stage
- `src/scenarios/` — homework, problems, and seeded diagnoses (all content is data)
- `src/backend/` — `DataProvider` seam: `mock.ts` (seeded), `live.ts` (real endpoint + fallback)
- `src/components/thought-path/` — React Flow canvas with custom thought bubbles
- `src/components/mascot/` — Cora
- `src/components/brain-map/` — the island map (EverOS long-term memory view), derived from completions
