import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

loadLocalEnv();

const PORT = Number(process.env.CORTEX_API_PORT ?? 8787);
const REASONING_MODEL =
  process.env.CORTEX_REASONING_MODEL ??
  process.env.CORTEX_MODEL ??
  "claude-haiku-4-5";
const EXTRACTION_MODEL =
  process.env.CORTEX_EXTRACTION_MODEL ??
  process.env.CORTEX_MODEL ??
  REASONING_MODEL;
const MAX_PDF_BYTES = 12 * 1024 * 1024;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const importedProblems = new Map();
const importedHomeworks = new Map();
const courses = new Map();
const sessions = [];

const COURSE_COLORS = ["lav", "teal", "coral", "sky", "gold"];

const corsHeaders = {
  "access-control-allow-origin": process.env.CORTEX_ALLOWED_ORIGIN ?? "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      return send(res, 204, "");
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, {
        ok: true,
        reasoningModel: REASONING_MODEL,
        extractionModel: EXTRACTION_MODEL,
      });
    }

    if (req.method === "GET" && url.pathname === "/api/courses") {
      return sendJson(res, 200, [...courses.values()]);
    }

    if (req.method === "POST" && url.pathname === "/api/courses") {
      return sendJson(res, 200, createCourse(await readJson(req)));
    }

    if (req.method === "POST" && url.pathname === "/api/homeworks/import-pdf") {
      return sendJson(res, 200, await importHomeworkPdf(req));
    }

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      return sendJson(res, 200, await analyzeReasoning(await readJson(req)));
    }

    if (req.method === "POST" && url.pathname === "/api/sessions") {
      sessions.push({ ...(await readJson(req)), recordedAt: new Date().toISOString() });
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    const status = err?.statusCode ?? 500;
    return sendJson(res, status, {
      error: err instanceof Error ? err.message : "Unexpected API error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Cortex API listening on http://localhost:${PORT}`);
  console.log(`Using reasoning model ${REASONING_MODEL}`);
  console.log(`Using extraction model ${EXTRACTION_MODEL}`);
});

function createCourse(input) {
  const title = cleanString(input?.title) || "New Course";
  const course = {
    id: `course-${slugify(title)}-${Date.now().toString(36)}`,
    title,
    emoji: cleanString(input?.emoji) || "📁",
    color: COURSE_COLORS.includes(input?.color)
      ? input.color
      : COURSE_COLORS[courses.size % COURSE_COLORS.length],
    subject: cleanString(input?.subject) || title,
    homeworkIds: [],
    createdAt: new Date().toISOString(),
    source: "created",
  };
  courses.set(course.id, course);
  return course;
}

async function importHomeworkPdf(req) {
  requireApiKey();
  const request = await toWebRequest(req);
  const form = await request.formData();
  const file = form.get("file");
  const courseId = cleanString(form.get("courseId")) || undefined;

  if (!file || typeof file === "string") {
    throw httpError(400, "Expected a PDF file field named 'file'.");
  }
  if (file.type && file.type !== "application/pdf") {
    throw httpError(400, "Please upload a PDF file.");
  }
  if (file.size > MAX_PDF_BYTES) {
    throw httpError(413, "PDF is too large for this dev importer.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extracted = await extractQuestionsFromPdf(bytes, file.name || "homework.pdf");
  const now = new Date().toISOString();
  const homeworkId = `pdf-${slugify(file.name || "homework")}-${Date.now().toString(36)}`;

  const problems = extracted.questions.slice(0, 12).map((q, index) => {
    const problemId = `${homeworkId}-q${index + 1}`;
    return {
      id: problemId,
      conceptId: q.conceptId || "math",
      title: q.title || `Problem ${q.number || index + 1}`,
      emoji: q.emoji || "📄",
      statement: q.statement,
      sampleReasoning: q.sampleReasoning || "",
      source: "pdf",
      sourceLabel: file.name || "Uploaded PDF",
    };
  });

  if (problems.length === 0) {
    throw httpError(422, "No homework questions were found in that PDF.");
  }

  const homework = {
    id: homeworkId,
    title: extracted.title || stripPdfExtension(file.name) || "Imported Homework",
    emoji: "📄",
    subject: extracted.subject || "Homework",
    due: "Imported today",
    problemIds: problems.map((p) => p.id),
    courseId,
    source: "pdf",
    sourceFileName: file.name || "homework.pdf",
    importedAt: now,
  };

  importedHomeworks.set(homework.id, homework);
  for (const problem of problems) importedProblems.set(problem.id, problem);

  // File the homework into its course so the folder structure grows server-side.
  if (courseId && courses.has(courseId)) {
    const course = courses.get(courseId);
    if (!course.homeworkIds.includes(homework.id)) {
      course.homeworkIds.push(homework.id);
    }
  }

  return { homework, problems, courseId };
}

async function analyzeReasoning(input) {
  requireApiKey();
  const problem = input.problem ?? importedProblems.get(input.problemId);
  const reasoning = String(input.reasoning ?? "").trim();

  if (!problem?.statement) {
    throw httpError(400, "Missing problem prompt.");
  }
  if (reasoning.length < 10) {
    throw httpError(400, "Reasoning is too short to analyze.");
  }

  const diagnosis = await askClaudeTool({
    model: REASONING_MODEL,
    max_tokens: 2400,
    system: DIAGNOSIS_SYSTEM_PROMPT,
    tool: DIAGNOSIS_TOOL,
    messages: [
      {
        role: "user",
        content: diagnosisPrompt(problem, reasoning),
      },
    ],
  });
  return normalizeDiagnosis(problem.id, diagnosis);
}

async function extractQuestionsFromPdf(pdfBytes, fileName) {
  const data = await askClaudeTool({
    model: EXTRACTION_MODEL,
    max_tokens: 2400,
    system: EXTRACTION_SYSTEM_PROMPT,
    tool: EXTRACTION_TOOL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBytes.toString("base64"),
            },
            title: fileName,
          },
          {
            type: "text",
            text: extractionPrompt(fileName),
          },
        ],
      },
    ],
  });
  if (!Array.isArray(data.questions)) {
    throw httpError(422, "The model did not return a question list.");
  }
  return {
    title: cleanString(data.title),
    subject: cleanString(data.subject),
    questions: data.questions
      .map((q, index) => ({
        number: cleanString(q.number) || String(index + 1),
        title: cleanString(q.title) || `Problem ${index + 1}`,
        emoji: cleanString(q.emoji) || "📄",
        conceptId: cleanConcept(q.conceptId),
        statement: cleanString(q.statement),
        sampleReasoning: cleanString(q.sampleReasoning),
      }))
      .filter((q) => q.statement.length > 0),
  };
}

async function askClaudeTool({ model, tool, ...params }) {
  const message = await anthropic.messages.create({
    model,
    temperature: 0.1,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    ...params,
  });

  const toolUse = message.content.find(
    (block) => block.type === "tool_use" && block.name === tool.name,
  );
  if (!toolUse) {
    throw httpError(422, `The model did not call ${tool.name}.`);
  }
  return toolUse.input;
}

function normalizeDiagnosis(problemId, raw) {
  const steps = Array.isArray(raw.steps) ? raw.steps.slice(0, 6) : [];
  if (steps.length === 0) {
    throw httpError(422, "The model did not return reasoning steps.");
  }

  const normalizedSteps = steps.map((step, index) => ({
    id: cleanId(step.id) || `step-${index + 1}`,
    kind: ["claim", "mystery", "operation", "conclusion"].includes(step.kind)
      ? step.kind
      : index === steps.length - 1
        ? "conclusion"
        : "claim",
    label: cleanString(step.label).slice(0, 110),
    caption: cleanString(step.caption).slice(0, 60) || "your words",
    inferred: Boolean(step.inferred),
  }));

  const stepIds = new Set(normalizedSteps.map((step) => step.id));
  const answerStatus = cleanString(raw.answerStatus);
  const mixup =
    answerStatus === "correct" || !raw.mixup
      ? null
      : normalizeMixup(raw.mixup, normalizedSteps, stepIds);

  return {
    problemId,
    steps: normalizedSteps,
    mixup,
    celebration: {
      headline: cleanString(raw.celebration?.headline) || "Brain scan complete!",
      sub:
        cleanString(raw.celebration?.sub) ||
        (mixup
          ? "You found the first wobbly step and repaired it."
          : "Your reasoning path is solid."),
    },
  };
}

function normalizeMixup(raw, steps, stepIds) {
  const fallbackStepId = steps.find((step) => step.inferred)?.id ?? steps[0].id;
  const stepId = stepIds.has(raw.stepId) ? raw.stepId : fallbackStepId;
  const downstreamIds = Array.isArray(raw.downstreamIds)
    ? raw.downstreamIds.filter((id) => stepIds.has(id) && id !== stepId)
    : steps.slice(steps.findIndex((step) => step.id === stepId) + 1).map((step) => step.id);

  const options = Array.isArray(raw.probe?.options) ? raw.probe.options : [];

  return {
    stepId,
    downstreamIds,
    hypothesis: {
      name: cleanString(raw.hypothesis?.name) || "The Hidden-Step Mix-up",
      kidExplanation:
        cleanString(raw.hypothesis?.kidExplanation) ||
        "Your brain may have used one hidden idea that needs a quick check.",
      confidenceBefore: clampPercent(raw.hypothesis?.confidenceBefore, 65),
      confidenceAfter: clampPercent(raw.hypothesis?.confidenceAfter, 90),
      confidenceIfCorrect: clampPercent(raw.hypothesis?.confidenceIfCorrect, 72),
    },
    confirmLine:
      cleanString(raw.confirmLine) ||
      "That first wobbly step changed the rest of the path.",
    memoryEvidence:
      cleanString(raw.memoryEvidence) ||
      "This looks like a pattern worth checking carefully.",
    probe: {
      question:
        cleanString(raw.probe?.question) ||
        "Which one step would you check first to make this answer stronger?",
      options: normalizeProbeOptions(options),
    },
    lesson: {
      title: cleanString(raw.lesson?.title) || "Tiny fix",
      steps: Array.isArray(raw.lesson?.steps)
        ? raw.lesson.steps.map(cleanString).filter(Boolean).slice(0, 4)
        : ["Return to the first unsupported step.", "Replace it with a checked fact.", "Redo the answer from there."],
    },
    fixedLabels:
      raw.fixedLabels && typeof raw.fixedLabels === "object"
        ? Object.fromEntries(
            Object.entries(raw.fixedLabels)
              .filter(([id]) => stepIds.has(id))
              .map(([id, label]) => [id, cleanString(label).slice(0, 110)]),
          )
        : {},
  };
}

function normalizeProbeOptions(options) {
  const normalized = options
    .map((option, index) => ({
      id: cleanId(option.id) || `opt-${index + 1}`,
      label: cleanString(option.label).slice(0, 80),
      kind: ["mixup", "correct", "other"].includes(option.kind)
        ? option.kind
        : "other",
    }))
    .filter((option) => option.label);

  if (normalized.some((option) => option.kind === "correct")) return normalized.slice(0, 4);

  return [
    ...normalized.slice(0, 2),
    { id: "opt-check", label: "I would check the hidden step first", kind: "correct" },
  ];
}

const EXTRACTION_TOOL = {
  name: "submit_extracted_homework",
  description:
    "Submit the real student-facing homework questions extracted from the PDF.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "subject", "questions"],
    properties: {
      title: { type: "string", description: "Short worksheet title." },
      subject: {
        type: "string",
        description: "Subject such as Math, Science, or Reading.",
      },
      questions: {
        type: "array",
        minItems: 1,
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "number",
            "title",
            "emoji",
            "conceptId",
            "statement",
            "sampleReasoning",
          ],
          properties: {
            number: { type: "string" },
            title: { type: "string" },
            emoji: { type: "string" },
            conceptId: {
              type: "string",
              description:
                "A short lowercase concept slug this question mainly practices, e.g. 'eigenvalue', 'diagonalization', 'fractions'. Reuse the SAME slug across every question that drills the same concept so related questions link together in the knowledge graph. Prefer a small set of 3-6 shared concepts for the whole worksheet over a unique id per question.",
            },
            statement: {
              type: "string",
              description:
                "Full question text exactly as the student should solve it.",
            },
            sampleReasoning: {
              type: "string",
              description:
                "Optional prefill; use an empty string unless student reasoning is present.",
            },
          },
        },
      },
    },
  },
};

const DIAGNOSIS_TOOL = {
  name: "submit_reasoning_diagnosis",
  description:
    "Submit a structured diagnosis for the learner's reasoning path.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["problemId", "answerStatus", "steps", "mixup", "celebration"],
    properties: {
      problemId: { type: "string" },
      answerStatus: {
        type: "string",
        enum: ["correct", "incorrect", "uncertain"],
        description:
          "Whether the learner's final answer and reasoning are mathematically correct.",
      },
      steps: {
        type: "array",
        minItems: 2,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "kind", "label", "caption", "inferred"],
          properties: {
            id: { type: "string" },
            kind: {
              type: "string",
              enum: ["claim", "mystery", "operation", "conclusion"],
            },
            label: { type: "string" },
            caption: { type: "string" },
            inferred: { type: "boolean" },
          },
        },
      },
      mixup: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: [
              "stepId",
              "downstreamIds",
              "hypothesis",
              "confirmLine",
              "memoryEvidence",
              "probe",
              "lesson",
              "fixedLabels",
            ],
            properties: {
              stepId: { type: "string" },
              downstreamIds: {
                type: "array",
                items: { type: "string" },
              },
              hypothesis: {
                type: "object",
                additionalProperties: false,
                required: [
                  "name",
                  "kidExplanation",
                  "confidenceBefore",
                  "confidenceAfter",
                  "confidenceIfCorrect",
                ],
                properties: {
                  name: { type: "string" },
                  kidExplanation: { type: "string" },
                  confidenceBefore: { type: "number", minimum: 0, maximum: 100 },
                  confidenceAfter: { type: "number", minimum: 0, maximum: 100 },
                  confidenceIfCorrect: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                  },
                },
              },
              confirmLine: { type: "string" },
              memoryEvidence: { type: "string" },
              probe: {
                type: "object",
                additionalProperties: false,
                required: ["question", "options"],
                properties: {
                  question: { type: "string" },
                  options: {
                    type: "array",
                    minItems: 2,
                    maxItems: 4,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["id", "label", "kind"],
                      properties: {
                        id: { type: "string" },
                        label: { type: "string" },
                        kind: {
                          type: "string",
                          enum: ["mixup", "correct", "other"],
                        },
                      },
                    },
                  },
                },
              },
              lesson: {
                type: "object",
                additionalProperties: false,
                required: ["title", "steps"],
                properties: {
                  title: { type: "string" },
                  steps: {
                    type: "array",
                    minItems: 1,
                    maxItems: 4,
                    items: { type: "string" },
                  },
                },
              },
              fixedLabels: {
                type: "object",
                additionalProperties: { type: "string" },
              },
            },
          },
        ],
      },
      celebration: {
        type: "object",
        additionalProperties: false,
        required: ["headline", "sub"],
        properties: {
          headline: { type: "string" },
          sub: { type: "string" },
        },
      },
    },
  },
};

function extractionPrompt(fileName) {
  return `Extract the real student-facing homework questions from ${fileName}.

Call the submit_extracted_homework tool with the extracted worksheet.

Rules:
- Extract actual questions, not instructions, answer keys, standards, headers, or page numbers.
- Keep each statement self-contained, including needed tables or answer choices in text.
- If the PDF has many questions, return the first 12 substantial questions.
- For conceptId, pick from a small shared set of 3-6 concept slugs for the whole worksheet and reuse the same slug on every question that practices that concept, so the student's knowledge graph links related questions together. Do not invent a unique conceptId per question.
- Do not solve the questions.`;
}

const EXTRACTION_SYSTEM_PROMPT =
  "You extract homework problems from PDFs for an educational app. Preserve the real question text, do not invent questions, and respond by calling the provided tool.";

function diagnosisPrompt(problem, reasoning) {
  return `Analyze this learner's reasoning for the homework problem.

Problem title: ${problem.title}
Problem prompt: ${problem.statement}
Learner reasoning: ${reasoning}

Call the submit_reasoning_diagnosis tool with the reasoning diagnosis.

Rules:
- Set answerStatus to "correct", "incorrect", or "uncertain" before deciding mixup.
- Use 2 to 6 reasoning steps.
- Base every step on the learner text or a clearly marked inferred hidden step.
- A mixup must be an actual mathematical or conceptual error that makes the answer wrong.
- If answerStatus is "correct", set "mixup" to null.
- If the learner's reasoning reaches the correct answer with valid steps, answerStatus must be "correct".
- Do not create a mixup just to teach an idea that the learner already used correctly.
- If there is an error, choose the earliest unsupported or wrong step as the mixup step.
- Never insult the learner or diagnose ability.`;
}

const DIAGNOSIS_SYSTEM_PROMPT =
  "You are the diagnostic engine for a kid-friendly homework tutor. You map reasoning, find the earliest divergence, create one diagnostic probe, give a tiny repair lesson, and respond by calling the provided tool.";

async function toWebRequest(req) {
  const body = await readBuffer(req);
  return new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body,
  });
}

async function readJson(req) {
  const body = await readBuffer(req);
  if (!body.length) return {};
  return JSON.parse(body.toString("utf8"));
}

async function readBuffer(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]);
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(text.slice(first, last + 1));
    throw httpError(422, "The model did not return valid JSON.");
  }
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value), {
    "content-type": "application/json; charset=utf-8",
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...corsHeaders, ...headers });
  res.end(body);
}

function requireApiKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw httpError(500, "ANTHROPIC_API_KEY is not set for the Cortex API server.");
  }
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanId(value) {
  return cleanString(value).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
}

function cleanConcept(value) {
  return cleanId(value).toLowerCase() || "math";
}

function clampPercent(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function slugify(value) {
  return stripPdfExtension(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "homework";
}

function stripPdfExtension(value) {
  return cleanString(value).replace(/\.pdf$/i, "");
}

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
