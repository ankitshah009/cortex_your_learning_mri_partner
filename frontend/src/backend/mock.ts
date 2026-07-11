import type { DataProvider } from "./provider";
import type { Course, HomeworkLibrary } from "../scenarios/types";
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
