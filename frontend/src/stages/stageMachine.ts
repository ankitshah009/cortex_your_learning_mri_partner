import { create } from "zustand";

/**
 * The demo spine. Every component renders purely from the current stage,
 * so the whole experience can be driven by buttons, timers, or arrow keys.
 */
export const STAGES = [
  "intro", // problem + reasoning input
  "reading", // Cora reads the submission (analysis runs)
  "mapping", // thought bubbles pop onto the path one by one
  "scanning", // Cora traces the path, edges connect
  "mixupFound", // first divergence wobbles, downstream clouds over
  "hypothesis", // Cora's hunch + memory evidence + confidence
  "probing", // one discriminating question
  "confirmed", // diagnosis confirmed (or revised) + confidence jump
  "lesson", // the smallest possible fix
  "repairing", // wobbly bubble pops into a lightbulb, cascade relights
  "celebrated", // confetti, stats, back to the brain
] as const;

export type Stage = (typeof STAGES)[number];

export type ProbeOutcome = "mixup" | "correct" | "other" | null;

interface StageState {
  stage: Stage;
  probeOutcome: ProbeOutcome;
  next: () => void;
  prev: () => void;
  goTo: (stage: Stage) => void;
  answerProbe: (outcome: Exclude<ProbeOutcome, null>) => void;
  reset: () => void;
}

export const useStage = create<StageState>((set) => ({
  stage: "intro",
  probeOutcome: null,
  next: () =>
    set((s) => {
      const i = STAGES.indexOf(s.stage);
      if (i >= STAGES.length - 1) return {};
      if (s.stage === "repairing") return {};
      const target = STAGES[i + 1];
      // Skipping forward past the probe with arrow keys assumes the
      // misconception answer, so the demo never stalls on stage.
      if (s.stage === "probing" && s.probeOutcome === null) {
        return { stage: target, probeOutcome: "mixup" };
      }
      return { stage: target };
    }),
  prev: () =>
    set((s) => {
      const i = STAGES.indexOf(s.stage);
      return i > 0 ? { stage: STAGES[i - 1] } : {};
    }),
  goTo: (stage) => set({ stage }),
  answerProbe: (outcome) => set({ probeOutcome: outcome, stage: "confirmed" }),
  reset: () => set({ stage: "intro", probeOutcome: null }),
}));

export const stageIndex = (s: Stage) => STAGES.indexOf(s);

export const atOrAfter = (current: Stage, target: Stage) =>
  stageIndex(current) >= stageIndex(target);
