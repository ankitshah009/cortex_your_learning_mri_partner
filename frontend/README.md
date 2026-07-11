# Cortex Frontend — Watch Your Brain Learn

Student-facing demo UI for Cortex: a playful "brain scan" that guides a student
through their homework, finds where their reasoning first breaks, verifies the
mix-up with one probe question, then makes the student prove the repair through
a short conversation before the problem counts as learned.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

For PDF import + live LLM diagnosis, run the API server in a second terminal:

```bash
ANTHROPIC_API_KEY=... TAVILY_API_KEY=tvly-... npm run api
```

Then set `VITE_CORTEX_API_URL=http://localhost:8787` in `.env` before starting
Vite.

The local API defaults to the cheaper Haiku model for both reasoning and PDF
extraction. Override with `CORTEX_REASONING_MODEL` or `CORTEX_EXTRACTION_MODEL`
if you need a stronger model for a specific run.

`CORTEX_DEMO_PACING` defaults to `true`. In this mode, one relevant own-words
explanation normally advances the repair conversation, evidence gains are
larger, and Cora asks a follow-up only when the answer is materially wrong or
too vague to evaluate. Set `CORTEX_DEMO_PACING=false` for a more rigorous pace.

`TAVILY_API_KEY` is optional but recommended. When present, Cortex performs a
focused, cached search per uploaded PDF, stores the main topic and up to five
sources with the homework, and supplies that background to later explanations.
Clicking a course-brain node also calls `POST /api/concept-brief`: Tavily finds
lecture-style explanations, worked examples, and common misconceptions, then
the reasoning model synthesizes a short brief tied to the actual homework
prompts. The UI labels whether the result is `Tavily + AI` or an offline model
fallback and exposes the source links.
Search failures never block PDF import. `TAVILY_SEARCH_DEPTH` defaults to
`basic`; set it to `advanced` for higher-relevance results at higher credit use.
`TAVILY_TIMEOUT_MS` defaults to `8000`, and `TAVILY_PROJECT` is forwarded as
Tavily's project ID when set. The raw search layer remains available through
`POST /api/learning-context` with `{ mainTopic, title, subject, searchQuery }`.

## Demo flow

1. **Home** — pick a name/avatar, see your brain as concept islands and your
   assigned homework (Motion & Rates Worksheet, 3 problems, progress bar).
2. **Homework page** — problems listed in order with status chips
   (Not scanned / Up next! / Solid ✓ / Fixed a mix-up 💡).
3. **Problem 1, Rex's Round Trip** — the classic mix-up arc: thought path
   builds, the hidden wobbly step is found, Cora's hunch + memory evidence,
   one probe question, tiny fix, then an adaptive repair conversation. The AI
   sees the ordered dialogue and tool-calls `ask_follow_up` or `advance`; the
   client does not enforce a fixed question count or score threshold.
4. **Problem 2, Mia's Bike Ride** — the reasoning is CORRECT: the scan traces
   it, finds no mix-up, then still asks the student to prove why the method
   works before the problem is completed.
5. **Problem 3, Meet in the Middle** — a second, different mix-up
   (the Solo-Walker Mix-up).
6. Click any course-brain concept to compare **Before** and **Now**, inspect the
   student's evidence, see linked homework, and read a cited topic brief.
7. Each celebration offers **Next problem ➡️** after the adaptive tutor chooses
   `advance`; the brain brightens from scored evidence and recent practice.

## Clean testing reset

On a course page, click **Reset test progress**, then click again to confirm.
This clears only the persisted student learning state (`completedProblems` and
`understandingByProblem`) and switches the brain to **Before**. Uploaded
homework remains available, so the same content can be run again to compare the
before/after graph.

For a completely clean browser fixture, also remove these local-storage keys:

- `cortex-app` — profile and learning evidence
- `cortex-imported-homework-library` — imported worksheets
- `cortex-created-courses` — locally created course folders

Restart `npm run api` to clear the API's in-memory Tavily and concept-brief
caches between grounding tests.

## Presenter keys (on the scan screen)

- `→` advance a stage (cannot skip the repair lab)
- `←` go back a stage
- `r` restart the scan

## Wiring a real backend

The UI talks only to the `DataProvider` interface (`src/backend/provider.ts`).

- Default: `mock.ts` serves seeded content from `src/scenarios/`.
- Full live mode: set `VITE_CORTEX_API_URL` in `.env` and run `npm run api`.
  The app uploads worksheet PDFs to `/api/homeworks/import-pdf`, receives real
  extracted questions, then POSTs `{ problemId, problem, reasoning }` to
  `/api/analyze` for LLM-generated diagnoses and follow-up content. The API
  forces Anthropic tool calls for structured extraction and diagnosis outputs.
  PDF extraction also identifies related concepts; the knowledge graph only
  links concepts that genuinely co-occur in a question, which keeps mixed-topic
  worksheets from becoming fully connected graphs.
- Legacy live mode: set `VITE_ANALYZE_URL` in `.env`. The app POSTs
  `{ problemId, problem, reasoning }` and expects a `Diagnosis` JSON back
  (`src/scenarios/types.ts`). Seeded content still falls back to mock diagnoses
  if the endpoint fails.
- To add seeded demo homework/problems: author a `Problem` + `Diagnosis` pair
  in `src/scenarios/` and register them in `src/scenarios/homework.ts`.

## Architecture

- `src/stages/stageMachine.ts` — the demo spine; every component renders from the current stage
- `src/scenarios/` — homework, problems, and seeded diagnoses (all content is data)
- `src/backend/` — `DataProvider` seam: `mock.ts` (seeded), `live.ts` (real endpoint + fallback)
- `src/components/thought-path/` — React Flow canvas with custom thought bubbles
- `src/components/mascot/` — Cora
- `src/components/brain-map/` — the island map (EverOS long-term memory view), derived from completions
