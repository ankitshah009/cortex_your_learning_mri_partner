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

export interface Scenario {
  id: string;
  /** Concept region this scenario belongs to (links to an island on the brain map) */
  conceptId: string;
  title: string;
  emoji: string;
  problem: string;
  /** Pre-filled student reasoning, editable in the input box */
  sampleReasoning: string;
  steps: ReasoningStep[];
  /** The first divergence: earliest step everything downstream depends on */
  mixupStepId: string;
  downstreamIds: string[];
  hypothesis: {
    name: string;
    kidExplanation: string;
    confidenceBefore: number;
    confidenceAfter: number;
    confidenceIfCorrect: number;
  };
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
  celebration: {
    headline: string;
    sub: string;
  };
}
