import type { Diagnosis, ReasoningStep } from "../../scenarios/types";
import type { Stage, ProbeOutcome } from "../../stages/stageMachine";
import { atOrAfter } from "../../stages/stageMachine";

/**
 * Everything a thought bubble can look like. One visual per epistemic state:
 *   pop      - just arrived on the path
 *   solid    - verified, calm
 *   wobbly   - the first divergence, shaky and unsupported
 *   found    - mix-up confirmed (celebrated, not shamed)
 *   cloudy   - downstream steps confused BECAUSE of the wobbly one
 *   probing  - under the magnifying glass
 *   fixed    - repaired, stronger than before
 *   relit    - re-verified (by the cascade, or a solid path celebrating)
 */
export type BubbleVisual =
  | "hidden"
  | "pop"
  | "solid"
  | "wobbly"
  | "found"
  | "cloudy"
  | "probing"
  | "fixed"
  | "relit";

export function visualFor(
  step: ReasoningStep,
  stage: Stage,
  diagnosis: Diagnosis,
  probeOutcome: ProbeOutcome,
): BubbleVisual {
  if (stage === "intro" || stage === "reading") return "hidden";
  if (stage === "mapping") return "pop";

  // Solid path: no mix-up anywhere. Everything glows at the celebration.
  if (!diagnosis.mixup) {
    return atOrAfter(stage, "celebrated") ? "relit" : "solid";
  }

  const isMixup = step.id === diagnosis.mixup.stepId;
  const isDownstream = diagnosis.mixup.downstreamIds.includes(step.id);

  switch (stage) {
    case "scanning":
      return "solid";
    case "mixupFound":
    case "hypothesis":
      if (isMixup) return "wobbly";
      if (isDownstream) return "cloudy";
      return "solid";
    case "probing":
      if (isMixup) return "probing";
      if (isDownstream) return "cloudy";
      return "solid";
    case "confirmed":
    case "lesson":
      if (isMixup) return probeOutcome === "correct" ? "wobbly" : "found";
      if (isDownstream) return "cloudy";
      return "solid";
    case "repairing":
    case "celebrated":
      if (isMixup) return "fixed";
      if (isDownstream) return "relit";
      return "solid";
    default:
      return "solid";
  }
}

/** Label swaps to the corrected version once the repair cascade reaches it */
export function labelFor(
  step: ReasoningStep,
  visual: BubbleVisual,
  diagnosis: Diagnosis,
): string {
  const fixed = diagnosis.mixup?.fixedLabels[step.id];
  if ((visual === "fixed" || visual === "relit") && fixed) return fixed;
  return step.label;
}
