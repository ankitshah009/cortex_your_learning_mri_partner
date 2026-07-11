import type { Problem } from "./types";

/**
 * Custom problems: anything a student types in themselves. Stored in
 * localStorage so a refresh mid-scan doesn't lose the problem, and so
 * the seeded PROBLEMS registry stays untouched.
 */
const KEY = "cortex-custom-problems";
export const CUSTOM_PREFIX = "custom-";

type CustomStore = Record<string, Problem>;

function load(): CustomStore {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as CustomStore;
  } catch {
    return {};
  }
}

export function isCustomProblem(problemId: string): boolean {
  return problemId.startsWith(CUSTOM_PREFIX);
}

export function getCustomProblem(problemId: string): Problem | undefined {
  return load()[problemId];
}

export function saveCustomProblem(input: {
  title: string;
  statement: string;
  sampleReasoning: string;
}): Problem {
  const problem: Problem = {
    id: `${CUSTOM_PREFIX}${Date.now()}`,
    conceptId: "custom",
    title: input.title.trim() || "My own problem",
    emoji: "✏️",
    statement: input.statement.trim(),
    sampleReasoning: input.sampleReasoning.trim(),
  };
  const store = load();
  store[problem.id] = problem;
  localStorage.setItem(KEY, JSON.stringify(store));
  return problem;
}
