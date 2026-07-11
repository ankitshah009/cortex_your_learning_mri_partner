import type { DataProvider } from "./provider";
import { averageSpeed } from "../scenarios/average-speed";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Seeded provider that makes the demo bulletproof on stage.
 * Swap `backend` to the Butterbase adapter once the serverless
 * analyze() endpoint exists; the UI will not change.
 */
export const mockProvider: DataProvider = {
  async analyzeReasoning() {
    await delay(1400); // long enough that "Cora is reading" feels real
    return averageSpeed;
  },
  async getMemoryEvidence() {
    await delay(300);
    return averageSpeed.memoryEvidence;
  },
  async recordLearningSession(topic, summary, score) {
    console.info("[everos-mock] record_learning_session", {
      topic,
      summary,
      score,
    });
  },
};

export const backend: DataProvider = mockProvider;
