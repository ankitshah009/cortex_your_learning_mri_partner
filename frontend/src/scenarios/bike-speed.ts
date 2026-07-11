import type { Problem, Diagnosis } from "./types";

/**
 * The solid-path problem: the student's reasoning is correct, and the scan
 * should celebrate that instead of hunting for a bug that isn't there.
 */
export const bikeProblem: Problem = {
  id: "bike-speed",
  conceptId: "time",
  title: "Mia's Bike Ride",
  emoji: "🚲",
  statement:
    "Mia rides her bike 12 kilometers in 30 minutes. What is her speed in kilometers per hour?",
  sampleReasoning:
    "30 minutes is half an hour. If she rides 12 km in half an hour, she would ride 24 km in a whole hour. So her speed is 24 km/h.",
};

export const bikeDiagnosis: Diagnosis = {
  problemId: "bike-speed",
  steps: [
    {
      id: "step-claim",
      kind: "claim",
      label: "Mia rides 12 km in 30 minutes",
      caption: "what you noticed",
    },
    {
      id: "step-op",
      kind: "operation",
      label: "30 min is half an hour, so double it: 12 × 2",
      caption: "your move",
    },
    {
      id: "step-answer",
      kind: "conclusion",
      label: "Speed = 24 km/h",
      caption: "your answer",
    },
  ],
  mixup: null,
  repairPrompt:
    "Why does doubling 12 kilometers correctly convert Mia's half-hour ride into kilometers per hour?",
  celebration: {
    headline: "Rock solid! No mix-ups!",
    sub: "Cora traced every step of Mia's Bike Ride and your path is strong. On to the next one!",
  },
};
