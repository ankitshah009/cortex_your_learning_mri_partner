import { mockProvider } from "./mock";

/**
 * EverOS memory adapter: talks to the EverOS Cloud REST API
 * (https://api.evermind.ai) directly from the browser.
 *
 * API shape mirrors cortex/memory.py (EverOSMemoryManager):
 *   POST /api/v1/memories        { user_id, session_id, messages, async_mode }
 *   POST /api/v1/memories/search { filters: { user_id }, query, method, memory_types, top_k }
 * Auth: Authorization: Bearer <api_key>
 *
 * Any failure (network, timeout, non-2xx, bad JSON) silently falls back
 * to the seeded mock behavior so a live demo can never stall.
 */

const BASE_URL =
  (import.meta.env.VITE_EVEROS_BASE_URL as string | undefined) ??
  "https://api.evermind.ai";

const TIMEOUT_MS = 3000;

/** Evidence pulled from EverOS memory about a topic */
export interface MemoryEvidence {
  topic: string;
  /** Consolidated episodic memories relevant to the topic */
  episodes: unknown[];
  /** Student profile fragments (learning style, preferences) */
  profiles: unknown[];
}

export interface EverosMemory {
  getMemoryEvidence(topic: string): Promise<MemoryEvidence>;
  recordLearningSession(
    topic: string,
    summary: string,
    score: number,
  ): Promise<void>;
}

async function post(
  apiKey: string,
  path: string,
  body: unknown,
): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`everos ${path} returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function makeEverosMemory(
  apiKey: string,
  userId: string,
): EverosMemory {
  const sessionId = `session_${Date.now()}`;

  return {
    async getMemoryEvidence(topic): Promise<MemoryEvidence> {
      try {
        const raw = await post(apiKey, "/api/v1/memories/search", {
          filters: { user_id: userId },
          query: `${topic} learning progress`,
          method: "hybrid",
          top_k: 5,
        });
        const data =
          ((raw as { data?: Record<string, unknown> })?.data ??
            raw ??
            {}) as Record<string, unknown>;
        return {
          topic,
          episodes: Array.isArray(data.episodes) ? data.episodes : [],
          profiles: Array.isArray(data.profiles) ? data.profiles : [],
        };
      } catch (err) {
        console.warn("[everos] search failed, using seeded evidence", err);
        // Mock provider has no memory, so seeded evidence is simply empty.
        console.info("[everos-mock] get_memory_evidence", { topic });
        return { topic, episodes: [], profiles: [] };
      }
    },

    async recordLearningSession(topic, summary, score): Promise<void> {
      try {
        let content = `Learning session: ${topic}. ${summary}`;
        if (score != null) content += ` Score: ${score}/100`;
        await post(apiKey, "/api/v1/memories", {
          user_id: userId,
          session_id: sessionId,
          messages: [
            { role: "user", content, timestamp: Date.now() },
          ],
          async_mode: true,
        });
      } catch (err) {
        console.warn("[everos] record failed, using mock recorder", err);
        return mockProvider.recordLearningSession(topic, summary, score);
      }
    },
  };
}
