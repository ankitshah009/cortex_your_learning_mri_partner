import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Completions, Outcome } from "../scenarios/homework";
import type { UnderstandingSignal } from "../scenarios/types";

export interface Profile {
  name: string;
  avatar: string;
}

interface AppState {
  profile: Profile | null;
  /** problemId -> how it was finished ("repaired" a mix-up or "solid" first try) */
  completedProblems: Completions;
  /** problemId -> accumulated understanding evidence */
  understandingByProblem: Record<string, UnderstandingState>;
  setProfile: (p: Profile) => void;
  markCompleted: (problemId: string, outcome: Outcome) => void;
  addUnderstandingSignal: (
    problemId: string,
    signal: Omit<UnderstandingSignal, "id" | "problemId" | "createdAt">,
  ) => void;
}

export interface UnderstandingState {
  score: number;
  signals: UnderstandingSignal[];
}

const clampScore = (score: number) => Math.max(0, Math.min(100, score));

const makeSignalId = () =>
  `sig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      completedProblems: {},
      understandingByProblem: {},
      setProfile: (profile) => set({ profile }),
      markCompleted: (problemId, outcome) =>
        set((s) => ({
          completedProblems: { ...s.completedProblems, [problemId]: outcome },
        })),
      addUnderstandingSignal: (problemId, signal) =>
        set((s) => {
          const current = s.understandingByProblem[problemId] ?? {
            score: 0,
            signals: [],
          };
          const passiveAlreadyCounted =
            (signal.kind === "attempt" ||
              (signal.kind === "lesson_reflection" &&
                signal.label === "Studied tiny fix")) &&
            current.signals.some(
              (existing) =>
                existing.kind === signal.kind && existing.label === signal.label,
            );
          const delta = passiveAlreadyCounted ? 0 : signal.delta;
          const fullSignal: UnderstandingSignal = {
            ...signal,
            delta,
            id: makeSignalId(),
            problemId,
            createdAt: new Date().toISOString(),
          };
          return {
            understandingByProblem: {
              ...s.understandingByProblem,
              [problemId]: {
                score: clampScore(current.score + delta),
                signals: [...current.signals, fullSignal].slice(-12),
              },
            },
          };
        }),
    }),
    { name: "cortex-app" },
  ),
);
