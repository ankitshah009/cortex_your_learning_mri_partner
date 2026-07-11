import type { DataProvider } from "./provider";
import { mockProvider } from "./mock";
import { makeLiveProvider } from "./live";
import { makeEverosMemory, type EverosMemory } from "./everos";

// Set VITE_CORTEX_API_URL to enable local PDF import + live diagnosis.
// Example: VITE_CORTEX_API_URL=http://localhost:8787
const apiBaseUrl = import.meta.env.VITE_CORTEX_API_URL as string | undefined;

// Set VITE_ANALYZE_URL to wire a deployed Butterbase analyze endpoint.
const analyzeUrl = import.meta.env.VITE_ANALYZE_URL as string | undefined;

// Set VITE_EVEROS_API_KEY (+ VITE_EVEROS_USER_ID) to store sessions in real
// EverOS memory. Without it, memory calls stay on the seeded mock.
const everosApiKey = import.meta.env.VITE_EVEROS_API_KEY as string | undefined;
const everosUserId =
  (import.meta.env.VITE_EVEROS_USER_ID as string | undefined) ?? "demo_student";

const baseProvider: DataProvider =
  apiBaseUrl || analyzeUrl
    ? makeLiveProvider({ apiBaseUrl, analyzeUrl })
    : mockProvider;

// Real EverOS memory when configured (silently falls back to mock on failure).
export const everosMemory: EverosMemory | undefined = everosApiKey
  ? makeEverosMemory(everosApiKey, everosUserId)
  : undefined;

// analyzeReasoning keeps the live/mock choice; memory methods come from EverOS.
export const backend: DataProvider = everosMemory
  ? {
      ...baseProvider,
      recordLearningSession: (topic, summary, score) =>
        everosMemory.recordLearningSession(topic, summary, score),
    }
  : baseProvider;
