import type { Diagnosis, Homework, Problem } from "../scenarios/types";

/**
 * The seam between the UI and the real backend.
 * The UI only ever talks to a DataProvider, so the demo runs on the mock
 * and Butterbase / EverOS adapters can be swapped in without UI changes.
 */
export interface DataProvider {
  /** Homework assigned to this student */
  listHomeworks(): Promise<Homework[]>;
  getProblem(problemId: string): Promise<Problem>;
  /** Observe + Map + Detect + Hypothesize: reasoning text in, diagnosis out */
  analyzeReasoning(problemId: string, reasoning: string): Promise<Diagnosis>;
  /** EverOS: record the repaired session so the brain map grows */
  recordLearningSession(
    topic: string,
    summary: string,
    score: number,
  ): Promise<void>;
}
