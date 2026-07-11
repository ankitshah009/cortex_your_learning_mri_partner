import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Completions, Outcome } from "../scenarios/homework";
import type {
  BrainCheckRecord,
  UnderstandingSignal,
} from "../scenarios/types";

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
  brainCheckHistory: BrainCheckRecord[];
  resetLearningProgress: () => void;
  setProfile: (p: Profile) => void;
  markCompleted: (problemId: string, outcome: Outcome) => void;
  addUnderstandingSignal: (
    problemId: string,
    signal: Omit<UnderstandingSignal, "id" | "problemId" | "createdAt">,
  ) => void;
  recordBrainCheck: (record: BrainCheckRecord) => void;
}

export interface UnderstandingState {
  score: number;
  /** Score when this problem first entered the recorded learning loop. */
  baselineScore?: number;
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
      brainCheckHistory: [],
      resetLearningProgress: () =>
        set({
          completedProblems: {},
          understandingByProblem: {},
          brainCheckHistory: [],
        }),
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
                baselineScore: current.baselineScore ?? current.score,
                signals: [...current.signals, fullSignal].slice(-12),
              },
            },
          };
        }),
      recordBrainCheck: (record) =>
        set((s) => ({
          brainCheckHistory: [record, ...s.brainCheckHistory]
            .filter(
              (item, index, all) =>
                all.findIndex((candidate) => candidate.id === item.id) === index,
            )
            .slice(0, 24),
        })),
    }),
    { name: "cortex-app" },
  ),
);
