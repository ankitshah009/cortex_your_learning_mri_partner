import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Profile {
  name: string;
  avatar: string;
}

interface AppState {
  profile: Profile | null;
  repairedScenarios: string[];
  setProfile: (p: Profile) => void;
  markRepaired: (scenarioId: string) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      repairedScenarios: [],
      setProfile: (profile) => set({ profile }),
      markRepaired: (id) =>
        set((s) =>
          s.repairedScenarios.includes(id)
            ? {}
            : { repairedScenarios: [...s.repairedScenarios, id] },
        ),
    }),
    { name: "cortex-app" },
  ),
);
