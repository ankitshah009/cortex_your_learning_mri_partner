import type { DataProvider } from "./provider";
import { DIAGNOSES, HOMEWORKS, PROBLEMS } from "../scenarios/homework";
import { getCustomProblem, isCustomProblem } from "../scenarios/custom";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Seeded provider that makes the demo bulletproof on stage.
 * The live adapter (live.ts) falls back to this on any failure.
 * Custom problems resolve from localStorage; they have no seeded
 * diagnosis, so analyzing one without a live backend throws and the
 * UI shows its retry state instead of faking a result.
 */
export const mockProvider: DataProvider = {
  async listHomeworks() {
    return HOMEWORKS;
  },
  async getProblem(problemId) {
    const p = isCustomProblem(problemId)
      ? getCustomProblem(problemId)
      : PROBLEMS[problemId];
    if (!p) throw new Error(`Unknown problem: ${problemId}`);
    return p;
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
