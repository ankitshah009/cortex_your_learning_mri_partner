import type { Diagnosis } from "../scenarios/types";
import type { DataProvider } from "./provider";
import { mockProvider } from "./mock";

/**
 * Live adapter: POSTs the student's reasoning to a real analyze endpoint
 * (a Butterbase serverless function wrapping the LLM + EverOS).
 *
 * Expected contract:
 *   POST {url}  body: { problemId, reasoning }
 *   response: a Diagnosis JSON (see scenarios/types.ts)
 *
 * Any failure (network, timeout, bad shape) silently falls back to the
 * seeded diagnosis so a live demo can never stall.
 */
export function makeLiveProvider(analyzeUrl: string): DataProvider {
  return {
    ...mockProvider,
    async analyzeReasoning(problemId, reasoning): Promise<Diagnosis> {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 9000);
        const res = await fetch(analyzeUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ problemId, reasoning }),
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
        return mockProvider.analyzeReasoning(problemId, reasoning);
      }
    },
  };
}
