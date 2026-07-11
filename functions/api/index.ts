/**
 * Cortex "api" — Butterbase serverless router function.
 *
 * Ports the dev-only frontend/scripts/cortex-api.mjs endpoints to production.
 * Butterbase HTTP functions are only reachable at the EXACT URL
 *   https://api.butterbase.ai/v1/{app_id}/fn/api
 * — subpaths after the function name 404 at the platform edge — so the
 * logical route travels in the `?path=` query parameter (or the
 * `x-cortex-path` header). The frontend must call:
 *
 *   {base}?path=/api/courses               POST CourseCreateInput      -> Course
 *   {base}?path=/api/courses               GET                         -> Course[]
 *   {base}?path=/api/homeworks/import-pdf  POST multipart file+courseId-> { homework, problems, courseId }
 *   {base}?path=/api/analyze               POST { problemId, problem?, reasoning } -> Diagnosis
 *   {base}?path=/api/evaluate-question     POST { question, problem, diagnosis?, currentUnderstanding?, mode?, prompt? }
 *                                               -> { depth, understandingDelta, feedbackToStudent, nextPrompt, evidence }
 *   {base}?path=/api/sessions              POST { topic, summary, score } -> { ok: true }
 *   {base}?path=/health                    GET                          -> { ok, ... }
 *
 * where {base} = https://api.butterbase.ai/v1/{app_id}/fn/api
 * (If the platform ever forwards subpaths, they are honored as a fallback.)
 *
 * Persistence: courses / homeworks / problems / sessions are stored in the
 * app database (tables cortex_courses, cortex_homeworks, cortex_problems,
 * cortex_sessions — JSON blobs keyed by id), replacing the dev server's
 * in-memory Maps.
 *
 * PDF import: the frontend uploads the raw PDF as multipart form data. The
 * runtime has no Node fs / pdf libraries, so the PDF bytes are base64'd and
 * sent to the Butterbase AI gateway as an OpenAI-style `file` content part
 * (data URI). If the gateway rejects that shape, an `image_url` data-URI
 * part is attempted as a fallback.
 *
 * Env (set at deploy time):
 *   AI_GATEWAY_KEY   — bb_sk_* key scoped to this app + ai:gateway (required)
 *   MODEL            — reasoning model id (default: openai/gpt-4o-mini)
 *   EXTRACTION_MODEL — PDF extraction model id (default: anthropic/claude-haiku-4.5)
 *   BUTTERBASE_APP_ID / BUTTERBASE_API_URL are auto-injected by the runtime.
 */

const MAX_PDF_BYTES = 12 * 1024 * 1024;
const COURSE_COLORS = ["lav", "teal", "coral", "sky", "gold"];
const DEFAULT_REASONING_MODEL = "openai/gpt-4o-mini";
const DEFAULT_EXTRACTION_MODEL = "anthropic/claude-haiku-4.5";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, x-cortex-path",
  "Content-Type": "application/json",
};

/* ------------------------------------------------------------------ */
/* Simple per-IP rate limiter (~30 req/min on LLM routes).             */
/* Function invocations do not share isolate memory on this platform,  */
/* so the counter lives in the app database (cortex_rate_limits) —     */
/* one upsert per request, shared across every instance. Fails open    */
/* if the counter query errors.                                        */
/* ------------------------------------------------------------------ */

const RATE_LIMIT = 30; // requests per minute per IP

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

async function rateLimited(req: Request, ctx: any): Promise<boolean> {
  try {
    const result = await ctx.db.query(
      `INSERT INTO cortex_rate_limits (key, count, reset_at)
       VALUES ($1, 1, now() + interval '60 seconds')
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN now() >= cortex_rate_limits.reset_at THEN 1 ELSE cortex_rate_limits.count + 1 END,
         reset_at = CASE WHEN now() >= cortex_rate_limits.reset_at THEN now() + interval '60 seconds' ELSE cortex_rate_limits.reset_at END
       RETURNING count`,
      [`api:${clientIp(req)}`],
    );
    return Number(result.rows?.[0]?.count ?? 0) > RATE_LIMIT;
  } catch (e: any) {
    console.warn("api: rate limit check failed open:", e?.message ?? e);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Small helpers (ported from frontend/scripts/cortex-api.mjs)         */
/* ------------------------------------------------------------------ */

function httpError(statusCode: number, message: string): Error {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function json(status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, ...extraHeaders },
  });
}

function isStr(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}
function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function cleanId(value: unknown): string {
  return cleanString(value).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
}
function cleanConcept(value: unknown): string {
  return cleanId(value).toLowerCase() || "math";
}
function clampPercent(value: unknown, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}
function stripPdfExtension(value: unknown): string {
  return cleanString(value).replace(/\.pdf$/i, "");
}
function slugify(value: unknown): string {
  return (
    stripPdfExtension(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "homework"
  );
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function extractJson(text: string): any {
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/* ------------------------------------------------------------------ */
/* AI gateway                                                          */
/* ------------------------------------------------------------------ */

interface ChatOpts {
  model: string;
  maxTokens: number;
  temperature?: number;
}

async function gatewayChat(ctx: any, messages: any[], opts: ChatOpts): Promise<string> {
  const { BUTTERBASE_APP_ID, BUTTERBASE_API_URL } = ctx.env;
  const gatewayKey = ctx.env.AI_GATEWAY_KEY;
  if (!gatewayKey) {
    throw httpError(500, "AI_GATEWAY_KEY is not configured on the api function.");
  }
  const res = await fetch(
    `${BUTTERBASE_API_URL}/v1/${BUTTERBASE_APP_ID}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gatewayKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens,
        messages,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw httpError(res.status >= 500 ? 502 : res.status, `AI gateway ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!isStr(content)) throw httpError(502, "AI gateway returned empty content");
  return content;
}

/* ------------------------------------------------------------------ */
/* Direct Anthropic fallback (used when the Butterbase gateway fails,  */
/* e.g. the platform-wide upstream quota outage on demo day).          */
/* ------------------------------------------------------------------ */

/** Convert one OpenAI-style content part to an Anthropic content block. */
function toAnthropicBlock(part: any): any {
  if (typeof part === "string") return { type: "text", text: part };
  if (part?.type === "text") return { type: "text", text: part.text };
  // Data-URI carriers used by the PDF extraction attempts.
  const dataUri: string | undefined =
    part?.type === "file" ? part.file?.file_data :
    part?.type === "image_url" ? part.image_url?.url : undefined;
  if (isStr(dataUri) && dataUri.startsWith("data:")) {
    const [, meta, data] = dataUri.match(/^data:([^;]+);base64,(.*)$/s) ?? [];
    if (!isStr(data)) throw httpError(400, "Unsupported data URI in content");
    if (meta === "application/pdf") {
      return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
    }
    return { type: "image", source: { type: "base64", media_type: meta, data } };
  }
  throw httpError(400, `Unsupported content part for Anthropic fallback: ${part?.type}`);
}

async function anthropicChat(ctx: any, messages: any[], opts: ChatOpts): Promise<string> {
  const apiKey = ctx.env.ANTHROPIC_API_KEY;
  if (!isStr(apiKey)) throw httpError(502, "AI gateway failed and no ANTHROPIC_API_KEY fallback is configured");

  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n\n");
  const converted = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role,
      content: Array.isArray(m.content)
        ? m.content.map(toAnthropicBlock)
        : [{ type: "text", text: String(m.content) }],
    }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      // Matches the model family the team standardized on for this app
      // (CORTEX_REASONING_MODEL=claude-haiku-4-5 in the dev config).
      model: ctx.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
      max_tokens: opts.maxTokens,
      temperature: opts.temperature ?? 0.2,
      ...(system ? { system } : {}),
      messages: converted,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw httpError(res.status >= 500 ? 502 : res.status, `Anthropic ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  if (data?.stop_reason === "refusal") throw httpError(502, "Anthropic fallback refused the request");
  const text = (data?.content ?? [])
    .filter((b: any) => b?.type === "text" && isStr(b.text))
    .map((b: any) => b.text)
    .join("");
  if (!isStr(text)) throw httpError(502, "Anthropic fallback returned empty content");
  return text;
}

/** Gateway first; direct Anthropic when the gateway is down or over quota. */
async function chat(ctx: any, messages: any[], opts: ChatOpts): Promise<string> {
  try {
    return await gatewayChat(ctx, messages, opts);
  } catch (err: any) {
    if (!isStr(ctx.env.ANTHROPIC_API_KEY)) throw err;
    console.warn(`chat: gateway failed (${err?.message ?? err}); falling back to Anthropic`);
    return await anthropicChat(ctx, messages, opts);
  }
}

/* ------------------------------------------------------------------ */
/* Persistence (app database via ctx.db)                               */
/* ------------------------------------------------------------------ */

async function upsertBlob(
  ctx: any,
  table: string,
  id: string,
  data: unknown,
  extra: Record<string, string | null> = {},
): Promise<void> {
  const extraCols = Object.keys(extra);
  const cols = ["id", "data", ...extraCols].map((c) => `"${c}"`).join(", ");
  const placeholders = ["$1", "$2::jsonb", ...extraCols.map((_, i) => `$${i + 3}`)].join(", ");
  const updates = ["data = EXCLUDED.data", ...extraCols.map((c) => `"${c}" = EXCLUDED."${c}"`)].join(", ");
  await ctx.db.query(
    `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updates}`,
    [id, JSON.stringify(data), ...Object.values(extra)],
  );
}

async function getBlob(ctx: any, table: string, id: string): Promise<any | null> {
  const result = await ctx.db.query(`SELECT data FROM ${table} WHERE id = $1`, [id]);
  return result.rows?.[0]?.data ?? null;
}

/* ------------------------------------------------------------------ */
/* Route: courses                                                      */
/* ------------------------------------------------------------------ */

async function listCourses(ctx: any): Promise<Response> {
  const result = await ctx.db.query(
    "SELECT data FROM cortex_courses ORDER BY created_at ASC",
  );
  return json(200, (result.rows ?? []).map((r: any) => r.data));
}

async function createCourse(ctx: any, input: any): Promise<Response> {
  const title = cleanString(input?.title) || "New Course";
  const countResult = await ctx.db.query("SELECT count(*)::int AS n FROM cortex_courses");
  const count = Number(countResult.rows?.[0]?.n ?? 0);
  const course = {
    id: `course-${slugify(title)}-${Date.now().toString(36)}`,
    title,
    emoji: cleanString(input?.emoji) || "📁",
    color: COURSE_COLORS.includes(input?.color)
      ? input.color
      : COURSE_COLORS[count % COURSE_COLORS.length],
    subject: cleanString(input?.subject) || title,
    homeworkIds: [] as string[],
    createdAt: new Date().toISOString(),
    source: "created",
  };
  await upsertBlob(ctx, "cortex_courses", course.id, course);
  return json(200, course);
}

/* ------------------------------------------------------------------ */
/* Route: PDF homework import                                          */
/* ------------------------------------------------------------------ */

const EXTRACTION_SYSTEM_PROMPT =
  "You extract homework problems from PDFs for an educational app. Preserve the real question text, do not invent questions, and respond with ONLY a JSON object matching the requested schema — no markdown fences, no commentary.";

function extractionPrompt(fileName: string): string {
  return `Extract the real student-facing homework questions from ${fileName}.

Return ONLY a JSON object with this exact shape:
{
  "title": "short worksheet title",
  "subject": "subject such as Math, Science, or Reading",
  "questions": [
    {
      "number": "1",
      "title": "short question title",
      "emoji": "one emoji for the question",
      "conceptId": "short lowercase concept slug",
      "statement": "full question text exactly as the student should solve it",
      "sampleReasoning": ""
    }
  ]
}

Rules:
- Extract actual questions, not instructions, answer keys, standards, headers, or page numbers.
- Keep each statement self-contained, including needed tables or answer choices in text.
- If the PDF has many questions, return the first 12 substantial questions.
- For conceptId, pick from a small shared set of 3-6 concept slugs for the whole worksheet and reuse the same slug on every question that practices that concept, so the student's knowledge graph links related questions together. Do not invent a unique conceptId per question.
- sampleReasoning must be an empty string unless student reasoning is present in the PDF.
- Do not solve the questions.`;
}

async function extractQuestionsFromPdf(
  ctx: any,
  pdfBase64: string,
  fileName: string,
): Promise<{ title: string; subject: string; questions: any[] }> {
  const model = ctx.env.EXTRACTION_MODEL || DEFAULT_EXTRACTION_MODEL;
  const dataUri = `data:application/pdf;base64,${pdfBase64}`;
  const textPart = { type: "text", text: extractionPrompt(fileName) };
  const attempts: any[][] = [
    // OpenAI/OpenRouter-style file part (PDF-capable models).
    [{ type: "file", file: { filename: fileName, file_data: dataUri } }, textPart],
    // Fallback: some gateways map data URIs by media type instead.
    [{ type: "image_url", image_url: { url: dataUri } }, textPart],
  ];

  let raw = "";
  let lastError: unknown = null;
  for (const content of attempts) {
    try {
      raw = await chat(
        ctx,
        [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content },
        ],
        { model, maxTokens: 2400, temperature: 0.1 },
      );
      lastError = null;
      break;
    } catch (e: any) {
      lastError = e;
      const status = e?.statusCode ?? 0;
      // Only fall through to the next payload shape on client-side rejections.
      if (status < 400 || status >= 500) throw e;
      console.warn(`import-pdf: content shape rejected (${status}), trying fallback`);
    }
  }
  if (lastError) throw lastError;

  const data = extractJson(raw);
  if (!Array.isArray(data.questions)) {
    throw httpError(422, "The model did not return a question list.");
  }
  return {
    title: cleanString(data.title),
    subject: cleanString(data.subject),
    questions: data.questions
      .map((q: any, index: number) => ({
        number: cleanString(q.number) || String(index + 1),
        title: cleanString(q.title) || `Problem ${index + 1}`,
        emoji: cleanString(q.emoji) || "📄",
        conceptId: cleanConcept(q.conceptId),
        statement: cleanString(q.statement),
        sampleReasoning: cleanString(q.sampleReasoning),
      }))
      .filter((q: any) => q.statement.length > 0),
  };
}

/**
 * Read the uploaded PDF from either contract. JSON with client-side base64 is
 * the primary path: the platform's multipart parser corrupts binary bodies
 * (non-ASCII bytes in compressed PDF streams get text-decoded), so the
 * browser encodes the file itself. Multipart remains for older clients and
 * ASCII-safe test uploads.
 */
async function readPdfUpload(
  req: Request,
): Promise<{ fileName: string; courseId?: string; pdfBase64: string }> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    const raw = isStr(body?.pdfBase64)
      ? body.pdfBase64.replace(/^data:application\/pdf;base64,/, "")
      : "";
    if (!raw) throw httpError(400, "Expected a base64 PDF in 'pdfBase64'.");
    if (!raw.startsWith("JVBER")) {
      throw httpError(400, "That file does not look like a PDF.");
    }
    if (raw.length * 0.75 > MAX_PDF_BYTES) {
      throw httpError(413, "PDF is too large to import.");
    }
    return {
      fileName: cleanString(body.fileName) || "homework.pdf",
      courseId: cleanString(body.courseId) || undefined,
      pdfBase64: raw,
    };
  }

  const form = await req.formData();
  const file = form.get("file");
  const courseId = cleanString(form.get("courseId")) || undefined;

  if (!file || typeof file === "string") {
    throw httpError(400, "Expected a PDF file field named 'file'.");
  }
  if (file.type && file.type !== "application/pdf") {
    throw httpError(400, "Please upload a PDF file.");
  }
  if (file.size > MAX_PDF_BYTES) {
    throw httpError(413, "PDF is too large to import.");
  }
  return {
    fileName: file.name || "homework.pdf",
    courseId,
    pdfBase64: toBase64(await file.arrayBuffer()),
  };
}

async function importHomeworkPdf(ctx: any, req: Request): Promise<Response> {
  const { fileName, courseId, pdfBase64 } = await readPdfUpload(req);
  const extracted = await extractQuestionsFromPdf(ctx, pdfBase64, fileName);
  const now = new Date().toISOString();
  const homeworkId = `pdf-${slugify(fileName)}-${Date.now().toString(36)}`;

  const problems = extracted.questions.slice(0, 12).map((q: any, index: number) => ({
    id: `${homeworkId}-q${index + 1}`,
    conceptId: q.conceptId || "math",
    title: q.title || `Problem ${q.number || index + 1}`,
    emoji: q.emoji || "📄",
    statement: q.statement,
    sampleReasoning: q.sampleReasoning || "",
    source: "pdf",
    sourceLabel: fileName,
  }));

  if (problems.length === 0) {
    throw httpError(422, "No homework questions were found in that PDF.");
  }

  const homework = {
    id: homeworkId,
    title: extracted.title || stripPdfExtension(fileName) || "Imported Homework",
    emoji: "📄",
    subject: extracted.subject || "Homework",
    due: "Imported today",
    problemIds: problems.map((p) => p.id),
    courseId,
    source: "pdf",
    sourceFileName: fileName,
    importedAt: now,
  };

  await upsertBlob(ctx, "cortex_homeworks", homework.id, homework, {
    course_id: courseId ?? null,
  });
  for (const problem of problems) {
    await upsertBlob(ctx, "cortex_problems", problem.id, problem, {
      homework_id: homework.id,
    });
  }

  // File the homework into its course so the folder structure grows server-side.
  if (courseId) {
    const course = await getBlob(ctx, "cortex_courses", courseId);
    if (course && Array.isArray(course.homeworkIds) && !course.homeworkIds.includes(homework.id)) {
      course.homeworkIds.push(homework.id);
      await upsertBlob(ctx, "cortex_courses", courseId, course);
    }
  }

  return json(200, { homework, problems, courseId });
}

/* ------------------------------------------------------------------ */
/* Route: analyze (same pipeline as the standalone analyze function)   */
/* ------------------------------------------------------------------ */

const ANALYZE_SYSTEM_PROMPT = `You are Cortex, an educational reasoning diagnostic engine for kids (ages 9-13).

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

interface ProblemInfo {
  title?: string;
  statement?: string;
}

function buildAnalyzePrompt(
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

const STEP_KINDS = ["claim", "mystery", "operation", "conclusion"];
const OPTION_KINDS = ["mixup", "correct", "other"];

function validateDiagnosis(d: any): string[] {
  const errs: string[] = [];
  if (!d || typeof d !== "object") return ["root: not an object"];

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

  if (!d.celebration || !isStr(d.celebration.headline) || !isStr(d.celebration.sub))
    errs.push("celebration: needs headline and sub strings");

  return errs;
}

async function analyzeReasoning(ctx: any, body: any): Promise<Response> {
  const problemId = String(body?.problemId ?? "");
  let reasoning = String(body?.reasoning ?? "");
  let problem: ProblemInfo | null = null;
  if (body?.problem && typeof body.problem === "object") {
    problem = {
      title: isStr(body.problem.title) ? body.problem.title.slice(0, 200) : undefined,
      statement: isStr(body.problem.statement)
        ? body.problem.statement.slice(0, 2000)
        : undefined,
    };
  }
  if (!problemId || !reasoning.trim()) {
    throw httpError(400, "problemId and reasoning are required");
  }
  if (reasoning.length > 4000) reasoning = reasoning.slice(0, 4000);

  // Mirror cortex-api.mjs: fall back to the stored imported problem.
  if (!problem?.statement) {
    const stored = await getBlob(ctx, "cortex_problems", problemId);
    if (stored?.statement) {
      problem = { title: stored.title, statement: String(stored.statement).slice(0, 2000) };
    }
  }

  const model = ctx.env.MODEL || DEFAULT_REASONING_MODEL;
  const messages = [
    { role: "system", content: ANALYZE_SYSTEM_PROMPT },
    { role: "user", content: buildAnalyzePrompt(problemId, problem, reasoning) },
  ];

  // Attempt 1
  let raw = await chat(ctx, messages, { model, maxTokens: 2500 });
  let diagnosis: any;
  let errs: string[];
  try {
    diagnosis = extractJson(raw);
    errs = validateDiagnosis(diagnosis);
  } catch (e: any) {
    diagnosis = null;
    errs = [`json parse failed: ${e?.message ?? e}`];
  }

  // Attempt 2: validation-repair retry
  if (errs.length > 0) {
    console.warn("api/analyze: attempt 1 invalid:", errs.join("; "));
    raw = await chat(
      ctx,
      [
        ...messages,
        { role: "assistant", content: raw },
        {
          role: "user",
          content: `Your previous response failed JSON validation.\n\nVALIDATION ERRORS\n${errs.join(
            "\n",
          )}\n\nReturn a corrected JSON object only. Do not add fields not present in the schema. Preserve the original educational analysis unless a validation error requires changing it.`,
        },
      ],
      { model, maxTokens: 2500 },
    );
    diagnosis = extractJson(raw);
    errs = validateDiagnosis(diagnosis);
    if (errs.length > 0) {
      console.error("api/analyze: attempt 2 still invalid:", errs.join("; "));
      return json(500, { error: "diagnosis failed validation", details: errs });
    }
  }

  return json(200, {
    problemId,
    steps: diagnosis.steps,
    mixup: diagnosis.mixup ?? null,
    celebration: diagnosis.celebration,
  });
}

/* ------------------------------------------------------------------ */
/* Route: evaluate-question                                            */
/* ------------------------------------------------------------------ */

const QUESTION_EVALUATION_SYSTEM_PROMPT =
  "You evaluate student conversation turns as learning evidence. Reward curiosity, explanation, transfer, and metacognition. Respond with ONLY a JSON object matching the requested schema — no markdown fences, no commentary.";

const QUESTION_DEPTHS = [
  "surface_confusion",
  "procedural_question",
  "conceptual_question",
  "contrast_question",
  "transfer_question",
  "metacognitive_question",
  "explanation_attempt",
  "transfer_application",
  "memory_rule",
];

function questionEvaluationPrompt(args: {
  problem: any;
  diagnosis: any;
  question: string;
  currentUnderstanding: number;
  mode: string;
  prompt: string;
}): string {
  const { problem, diagnosis, question, currentUnderstanding, mode, prompt } = args;
  const mixup = diagnosis?.mixup;
  return `Evaluate this student's conversation turn as evidence of understanding.

Problem title: ${problem.title}
Problem prompt: ${problem.statement}
Current understanding score: ${currentUnderstanding}/100
Turn mode: ${mode}
Cora prompt, if any: ${prompt || "none"}
Diagnosis summary: ${
    mixup
      ? `Likely mix-up: ${mixup.hypothesis?.name}. Explanation: ${mixup.hypothesis?.kidExplanation}`
      : "The student's submitted reasoning looked solid."
  }
Student turn: ${question}

Classify the turn:
- surface_confusion: "I don't get it", vague confusion.
- procedural_question: asks what formula/step to use.
- conceptual_question: asks why an idea works or fails.
- contrast_question: asks the difference between two cases or when one method does vs does not apply.
- transfer_question: asks whether the idea works in a new situation.
- metacognitive_question: asks how to notice, remember, or catch the mistake next time.
- explanation_attempt: answers Cora by explaining the corrected idea in their own words.
- transfer_application: applies the corrected idea to a new/similar situation.
- memory_rule: states a future-facing rule or check they will remember next time.

Give more progress for turns that reveal boundaries, transfer, self-monitoring, or a useful memory rule.
Do not over-reward "what is the answer" questions or copied lesson text.
If this is a Cora-prompt response, evaluate whether the student actually answered the prompt.
Answer briefly, then ask the student for the next smallest proof of understanding.

Return ONLY a JSON object with this exact shape:
{
  "depth": "one of: ${QUESTION_DEPTHS.join(" | ")}",
  "understandingDelta": 0,
  "feedbackToStudent": "a short response that answers or validates the question without giving away too much",
  "nextPrompt": "a short follow-up prompt that asks the student to prove or deepen understanding",
  "evidence": "why this question is evidence of the selected understanding depth"
}

understandingDelta is a number 0-22: shallow turns are 3-6; procedural 7-10; conceptual/explanation 11-16; transfer, memory, and metacognitive proof 16-22.`;
}

function normalizeQuestionEvaluation(raw: any) {
  const depth = QUESTION_DEPTHS.includes(raw?.depth) ? raw.depth : "surface_confusion";
  return {
    depth,
    understandingDelta: Math.max(
      0,
      Math.min(22, Math.round(Number(raw?.understandingDelta) || 0)),
    ),
    feedbackToStudent:
      cleanString(raw?.feedbackToStudent) ||
      "Good question. Let's use it to make your understanding sharper.",
    nextPrompt:
      cleanString(raw?.nextPrompt) || "Try saying the rule in your own words.",
    evidence:
      cleanString(raw?.evidence) ||
      "The student asked a question during the reasoning conversation.",
  };
}

async function evaluateStudentQuestion(ctx: any, input: any): Promise<Response> {
  const question = String(input?.question ?? "").trim();
  const problem = input?.problem;
  const diagnosis = input?.diagnosis;
  const currentUnderstanding = Number(input?.currentUnderstanding ?? 0);
  const mode = cleanString(input?.mode) || "student_question";
  const prompt = cleanString(input?.prompt);

  if (!problem?.statement) {
    throw httpError(400, "Missing problem prompt.");
  }
  if (!question || question.length < 4) {
    throw httpError(400, "Question is too short to evaluate.");
  }

  const raw = await chat(
    ctx,
    [
      { role: "system", content: QUESTION_EVALUATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: questionEvaluationPrompt({
          problem,
          diagnosis,
          question,
          currentUnderstanding,
          mode,
          prompt,
        }),
      },
    ],
    { model: ctx.env.MODEL || DEFAULT_REASONING_MODEL, maxTokens: 900, temperature: 0.1 },
  );

  return json(200, normalizeQuestionEvaluation(extractJson(raw)));
}

/* ------------------------------------------------------------------ */
/* Route: concept-brief                                                */
/* ------------------------------------------------------------------ */

function normalizeStringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => cleanString(v))
    .filter((v) => v.length > 0)
    .slice(0, max);
}

// Per-isolate cache only (isolates don't share memory, but repeat opens of
// the same concept chat within one warm isolate skip the LLM round-trip).
const conceptBriefCache = new Map<string, unknown>();

function conceptBriefPrompt(args: {
  label: string;
  courseTitle: string;
  subject: string;
  problemTitles: string[];
  problemStatements: string[];
}): string {
  return `Create a grounded concept brief for a student knowledge-graph node.

Concept: ${args.label}
Course: ${args.courseTitle}
Subject: ${args.subject}
Homework titles: ${args.problemTitles.join("; ") || "none provided"}
Homework prompts: ${args.problemStatements.join("\n---\n") || "none provided"}

Rules:
- Explain the concept in language appropriate for the supplied homework.
- Connect key ideas to the actual assignments without solving them outright.
- Identify likely misconceptions that are supported by the course context.
- Do not invent citations, lecture titles, or claims not supported by the supplied context.
- Keep the overview under 120 words and each list item concise.
- End with one active-recall study prompt.

Return ONLY a JSON object: {"title": string, "overview": string, "keyIdeas": string[] (max 5), "commonMisconceptions": string[] (max 4), "studyPrompt": string}. No markdown fences, no commentary.`;
}

async function createConceptBrief(ctx: any, input: any): Promise<Response> {
  const conceptId = cleanId(input?.conceptId) || "concept";
  const label = cleanString(input?.label) || conceptId;
  const courseTitle = cleanString(input?.courseTitle) || "this course";
  const subject = cleanString(input?.subject) || courseTitle;
  const problemTitles = normalizeStringList(input?.problemTitles, 12);
  const problemStatements = normalizeStringList(input?.problemStatements, 8).map(
    (statement) => statement.slice(0, 700),
  );

  const cacheKey = `${courseTitle}:${conceptId}:${label}`.toLowerCase();
  const cached = conceptBriefCache.get(cacheKey);
  if (cached) return json(200, cached);

  const raw = await chat(
    ctx,
    [
      {
        role: "system",
        content:
          "You create concise, student-friendly concept briefs grounded in the learner's actual coursework. Respond with strict JSON only.",
      },
      {
        role: "user",
        content: conceptBriefPrompt({
          label,
          courseTitle,
          subject,
          problemTitles,
          problemStatements,
        }),
      },
    ],
    { model: ctx.env.MODEL || DEFAULT_REASONING_MODEL, maxTokens: 1200, temperature: 0.2 },
  );
  const generated = extractJson(raw);

  const brief = {
    conceptId,
    title: cleanString(generated?.title) || label,
    overview:
      cleanString(generated?.overview) || `${label} is part of ${courseTitle}.`,
    keyIdeas: normalizeStringList(generated?.keyIdeas, 5),
    commonMisconceptions: normalizeStringList(generated?.commonMisconceptions, 4),
    studyPrompt:
      cleanString(generated?.studyPrompt) ||
      `Explain ${label} using one of your homework problems.`,
    // Tavily grounding is dev-server-only; the deployed brief is model-only.
    sources: [],
    grounding: "model_only",
  };
  conceptBriefCache.set(cacheKey, brief);
  return json(200, brief);
}

/* ------------------------------------------------------------------ */
/* Route: sessions                                                     */
/* ------------------------------------------------------------------ */

async function recordSession(ctx: any, body: any): Promise<Response> {
  await ctx.db.query("INSERT INTO cortex_sessions (data) VALUES ($1::jsonb)", [
    JSON.stringify({ ...(body ?? {}), recordedAt: new Date().toISOString() }),
  ]);
  return json(200, { ok: true });
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

function resolveRoute(req: Request): string {
  const url = new URL(req.url);
  const q = cleanString(url.searchParams.get("path"));
  if (q) return q;
  const h = cleanString(req.headers.get("x-cortex-path"));
  if (h) return h;
  // Future-proofing: honor subpaths if the platform ever forwards them.
  const m = url.pathname.match(/\/fn\/[^/]+(\/.+)$/);
  if (m) return m[1];
  return "/";
}

const RATE_LIMITED_ROUTES = new Set([
  "/api/analyze",
  "/api/evaluate-question",
  "/api/homeworks/import-pdf",
  "/api/concept-brief",
]);

export default async function handler(req: Request, ctx: any): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const route = resolveRoute(req);
  try {
    if (RATE_LIMITED_ROUTES.has(route) && (await rateLimited(req, ctx))) {
      return json(429, { error: "Too many requests. Please slow down and try again in a minute." }, { "Retry-After": "60" });
    }

    if (req.method === "GET" && (route === "/health" || route === "/")) {
      return json(200, {
        ok: true,
        reasoningModel: ctx.env.MODEL || DEFAULT_REASONING_MODEL,
        extractionModel: ctx.env.EXTRACTION_MODEL || DEFAULT_EXTRACTION_MODEL,
        hasGatewayKey: Boolean(ctx.env.AI_GATEWAY_KEY),
      });
    }
    if (req.method === "GET" && route === "/api/courses") {
      return await listCourses(ctx);
    }
    if (req.method === "POST" && route === "/api/courses") {
      return await createCourse(ctx, await req.json().catch(() => ({})));
    }
    if (req.method === "POST" && route === "/api/homeworks/import-pdf") {
      return await importHomeworkPdf(ctx, req);
    }
    if (req.method === "POST" && route === "/api/analyze") {
      return await analyzeReasoning(ctx, await req.json().catch(() => ({})));
    }
    if (req.method === "POST" && route === "/api/evaluate-question") {
      return await evaluateStudentQuestion(ctx, await req.json().catch(() => ({})));
    }
    if (req.method === "POST" && route === "/api/concept-brief") {
      return await createConceptBrief(ctx, await req.json().catch(() => ({})));
    }
    if (req.method === "POST" && route === "/api/sessions") {
      return await recordSession(ctx, await req.json().catch(() => ({})));
    }

    return json(404, { error: `Not found: ${req.method} ${route}` });
  } catch (err: any) {
    const status = Number(err?.statusCode) || 500;
    console.error(`api ${req.method} ${route}: ${err?.message ?? err}`);
    return json(status, { error: err instanceof Error ? err.message : "Unexpected API error" });
  }
}
