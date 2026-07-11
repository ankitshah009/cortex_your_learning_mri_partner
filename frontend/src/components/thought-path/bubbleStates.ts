import type { Scenario, ReasoningStep } from "../../scenarios/types";
import type { Stage, ProbeOutcome } from "../../stages/stageMachine";

/**
 * Everything a thought bubble can look like. One visual per epistemic state:
 *   pop      - just arrived on the path
 *   solid    - verified, calm
 *   wobbly   - the first divergence, shaky and unsupported
 *   found    - mix-up confirmed (celebrated, not shamed)
 *   cloudy   - downstream steps confused BECAUSE of the wobbly one
 *   probing  - under the magnifying glass
 *   fixed    - repaired, stronger than before
 *   relit    - downstream step re-verified by the cascade
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
  scenario: Scenario,
  probeOutcome: ProbeOutcome,
): BubbleVisual {
  const isMixup = step.id === scenario.mixupStepId;
  const isDownstream = scenario.downstreamIds.includes(step.id);

  switch (stage) {
    case "intro":
    case "reading":
      return "hidden";
    case "mapping":
      return "pop";
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
  }
}

/** Label swaps to the corrected version once the repair cascade reaches it */
export function labelFor(
  step: ReasoningStep,
  visual: BubbleVisual,
  scenario: Scenario,
): string {
  if ((visual === "fixed" || visual === "relit") && scenario.fixedLabels[step.id]) {
    return scenario.fixedLabels[step.id];
  }
  return step.label;
}
