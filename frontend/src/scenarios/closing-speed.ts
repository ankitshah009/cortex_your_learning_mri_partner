import type { Problem, Diagnosis } from "./types";

export const meetProblem: Problem = {
  id: "closing-speed",
  conceptId: "speed",
  title: "Meet in the Middle",
  emoji: "🚶",
  statement:
    "Ben and Ali stand 100 meters apart and walk straight toward each other. Ben walks at 3 m/s and Ali walks at 2 m/s. How many seconds until they meet?",
  sampleReasoning:
    "Ben has to cover the 100 meters, and he walks at 3 m/s. 100 divided by 3 is about 33. So they meet after about 33 seconds.",
};

export const meetDiagnosis: Diagnosis = {
  problemId: "closing-speed",
  steps: [
    {
      id: "step-claim",
      kind: "claim",
      label: "Ben walks 3 m/s, Ali walks 2 m/s, 100 m apart",
      caption: "what you noticed",
    },
    {
      id: "step-mystery",
      kind: "mystery",
      label: "Only Ben's walking closes the gap",
      caption: "hidden step, you never said this out loud!",
      inferred: true,
    },
    {
      id: "step-op",
      kind: "operation",
      label: "So divide by his speed: 100 ÷ 3",
      caption: "your move",
    },
    {
      id: "step-answer",
      kind: "conclusion",
      label: "They meet after about 33 seconds",
      caption: "your answer",
    },
  ],
  mixup: {
    stepId: "step-mystery",
    downstreamIds: ["step-op", "step-answer"],
    hypothesis: {
      name: "The Solo-Walker Mix-up",
      kidExplanation:
        "I think your brain let only Ben do the walking! Ali is walking too, so the gap between them shrinks extra fast, both speeds count.",
      confidenceBefore: 64,
      confidenceAfter: 91,
      confidenceIfCorrect: 72,
    },
    confirmLine:
      "Your brain let just one walker close the gap, but both of them were moving. Finding it is the hard part, fixing it is easy!",
    memoryEvidence:
      "I've seen this pattern in my memory before: when two things happen at once, your brain sometimes counts just one of them. It happened with the two water taps problem last month!",
    probe: {
      question:
        "Quick experiment! Two turtles start 10 m apart and crawl toward each other, each at 1 m/s. How long until they bump noses?",
      options: [
        { id: "opt-10", label: "10 seconds", kind: "mixup" },
        { id: "opt-5", label: "5 seconds", kind: "correct" },
        { id: "opt-20", label: "20 seconds", kind: "other" },
      ],
    },
    lesson: {
      title: "The tiny fix: the gap shrinks by BOTH speeds",
      steps: [
        "When two things move toward each other, the gap between them shrinks by both speeds combined.",
        "Ben eats 3 m of gap every second. Ali eats 2 m. Together: 5 m of gap disappears each second.",
        "100 m of gap ÷ 5 m per second = 20 seconds. That's it!",
      ],
    },
    fixedLabels: {
      "step-mystery": "BOTH walkers shrink the gap: 3 + 2 = 5 m/s",
      "step-op": "Divide by the combined speed: 100 ÷ 5",
      "step-answer": "They meet after 20 seconds ✓",
    },
  },
  celebration: {
    headline: "Another mix-up squashed!",
    sub: "You found the Solo-Walker Mix-up and repaired it. Speed Springs is getting even stronger!",
  },
};
