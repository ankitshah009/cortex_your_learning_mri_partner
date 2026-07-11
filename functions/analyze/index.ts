/**
 * Cortex "analyze" — Butterbase serverless function.
 *
 * POST { problemId: string, problem?: { title: string, statement: string }, reasoning: string }
 *   -> 200 Diagnosis JSON (see frontend/src/scenarios/types.ts)
 *   -> 4xx/5xx on bad input or when the LLM output fails validation
 *      (the frontend live adapter silently falls back to seeded content).
 *
 * Works for ANY problem: the diagnosis is built entirely from
 * problem.statement + reasoning. problemId is only echoed back in the
 * response (and used as a text hint when `problem` is omitted).
 *
 * Pipeline (prompts adapted from Documentation/08_PROMPT_LIBRARY.md):
 *   1. Reconstruct the learner's reasoning as 3-6 ordered steps.
 *   2. Surface hidden assumptions as inferred "mystery" steps.
 *   3. Find the FIRST divergence (earliest wobbly step everything downstream
 *      leans on) and mark everything after it as downstream.
 *   4. Form a cautious misconception hypothesis with confidence numbers.
 *   5. Generate ONE adaptive probe question that can confirm or falsify it.
 *   6. Validate the JSON server-side; retry once with the validation errors;
 *      if still invalid return HTTP 500 so the frontend falls back.
 *
 * Env (set at deploy time):
 *   AI_GATEWAY_KEY  — bb_sk_* key scoped to this app + ai:gateway (required)
 *   MODEL           — AI gateway model id (default: openai/gpt-4o-mini)
 *   BUTTERBASE_APP_ID / BUTTERBASE_API_URL are auto-injected by the runtime.
 */

interface ProblemInfo {
  title?: string;
  statement?: string;
}

const SYSTEM_PROMPT = `You are Cortex, an educational reasoning diagnostic engine for kids (ages 9-13).

Your task: reconstruct the learner's stated reasoning, surface hidden assumptions the learner never wrote down, identify the FIRST divergence (the earliest wobbly spot every later step leans on), form a cautious and testable misconception hypothesis, and ask ONE probe question that can confirm or falsify the hypothesis.

You diagnose before teaching, but you also prepare the tiny lesson used after the probe confirms the mix-up.

Rules:
1. Use only evidence from the learner's response and the supplied problem rubric.
2. Preserve valid reasoning steps instead of marking the whole answer wrong.
3. The first divergence is the earliest step where the reasoning becomes unsupported, invalid, or dependent on a critical unstated assumption. Later dependent steps are "downstream".
4. If a critical assumption was never stated, add it as its own step with "inferred": true, kind "mystery", and a caption like "hidden step, you never said this out loud!".
5. State the misconception as a hypothesis using cautious language ("I think your brain...", "may", "likely").
6. The probe must distinguish the leading hypothesis from plausible alternatives, and must be answerable by a kid in one line.
7. Do not infer intelligence, motivation, disability, personality, or emotional state. Never shame; a mix-up is a "wobbly spot", not a failure.
8. TONE: warm, playful, kid-friendly. Short sentences. Give the mix-up a fun memorable name (like "The Speed-Smoothie Mix-up"). Talk about what "your brain" did, celebrate finding the wobbly spot.
9. If the reasoning is fully correct, set "mixup" to null and write a celebration for solid reasoning.
10. The learner's reasoning may describe a different scenario than the problem. Always analyze the reasoning text itself.
11. Return ONLY a JSON object matching the schema. No markdown fences, no commentary.

OUTPUT SCHEMA (all fields required unless noted):
{
  "steps": [                    // 3 to 6 ordered steps reconstructing the reasoning
    {
      "id": "step-1",           // unique, kebab-case
      "kind": "claim" | "mystery" | "operation" | "conclusion",
      "label": "kid-friendly summary of the step",
      "caption": "small caption, e.g. \\"what you noticed\\", \\"hidden step, you never said this out loud!\\", \\"your move\\", \\"your answer\\"",
      "inferred": true          // ONLY on steps the learner never wrote (optional otherwise)
    }
  ],
  "mixup": null OR {
    "stepId": "step-2",         // the FIRST divergence; must be an id from steps
    "downstreamIds": ["step-3", "step-4"],  // every later step that leans on it
    "hypothesis": {
      "name": "The <Fun Name> Mix-up",
      "kidExplanation": "1-3 short sentences: what the brain likely did and why it wobbles",
      "confidenceBefore": 68,   // integer 40-85: confidence before the probe
      "confidenceAfter": 93,    // integer, > confidenceBefore, <= 97: if probe confirms
      "confidenceIfCorrect": 74 // integer between the two: if probe answer is ambiguous
    },
    "confirmLine": "one kid sentence: what the brain did + encouragement (finding it is the hard part!)",
    "memoryEvidence": "one sentence linking this to an earlier moment this same pattern could have appeared, phrased as a friendly memory (\\"My memory says this might be the same mix-up!\\")",
    "probe": {
      "question": "ONE quick experiment question, concrete numbers, answerable in one line",
      "options": [              // exactly 3 options
        { "id": "opt-a", "label": "answer if the mix-up is real", "kind": "mixup" },
        { "id": "opt-b", "label": "the correct answer", "kind": "correct" },
        { "id": "opt-c", "label": "a plausible distractor", "kind": "other" }
      ]
    },
    "lesson": {
      "title": "The tiny fix: <one-line idea>",
      "steps": ["3 or 4 short kid-friendly strings walking through the repair with concrete numbers"]
    },
    "fixedLabels": {            // REWRITE the actual bubble text for the wobbly step AND each downstream step. NEVER placeholder text.
      "step-2": "the real corrected sentence for this step (e.g. \\"Rex spends TWICE as long at the slow speed\\")",
      "step-3": "the corrected operation with real numbers (e.g. \\"Total distance ÷ total time: 1440 ÷ 360\\")",
      "step-4": "the corrected final answer with real numbers, ending with ✓"
    }
  },
  "celebration": {
    "headline": "short excited headline (e.g. \\"Mix-up fixed! Your brain grew!\\")",
    "sub": "one sentence naming the mix-up that was repaired, or praising the solid reasoning"
  }
}`;

function buildUserPrompt(
  problemId: string,
  problem: ProblemInfo | null,
  reasoning: string,
): string {
  const problemBlock = problem?.statement
    ? `PROBLEM${problem.title ? ` (${problem.title})` : ""}\n${problem.statement}`
    : `PROBLEM\nThe full problem statement was not provided (problem id hint: "${problemId}"). Reconstruct and diagnose the learner's reasoning on its own terms.`;
  return `${problemBlock}

LEARNER RESPONSE
${reasoning}

Reconstruct no more than six ordered reasoning steps. Then identify the first divergence (if any), generate one testable hypothesis, and generate one adaptive probe. Return only schema-valid JSON.`;
}

/* ------------------------------------------------------------------ */
/* Server-side validation of the Diagnosis shape                       */
/* ------------------------------------------------------------------ */

const STEP_KINDS = ["claim", "mystery", "operation", "conclusion"];
const OPTION_KINDS = ["mixup", "correct", "other"];

function isStr(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}
function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateDiagnosis(d: any): string[] {
  const errs: string[] = [];
  if (!d || typeof d !== "object") return ["root: not an object"];

  // steps
  if (!Array.isArray(d.steps) || d.steps.length < 2 || d.steps.length > 8) {
    errs.push("steps: must be an array of 2-8 items");
  } else {
    const ids = new Set<string>();
    d.steps.forEach((s: any, i: number) => {
      if (!isStr(s?.id)) errs.push(`steps[${i}].id: missing`);
      else if (ids.has(s.id)) errs.push(`steps[${i}].id: duplicate "${s.id}"`);
      else ids.add(s.id);
      if (!STEP_KINDS.includes(s?.kind))
        errs.push(`steps[${i}].kind: must be one of ${STEP_KINDS.join("|")}`);
      if (!isStr(s?.label)) errs.push(`steps[${i}].label: missing`);
      if (!isStr(s?.caption)) errs.push(`steps[${i}].caption: missing`);
      if (s?.inferred !== undefined && typeof s.inferred !== "boolean")
        errs.push(`steps[${i}].inferred: must be boolean`);
    });

    // mixup
    const m = d.mixup;
    if (m !== null && m !== undefined) {
      if (typeof m !== "object") {
        errs.push("mixup: must be an object or null");
      } else {
        if (!isStr(m.stepId) || !ids.has(m.stepId))
          errs.push("mixup.stepId: must reference an id in steps");
        if (
          !Array.isArray(m.downstreamIds) ||
          m.downstreamIds.some((x: any) => !isStr(x) || !ids.has(x))
        )
          errs.push("mixup.downstreamIds: must be an array of step ids");
        const h = m.hypothesis;
        if (!h || typeof h !== "object") {
          errs.push("mixup.hypothesis: missing");
        } else {
          if (!isStr(h.name)) errs.push("mixup.hypothesis.name: missing");
          if (!isStr(h.kidExplanation))
            errs.push("mixup.hypothesis.kidExplanation: missing");
          for (const k of [
            "confidenceBefore",
            "confidenceAfter",
            "confidenceIfCorrect",
          ]) {
            if (!isNum(h[k]) || h[k] < 0 || h[k] > 100)
              errs.push(`mixup.hypothesis.${k}: must be a number 0-100`);
          }
        }
        if (!isStr(m.confirmLine)) errs.push("mixup.confirmLine: missing");
        if (!isStr(m.memoryEvidence)) errs.push("mixup.memoryEvidence: missing");
        const p = m.probe;
        if (!p || !isStr(p.question)) {
          errs.push("mixup.probe.question: missing");
        }
        if (!p || !Array.isArray(p.options) || p.options.length !== 3) {
          errs.push("mixup.probe.options: must be exactly 3 options");
        } else {
          p.options.forEach((o: any, i: number) => {
            if (!isStr(o?.id)) errs.push(`mixup.probe.options[${i}].id: missing`);
            if (!isStr(o?.label))
              errs.push(`mixup.probe.options[${i}].label: missing`);
            if (!OPTION_KINDS.includes(o?.kind))
              errs.push(
                `mixup.probe.options[${i}].kind: must be one of ${OPTION_KINDS.join("|")}`,
              );
          });
          const kinds = p.options.map((o: any) => o?.kind);
          if (!kinds.includes("mixup") || !kinds.includes("correct"))
            errs.push(
              'mixup.probe.options: must include one "mixup" and one "correct" option',
            );
        }
        const l = m.lesson;
        if (!l || !isStr(l.title)) errs.push("mixup.lesson.title: missing");
        if (
          !l ||
          !Array.isArray(l.steps) ||
          l.steps.length < 2 ||
          l.steps.some((x: any) => !isStr(x))
        )
          errs.push("mixup.lesson.steps: must be an array of 2+ strings");
        if (
          !m.fixedLabels ||
          typeof m.fixedLabels !== "object" ||
          Array.isArray(m.fixedLabels) ||
          Object.keys(m.fixedLabels).length === 0 ||
          Object.entries(m.fixedLabels).some(
            ([k, v]) => !ids.has(k) || !isStr(v),
          )
        )
          errs.push(
            "mixup.fixedLabels: must map existing step ids to corrected label strings",
          );
      }
    }
  }

  // celebration
  if (!d.celebration || !isStr(d.celebration.headline) || !isStr(d.celebration.sub))
    errs.push("celebration: needs headline and sub strings");

  return errs;
}

/* ------------------------------------------------------------------ */
/* LLM call helpers                                                    */
/* ------------------------------------------------------------------ */

function extractJson(text: string): any {
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function chat(ctx: any, messages: any[]): Promise<string> {
  const { BUTTERBASE_APP_ID, BUTTERBASE_API_URL, MODEL } = ctx.env;
  const gatewayKey = ctx.env.AI_GATEWAY_KEY || ctx.env.BUTTERBASE_API_KEY;
  const res = await fetch(
    `${BUTTERBASE_API_URL}/v1/${BUTTERBASE_APP_ID}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gatewayKey}`,
      },
      body: JSON.stringify({
        model: MODEL || "openai/gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 2500,
        messages,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI gateway ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!isStr(content)) throw new Error("AI gateway returned empty content");
  return content;
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Content-Type": "application/json",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

export default async function handler(req: Request, ctx: any): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "POST only" });
  }

  let problemId = "";
  let reasoning = "";
  let problem: ProblemInfo | null = null;
  try {
    const body = await req.json();
    problemId = String(body?.problemId ?? "");
    reasoning = String(body?.reasoning ?? "");
    if (body?.problem && typeof body.problem === "object") {
      problem = {
        title: isStr(body.problem.title) ? body.problem.title.slice(0, 200) : undefined,
        statement: isStr(body.problem.statement)
          ? body.problem.statement.slice(0, 2000)
          : undefined,
      };
    }
  } catch {
    return json(400, { error: "invalid JSON body" });
  }
  if (!problemId || !reasoning.trim()) {
    return json(400, { error: "problemId and reasoning are required" });
  }
  if (reasoning.length > 4000) reasoning = reasoning.slice(0, 4000);

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(problemId, problem, reasoning) },
  ];

  try {
    // Attempt 1
    let raw = await chat(ctx, messages);
    let diagnosis: any;
    let errs: string[];
    try {
      diagnosis = extractJson(raw);
      errs = validateDiagnosis(diagnosis);
    } catch (e: any) {
      diagnosis = null;
      errs = [`json parse failed: ${e?.message ?? e}`];
    }

    // Attempt 2: validation-repair retry (prompt library section 6)
    if (errs.length > 0) {
      console.warn("analyze: attempt 1 invalid:", errs.join("; "));
      raw = await chat(ctx, [
        ...messages,
        { role: "assistant", content: raw },
        {
          role: "user",
          content: `Your previous response failed JSON validation.\n\nVALIDATION ERRORS\n${errs.join(
            "\n",
          )}\n\nReturn a corrected JSON object only. Do not add fields not present in the schema. Preserve the original educational analysis unless a validation error requires changing it.`,
        },
      ]);
      diagnosis = extractJson(raw);
      errs = validateDiagnosis(diagnosis);
      if (errs.length > 0) {
        console.error("analyze: attempt 2 still invalid:", errs.join("; "));
        return json(500, { error: "diagnosis failed validation", details: errs });
      }
    }

    // Normalize mixup undefined -> null and stamp the problemId server-side.
    return json(200, {
      problemId,
      steps: diagnosis.steps,
      mixup: diagnosis.mixup ?? null,
      celebration: diagnosis.celebration,
    });
  } catch (e: any) {
    console.error("analyze: error", e?.message ?? e);
    return json(500, { error: String(e?.message ?? e) });
  }
}
