import type { Diagnosis, Homework, Problem } from "./types";
import { rexProblem, rexDiagnosis } from "./average-speed";
import { bikeProblem, bikeDiagnosis } from "./bike-speed";
import { meetProblem, meetDiagnosis } from "./closing-speed";

export type Outcome = "repaired" | "solid";
export type Completions = Record<string, Outcome>;

export const PROBLEMS: Record<string, Problem> = {
  [rexProblem.id]: rexProblem,
  [bikeProblem.id]: bikeProblem,
  [meetProblem.id]: meetProblem,
};

export const DIAGNOSES: Record<string, Diagnosis> = {
  [rexDiagnosis.problemId]: rexDiagnosis,
  [bikeDiagnosis.problemId]: bikeDiagnosis,
  [meetDiagnosis.problemId]: meetDiagnosis,
};

export const HOMEWORKS: Homework[] = [
  {
    id: "hw-motion",
    title: "Motion & Rates Worksheet",
    emoji: "🏁",
    subject: "Math",
    due: "Due Tue, Jul 14",
    problemIds: [rexProblem.id, bikeProblem.id, meetProblem.id],
  },
];

export function getHomework(id: string): Homework | undefined {
  return HOMEWORKS.find((h) => h.id === id);
}

export function homeworkForProblem(problemId: string): Homework | undefined {
  return HOMEWORKS.find((h) => h.problemIds.includes(problemId));
}

/** Position of a problem within its homework, 1-based, for "Problem 2 of 3" */
export function problemPosition(problemId: string) {
  const hw = homeworkForProblem(problemId);
  if (!hw) return null;
  return { index: hw.problemIds.indexOf(problemId) + 1, total: hw.problemIds.length, homework: hw };
}

/** Next unfinished problem after the current one (current counts as done) */
export function nextProblemAfter(
  problemId: string,
  completed: Completions,
): Problem | null {
  const hw = homeworkForProblem(problemId);
  if (!hw) return null;
  const nextId = hw.problemIds.find((id) => id !== problemId && !completed[id]);
  return nextId ? PROBLEMS[nextId] : null;
}

/** First unfinished problem of a homework, for "Continue" buttons */
export function firstUnfinished(hw: Homework, completed: Completions): Problem | null {
  const id = hw.problemIds.find((pid) => !completed[pid]);
  return id ? PROBLEMS[id] : null;
}

export function homeworkProgress(hw: Homework, completed: Completions) {
  const done = hw.problemIds.filter((id) => completed[id]).length;
  return { done, total: hw.problemIds.length };
}

/* ---------- Brain map derivation (the EverOS view) ---------- */

export interface IslandState {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  /** 0..1, drives brightness: how strong this concept region is */
  mastery: number;
  wobbly: boolean;
}

export function islandStates(completed: Completions): IslandState[] {
  const speedDone = ["average-speed", "closing-speed"].filter(
    (id) => completed[id],
  ).length;
  const timeDone = completed["bike-speed"] ? 1 : 0;
  return [
    {
      id: "speed",
      name: "Speed Springs",
      emoji: "⚡",
      x: 170,
      y: 265,
      mastery: Math.min(0.95, 0.45 + speedDone * 0.25),
      wobbly: speedDone < 2,
    },
    {
      id: "time",
      name: "Time Trails",
      emoji: "⏰",
      x: 452,
      y: 150,
      mastery: timeDone ? 0.9 : 0.6,
      wobbly: false,
    },
    {
      id: "fractions",
      name: "Fraction Falls",
      emoji: "🍕",
      x: 720,
      y: 275,
      mastery: 0.62,
      wobbly: false,
    },
  ];
}
