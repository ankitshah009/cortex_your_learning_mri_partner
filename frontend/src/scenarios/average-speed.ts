import type { Problem, Diagnosis } from "./types";

export const rexProblem: Problem = {
  id: "average-speed",
  conceptId: "speed",
  title: "Rex's Round Trip",
  emoji: "🐕",
  statement:
    "Rex the dog zooms to the park at 6 meters per second. He trots back home along the exact same path at 3 meters per second. What was Rex's average speed for the whole trip?",
  sampleReasoning:
    "The average of 6 and 3 is 4.5. So Rex's average speed is 4.5 meters per second.",
};

export const rexDiagnosis: Diagnosis = {
  problemId: "average-speed",
  steps: [
    {
      id: "step-claim",
      kind: "claim",
      label: "Rex goes 6 m/s to the park, 3 m/s back home",
      caption: "what you noticed",
    },
    {
      id: "step-mystery",
      kind: "mystery",
      label: "Rex spends the same amount of time at each speed",
      caption: "hidden step, you never said this out loud!",
      inferred: true,
    },
    {
      id: "step-op",
      kind: "operation",
      label: "So just average them: (6 + 3) ÷ 2",
      caption: "your move",
    },
    {
      id: "step-answer",
      kind: "conclusion",
      label: "Average speed = 4.5 m/s",
      caption: "your answer",
    },
  ],
  mixup: {
    stepId: "step-mystery",
    downstreamIds: ["step-op", "step-answer"],
    hypothesis: {
      name: "The Speed-Smoothie Mix-up",
      kidExplanation:
        "I think your brain blended the two speeds together like a smoothie. But Rex trots slowly for way longer than he zooms! When time is different, speeds can't just be averaged.",
      confidenceBefore: 68,
      confidenceAfter: 93,
      confidenceIfCorrect: 74,
    },
    confirmLine:
      "Your brain averaged the speeds without checking the time. Finding it is the hard part, fixing it is easy!",
    memoryEvidence:
      "Two weeks ago the same sneaky pattern showed up when you compared juice prices, remember unit rates? My memory says this might be the same mix-up!",
    probe: {
      question:
        "Quick experiment! Rex zooms for 1 minute at 6 m/s, then trots for 2 minutes at 3 m/s. What's his average speed now?",
      options: [
        { id: "opt-45", label: "4.5 m/s", kind: "mixup" },
        { id: "opt-4", label: "4 m/s", kind: "correct" },
        { id: "opt-3", label: "3 m/s", kind: "other" },
      ],
    },
    lesson: {
      title: "The tiny fix: think TIME, not just speeds",
      steps: [
        "Average speed = total distance ÷ total time. That's the whole secret!",
        "The park is the same distance both ways. But at 3 m/s, the trip back takes TWICE as long as the trip there.",
        "Say the park is 720 m away. Going: 720 ÷ 6 = 120 seconds. Coming back: 720 ÷ 3 = 240 seconds.",
        "Total: 1440 m in 360 seconds. That's 4 m/s, not 4.5, because the slow part counts more!",
      ],
    },
    fixedLabels: {
      "step-mystery": "Rex spends TWICE as long at the slow speed",
      "step-op": "Total distance ÷ total time: 1440 ÷ 360",
      "step-answer": "Average speed = 4 m/s ✓",
    },
  },
  celebration: {
    headline: "Mix-up fixed! Your brain grew!",
    sub: "You found the Speed-Smoothie Mix-up and repaired it. Speed Springs just got brighter!",
  },
};
