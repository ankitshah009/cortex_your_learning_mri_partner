import type { Diagnosis } from "../scenarios/types";
import type { DataProvider } from "./provider";
import { mockProvider } from "./mock";

/**
 * Live adapter: POSTs the student's reasoning to a real analyze endpoint
 * (a Butterbase serverless function wrapping the LLM + EverOS).
 *
 * Contract (general — works for ANY problem, not just seeded ones):
 *   POST {url}  body: { problemId, problem: { title, statement }, reasoning }
 *   response: a Diagnosis JSON (see scenarios/types.ts)
 *
 * Failures on seeded problems silently fall back to the seeded diagnosis
 * so a live demo can never stall. Custom problems have no seed, so a
 * failure propagates and the UI shows its retry state.
 */
export function makeLiveProvider(analyzeUrl: string): DataProvider {
  return {
    ...mockProvider,
    async analyzeReasoning(problemId, reasoning): Promise<Diagnosis> {
      try {
        const problem = await mockProvider.getProblem(problemId);
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 20000);
        const res = await fetch(analyzeUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            problemId,
            problem: { title: problem.title, statement: problem.statement },
            reasoning,
          }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`analyze returned ${res.status}`);
        const data = (await res.json()) as Diagnosis;
        if (!Array.isArray(data.steps) || data.steps.length === 0) {
          throw new Error("diagnosis missing steps");
        }
        return { ...data, problemId };
      } catch (err) {
        console.warn("[live] analyze failed, using seeded diagnosis", err);
        // No seed exists for custom problems: this rethrows to the UI.
        return mockProvider.analyzeReasoning(problemId, reasoning);
      }
    },
  };
}
