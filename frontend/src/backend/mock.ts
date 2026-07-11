import type { DataProvider } from "./provider";
import type {
  Course,
  HomeworkLibrary,
  UnderstandingDepth,
} from "../scenarios/types";
import {
  DIAGNOSES,
  PROBLEMS,
  SEEDED_LIBRARY,
  mergeHomeworkLibrary,
} from "../scenarios/homework";
import { getCustomProblem, isCustomProblem } from "../scenarios/custom";
import {
  loadCreatedCourses,
  makeCourse,
  saveCreatedCourses,
} from "./courseStore";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function classifyQuestion(question: string): {
  depth: UnderstandingDepth;
  understandingDelta: number;
} {
  const q = question.toLowerCase();
  if (/\bwhen\b.*\b(work|use|average|divide|multiply)|\bwhat if\b/.test(q)) {
    return { depth: "transfer_question", understandingDelta: 16 };
  }
  if (/\bhow do i know\b|\bnotice\b|\bcatch\b|\bremember\b/.test(q)) {
    return { depth: "metacognitive_question", understandingDelta: 18 };
  }
  if (/\bwhy\b|\bhow come\b|\bdoesn't\b|\bcannot\b|\bcan't\b/.test(q)) {
    return { depth: "conceptual_question", understandingDelta: 14 };
  }
  if (/\bvs\b|\bdifference\b|\binstead\b|\bcompare\b/.test(q)) {
    return { depth: "contrast_question", understandingDelta: 15 };
  }
  if (/\bformula\b|\bdivide\b|\bmultiply\b|\bsteps?\b/.test(q)) {
    return { depth: "procedural_question", understandingDelta: 9 };
  }
  return { depth: "surface_confusion", understandingDelta: 5 };
}

function classifyTurn({
  question,
  mode,
  prompt,
}: {
  question: string;
  mode?: string;
  prompt?: string;
}) {
  if (mode !== "cora_prompt_response") return classifyQuestion(question);

  const text = `${prompt ?? ""} ${question}`.toLowerCase();
  if (/\bnext time\b|\bremember\b|\bcheck\b|\brule\b|\bfuture\b/.test(text)) {
    return { depth: "memory_rule" as const, understandingDelta: 17 };
  }
  if (/\bnew\b|\bsimilar\b|\banother\b|\bwhat if\b|\bstill\b/.test(text)) {
    return { depth: "transfer_application" as const, understandingDelta: 20 };
  }
  if (question.trim().split(/\s+/).length >= 8) {
    return { depth: "explanation_attempt" as const, understandingDelta: 13 };
  }
  return { depth: "surface_confusion" as const, understandingDelta: 5 };
}

/**
 * Seeded provider that makes the demo bulletproof on stage.
 * The live adapter (live.ts) falls back to this on any failure.
 *
 * Courses the student creates are persisted to localStorage so the folder
 * structure survives reloads even without a live API. Custom problems also
 * resolve from localStorage, but they have no seeded diagnosis.
 */
let createdCourses = loadCreatedCourses();

function library(): HomeworkLibrary {
  return mergeHomeworkLibrary(SEEDED_LIBRARY, {
    courses: createdCourses,
    homeworks: [],
    problems: {},
  });
}

export const mockProvider: DataProvider = {
  async getHomeworkLibrary() {
    return library();
  },
  async listCourses() {
    return library().courses;
  },
  async createCourse(input) {
    const course = makeCourse(input);
    createdCourses = [...createdCourses, course];
    saveCreatedCourses(createdCourses);
    return course;
  },
  async listHomeworks() {
    return library().homeworks;
  },
  async getProblem(problemId) {
    const p = isCustomProblem(problemId)
      ? getCustomProblem(problemId)
      : PROBLEMS[problemId];
    if (!p) throw new Error(`Unknown problem: ${problemId}`);
    return p;
  },
  async importHomeworkPdf() {
    throw new Error(
      "PDF import needs a live API. Set VITE_CORTEX_API_URL and run the Cortex API server.",
    );
  },
  async analyzeReasoning(problemId) {
    await delay(1400); // long enough that "Cora is reading" feels real
    const d = DIAGNOSES[problemId];
    if (!d) throw new Error(`No seeded diagnosis for: ${problemId}`);
    return d;
  },
  async evaluateStudentQuestion({ question, mode, prompt }) {
    await delay(450);
    const { depth, understandingDelta } = classifyTurn({ question, mode, prompt });
    const strong =
      depth === "conceptual_question" ||
      depth === "contrast_question" ||
      depth === "transfer_question" ||
      depth === "metacognitive_question" ||
      depth === "explanation_attempt" ||
      depth === "transfer_application" ||
      depth === "memory_rule";
    return {
      depth,
      understandingDelta,
      feedbackToStudent: strong
        ? "That gives me evidence your brain is building the idea, not just copying a step."
        : "Good start. Add a why, when, or next-time check so the idea sticks.",
      nextPrompt:
        depth === "surface_confusion"
          ? "What part feels foggy: the numbers, the operation, or the idea?"
          : "Try explaining the rule in your own words before moving on.",
      evidence: `Student asked: "${question}"`,
    };
  },
  async recordLearningSession(topic, summary, score) {
    console.info("[everos-mock] record_learning_session", {
      topic,
      summary,
      score,
    });
  },
};

// Re-export so tests/other providers can share the seed course helpers.
export type { Course };
