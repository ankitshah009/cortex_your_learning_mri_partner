export type StepKind = "claim" | "mystery" | "operation" | "conclusion";

export interface ReasoningStep {
  id: string;
  kind: StepKind;
  /** Kid-friendly summary shown inside the thought bubble */
  label: string;
  /** Small caption under the label ("your words", "hidden step", ...) */
  caption: string;
  /** True when Cortex surfaced a step the student never wrote */
  inferred?: boolean;
}

export interface ProbeOption {
  id: string;
  label: string;
  kind: "mixup" | "correct" | "other";
}

/** A homework item: what the student sees before they start reasoning */
export interface Problem {
  id: string;
  /** Concept region this problem belongs to (links to an island on the brain map) */
  conceptId: string;
  title: string;
  emoji: string;
  statement: string;
  /** Pre-filled student reasoning, editable in the input box */
  sampleReasoning: string;
}

/** Present only when the scan found a first divergence */
export interface Mixup {
  /** The first divergence: earliest step everything downstream depends on */
  stepId: string;
  downstreamIds: string[];
  hypothesis: {
    name: string;
    kidExplanation: string;
    confidenceBefore: number;
    confidenceAfter: number;
    confidenceIfCorrect: number;
  };
  /** Shown on the confirmed card: what the brain did, in one kid sentence */
  confirmLine: string;
  /** EverOS memory beat shown as evidence for the hypothesis */
  memoryEvidence: string;
  probe: {
    question: string;
    options: ProbeOption[];
  };
  lesson: {
    title: string;
    steps: string[];
  };
  /** stepId -> corrected bubble label after the repair cascade */
  fixedLabels: Record<string, string>;
}

/** What the scan produces for one submission of reasoning */
export interface Diagnosis {
  problemId: string;
  steps: ReasoningStep[];
  /** null means the reasoning was solid: no first divergence found */
  mixup: Mixup | null;
  celebration: {
    headline: string;
    sub: string;
  };
}

export interface Homework {
  id: string;
  title: string;
  emoji: string;
  subject: string;
  due: string;
  /** Problems in the order the student should do them */
  problemIds: string[];
}
