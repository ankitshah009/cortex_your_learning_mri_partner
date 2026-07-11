import { useSyncExternalStore } from "react";
import type { Diagnosis } from "../../scenarios/types";
import { backend } from "../../backend";

/**
 * Judge-mode capture layer.
 *
 * The live Diagnosis lives in SolvePage local state, which judge mode must
 * not touch. Instead we tap the one seam every diagnosis flows through —
 * backend.analyzeReasoning — and mirror the latest result here.
 */
export interface JudgeCapture {
  diagnosis: Diagnosis;
  /** Raw student reasoning that produced this diagnosis */
  reasoning: string;
  capturedAt: number;
}

let latest: JudgeCapture | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useJudgeCapture(): JudgeCapture | null {
  return useSyncExternalStore(subscribe, () => latest);
}

// Install the tap exactly once, at module load. The wrapped method is
// behavior-identical: same args in, same promise out.
const original = backend.analyzeReasoning.bind(backend);
backend.analyzeReasoning = async (problemId: string, reasoning: string) => {
  const diagnosis = await original(problemId, reasoning);
  latest = { diagnosis, reasoning, capturedAt: Date.now() };
  emit();
  return diagnosis;
};
