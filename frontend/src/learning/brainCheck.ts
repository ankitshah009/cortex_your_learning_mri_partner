import type {
  BrainCheckChallenge,
  BrainCheckEvaluation,
  ConceptNode,
  Course,
  HomeworkLibrary,
  Problem,
} from "../scenarios/types";
import type { Completions } from "../scenarios/homework";
import { DIAGNOSES } from "../scenarios/homework";
import type { UnderstandingState } from "../state/store";
import { buildCourseGraph } from "../scenarios/knowledgeGraph";

export interface BrainCheckTarget {
  course: Course;
  node: ConceptNode;
  anchorProblem: Problem;
  misconception?: string;
  evidence: string[];
  confidence: number;
  daysSinceAnchor: number;
}

/**
 * Pick the concept with the highest expected information gain: uncertainty,
 * wobble, forgetting, and prior evidence all matter. A concept with no learner
 * evidence is useful, but a decaying misconception is more valuable to test.
 */
export function selectBrainCheckTarget(
  library: HomeworkLibrary,
  completed: Completions,
  understanding: Record<string, UnderstandingState>,
): BrainCheckTarget | null {
  const candidates = library.courses.flatMap((course) => {
    const graph = buildCourseGraph(course, library, completed, understanding);
    return graph.nodes.flatMap((node) => {
      const anchorProblem = pickAnchorProblem(node, library, completed, understanding);
      if (!anchorProblem) return [];
      const diagnosis = DIAGNOSES[anchorProblem.id];
      const daysSinceAnchor = daysSince(node.lastPracticedAt);
      const uncertainty = 1 - Math.abs(node.mastery - 0.5) * 2;
      const score =
        (node.wobbly ? 2.2 : 0) +
        (1 - (node.retention ?? 0.75)) * 2 +
        uncertainty +
        Math.min(node.evidenceCount, 6) * 0.12;
      const signalEvidence = node.problemIds
        .flatMap((id) => understanding[id]?.signals ?? [])
        .filter((signal) => signal.evidence)
        .slice(-2)
        .map((signal) => signal.evidence!);
      const evidence = [
        diagnosis?.mixup
          ? `A previous scan found “${diagnosis.mixup.hypothesis.name}.”`
          : `This concept has ${node.evidenceCount} recorded learning signal${node.evidenceCount === 1 ? "" : "s"}.`,
        daysSinceAnchor > 0
          ? `The last evidence is ${daysSinceAnchor} day${daysSinceAnchor === 1 ? "" : "s"} old.`
          : "The latest evidence is recent, so this checks transfer rather than recall.",
        ...signalEvidence,
      ].slice(0, 3);
      return [{
        course,
        node,
        anchorProblem,
        misconception: diagnosis?.mixup?.hypothesis.name,
        evidence,
        confidence: Math.round(Math.min(88, 54 + score * 8)),
        daysSinceAnchor,
        score,
      }];
    });
  });

  candidates.sort((a, b) => b.score - a.score);
  const selected = candidates[0];
  if (!selected) return null;
  const { score: _score, ...target } = selected;
  return target;
}

function pickAnchorProblem(
  node: ConceptNode,
  library: HomeworkLibrary,
  completed: Completions,
  understanding: Record<string, UnderstandingState>,
) {
  return node.problemIds
    .map((id) => library.problems[id])
    .filter((problem): problem is Problem => Boolean(problem))
    .sort((a, b) => {
      const aRepaired = completed[a.id] === "repaired" ? 1 : 0;
      const bRepaired = completed[b.id] === "repaired" ? 1 : 0;
      const aEvidence = understanding[a.id]?.signals.length ?? 0;
      const bEvidence = understanding[b.id]?.signals.length ?? 0;
      return bRepaired - aRepaired || bEvidence - aEvidence;
    })[0];
}

function daysSince(iso?: string | null) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

const SEEDED_CHALLENGES: Record<
  string,
  Pick<BrainCheckChallenge, "title" | "statement" | "answerHint"> & {
    expectedDivergence: string;
  }
> = {
  "average-speed": {
    title: "The delivery drone detour",
    statement:
      "A delivery drone flies 12 kilometers out at 12 km/h, then returns along the same route at 4 km/h. What is its average speed for the whole trip? Explain why your method works.",
    answerHint: "The correct average speed is 6 km/h because the equal distances take 1 hour and 3 hours.",
    expectedDivergence: "Averages 12 and 4 directly without accounting for unequal travel times.",
  },
  "closing-speed": {
    title: "Robots across the lab",
    statement:
      "Two robots start 180 meters apart and roll directly toward each other. One moves at 8 m/s and the other at 4 m/s. How long until they meet? Explain what happens to the gap each second.",
    answerHint: "The correct time is 15 seconds because the gap closes at 12 m/s.",
    expectedDivergence: "Uses only one robot's speed instead of the combined closing speed.",
  },
  "bike-speed": {
    title: "The ferry clock",
    statement:
      "A ferry travels 18 kilometers in 45 minutes at a steady speed. What is its speed in kilometers per hour? Explain your time conversion.",
    answerHint: "The correct speed is 24 km/h because 45 minutes is three quarters of an hour.",
    expectedDivergence: "Treats 45 minutes as 0.45 hours or scales the distance by the wrong fraction.",
  },
};

export function createSeededBrainCheck(input: {
  course: Course;
  conceptId: string;
  conceptLabel: string;
  anchorProblem: Problem;
  misconception?: string;
  evidence: string[];
  confidence: number;
}): BrainCheckChallenge {
  const seeded = SEEDED_CHALLENGES[input.anchorProblem.id];
  const fallback = {
    title: `${input.conceptLabel} in a new setting`,
    statement: `Create a different example that uses ${input.conceptLabel}. Solve it, then explain how you know the same idea still applies. Do not reuse the numbers from “${input.anchorProblem.title}.”`,
    answerHint:
      "A strong response creates a genuinely new example, solves it consistently, and explains when the concept applies.",
    expectedDivergence: `Copies a procedure from the earlier problem without explaining when ${input.conceptLabel} applies.`,
  };
  const challenge = seeded ?? fallback;
  return {
    id: `check-${input.anchorProblem.id}-${new Date().toISOString().slice(0, 10)}`,
    courseId: input.course.id,
    conceptId: input.conceptId,
    conceptLabel: input.conceptLabel,
    emoji: input.anchorProblem.emoji || "🧠",
    anchorProblemId: input.anchorProblem.id,
    title: challenge.title,
    statement: challenge.statement,
    answerHint: challenge.answerHint,
    prediction: {
      hypothesis:
        input.misconception ?? `The ${input.conceptLabel} rule may not transfer to a new context yet.`,
      expectedDivergence: challenge.expectedDivergence,
      confidence: input.confidence,
      evidence: input.evidence,
    },
  };
}

export function evaluateSeededBrainCheck(input: {
  challenge: BrainCheckChallenge;
  response: string;
  daysSinceAnchor: number;
}): BrainCheckEvaluation {
  const normalized = input.response.toLowerCase().replace(/,/g, "");
  const rules: Record<string, { correct: RegExp; trap: RegExp; proof: RegExp }> = {
    "average-speed": {
      correct: /\b6(?:\.0+)?\s*(?:km\/?h|kilometers? per hour)?\b/,
      trap: /\b8(?:\.0+)?\s*(?:km\/?h|kilometers? per hour)?\b/,
      proof: /total\s+(?:distance|time)|12\s*\+\s*12|1\s*(?:hour|hr).*(?:3\s*(?:hours?|hrs?))/,
    },
    "closing-speed": {
      correct: /\b15(?:\.0+)?\s*(?:seconds?|secs?|s)?\b/,
      trap: /\b22\.5\b|\b45\b/,
      proof: /8\s*\+\s*4|12\s*(?:m\/?s|meters? per second)|combined|together/,
    },
    "bike-speed": {
      correct: /\b24(?:\.0+)?\s*(?:km\/?h|kilometers? per hour)?\b/,
      trap: /\b40\b|\b18\.45\b/,
      proof: /45\s*(?:minutes?|mins?).*(?:3\/4|three quarters?|0\.75)|18\s*(?:\/|divided by)\s*(?:0\.75|3\/4)/,
    },
  };
  const rule = rules[input.challenge.anchorProblemId];
  const correct = rule
    ? rule.correct.test(normalized) && rule.proof.test(normalized)
    : normalized.split(/\s+/).length >= 18 && /because|so that|therefore|appl/.test(normalized);
  const trapped = rule?.trap.test(normalized) ?? false;
  const evidenceClass = input.daysSinceAnchor >= 2 ? "delayed_transfer" : "immediate_transfer";
  if (correct) {
    return {
      outcome: "revised",
      correct: true,
      confidence: 92,
      observedReasoning: "The learner transferred the concept and justified the key relationship in a new context.",
      feedback: "You did more than get the answer—you explained the relationship that makes the method valid.",
      modelUpdate: `Cora's prediction was too cautious. Evidence for ${input.challenge.conceptLabel} is now stronger.`,
      nextReviewDays: evidenceClass === "delayed_transfer" ? 14 : 5,
      evidenceClass,
    };
  }
  return {
    outcome: trapped ? "confirmed" : "uncertain",
    correct: false,
    confidence: trapped ? 91 : 67,
    observedReasoning: trapped
      ? `The response followed the exact divergence Cortex predicted: ${input.challenge.prediction.expectedDivergence}`
      : "The response did not yet show enough independent reasoning to confirm or reject the prediction.",
    feedback: trapped
      ? "Cora caught the same hidden step in a completely new setting. That tells us exactly what to repair next."
      : `Show the relationship behind your calculation—not only the final number—so Cora can update the ${input.challenge.conceptLabel} model.`,
    modelUpdate: trapped
      ? `The prediction gained evidence; ${input.challenge.conceptLabel} stays scheduled for a near-term check.`
      : "The model stays uncertain and will ask a more discriminating follow-up.",
    nextReviewDays: trapped ? 1 : 2,
    evidenceClass,
  };
}
