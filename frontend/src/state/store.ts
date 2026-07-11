import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Completions, Outcome } from "../scenarios/homework";

export interface Profile {
  name: string;
  avatar: string;
}

interface AppState {
  profile: Profile | null;
  /** problemId -> how it was finished ("repaired" a mix-up or "solid" first try) */
  completedProblems: Completions;
  setProfile: (p: Profile) => void;
  markCompleted: (problemId: string, outcome: Outcome) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      completedProblems: {},
      setProfile: (profile) => set({ profile }),
      markCompleted: (problemId, outcome) =>
        set((s) => ({
          completedProblems: { ...s.completedProblems, [problemId]: outcome },
        })),
    }),
    { name: "cortex-app" },
  ),
);
