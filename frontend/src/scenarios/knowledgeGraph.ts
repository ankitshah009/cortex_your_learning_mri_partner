import type {
  Course,
  CourseGraph,
  ConceptEdge,
  ConceptNode,
  HomeworkLibrary,
} from "./types";
import type { Completions } from "./homework";
import type { UnderstandingState } from "../state/store";
import { UNDERSTANDING_MASTERY_THRESHOLD } from "../learning/understanding";

/**
 * Human-friendly names + emoji for concept ids the PDF extractor / seed data
 * emit. Unknown concepts fall back to a title-cased id and a neuron emoji, so
 * the graph always renders something meaningful.
 */
const CONCEPT_META: Record<string, { label: string; emoji: string }> = {
  speed: { label: "Speed", emoji: "⚡" },
  time: { label: "Time", emoji: "⏰" },
  distance: { label: "Distance", emoji: "📏" },
  fractions: { label: "Fractions", emoji: "🍕" },
  rates: { label: "Rates", emoji: "📈" },
  math: { label: "Math", emoji: "🔢" },
  algebra: { label: "Algebra", emoji: "🧮" },
  geometry: { label: "Geometry", emoji: "📐" },
  reading: { label: "Reading", emoji: "📖" },
  science: { label: "Science", emoji: "🔬" },
  // Linear algebra concepts (common in imported worksheets)
  eigenvalue: { label: "Eigenvalues", emoji: "λ" },
  eigenvector: { label: "Eigenvectors", emoji: "➡️" },
  diagonalization: { label: "Diagonalization", emoji: "🔷" },
  eigenspace: { label: "Eigenspaces", emoji: "🌐" },
  matrix: { label: "Matrices", emoji: "🔲" },
  determinant: { label: "Determinants", emoji: "🧾" },
};

function conceptMeta(id: string) {
  return (
    CONCEPT_META[id] ?? {
      label: id
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      emoji: "🧠",
    }
  );
}

interface ConceptAccumulator {
  problemIds: string[];
  completed: number;
  repaired: number;
  understandingTotal: number;
  baselineTotal: number;
  practicedCount: number;
  evidenceCount: number;
  lastPracticedAt: string | null;
}

/**
 * Derive the knowledge graph for one course. This is the personalization
 * substrate: nodes are the distinct concepts the course touches, edges connect
 * concepts that genuinely co-occur within a problem, and both grow as the
 * student completes work.
 */
export function buildCourseGraph(
  course: Course,
  library: HomeworkLibrary,
  completed: Completions,
  understandingByProblem: Record<string, UnderstandingState> = {},
): CourseGraph {
  const concepts = new Map<string, ConceptAccumulator>();
  // conceptId pair key -> shared problem count, for edge strength
  const coOccurrence = new Map<string, number>();

  const problemIds = course.homeworkIds
    .map((hwId) => library.homeworks.find((h) => h.id === hwId))
    .filter((hw): hw is NonNullable<typeof hw> => Boolean(hw))
    .flatMap((hw) => hw.problemIds);

  for (const pid of problemIds) {
    const problem = library.problems[pid];
    if (!problem) continue;
    const problemConcepts = [
      problem.conceptId || "math",
      ...(problem.relatedConceptIds ?? []),
    ].filter((id, index, ids) => id && ids.indexOf(id) === index);

    for (const conceptId of problemConcepts) {
      const acc = concepts.get(conceptId) ?? {
        problemIds: [],
        completed: 0,
        repaired: 0,
        understandingTotal: 0,
        baselineTotal: 0,
        practicedCount: 0,
        evidenceCount: 0,
        lastPracticedAt: null,
      };
      acc.problemIds.push(pid);
      const outcome = completed[pid];
      if (outcome) acc.completed += 1;
      if (outcome === "repaired") acc.repaired += 1;

      const understanding = understandingByProblem[pid];
      if (understanding) {
        acc.understandingTotal += understanding.score;
        const inferredBaseline = Math.max(
          0,
          understanding.score -
            understanding.signals.reduce((sum, signal) => sum + signal.delta, 0),
        );
        acc.baselineTotal +=
          understanding.baselineScore ?? inferredBaseline;
        acc.practicedCount += 1;
        acc.evidenceCount += understanding.signals.length;
        const lastSignal = understanding.signals.at(-1);
        if (
          lastSignal &&
          (!acc.lastPracticedAt || lastSignal.createdAt > acc.lastPracticedAt)
        ) {
          acc.lastPracticedAt = lastSignal.createdAt;
        }
      } else if (outcome) {
        // Older persisted completions did not have understanding signals yet.
        acc.understandingTotal += 100;
        acc.practicedCount += 1;
      }
      concepts.set(conceptId, acc);
    }

    // Only connect concepts that actually co-occur in a problem. This keeps
    // mixed-topic PDFs from producing an indiscriminate fully-connected graph.
    for (let i = 0; i < problemConcepts.length; i++) {
      for (let j = i + 1; j < problemConcepts.length; j++) {
        const pair = [problemConcepts[i], problemConcepts[j]].sort();
        const key = `${pair[0]}__${pair[1]}`;
        coOccurrence.set(key, (coOccurrence.get(key) ?? 0) + 1);
      }
    }
  }

  const conceptIds = [...concepts.keys()];

  const nodes: ConceptNode[] = conceptIds.map((id) => {
    const acc = concepts.get(id)!;
    const total = acc.problemIds.length;
    const ratio = total ? acc.completed / total : 0;
    const evidenceRatio = acc.practicedCount
      ? acc.understandingTotal / (acc.practicedCount * 100)
      : ratio;
    const baselineEvidenceRatio = acc.practicedCount
      ? acc.baselineTotal / (acc.practicedCount * 100)
      : 0;
    const recency = recencyWeight(acc.lastPracticedAt);
    const mastery = Math.min(
      0.95,
      0.2 + evidenceRatio * 0.7 * recency + ratio * 0.05,
    );
    const meta = conceptMeta(id);
    return {
      id,
      label: meta.label,
      emoji: meta.emoji,
      mastery,
      baselineMastery: Math.min(0.95, 0.2 + baselineEvidenceRatio * 0.7),
      wobbly:
        total > 0 &&
        (acc.completed < total ||
          evidenceRatio * 100 < UNDERSTANDING_MASTERY_THRESHOLD),
      problemCount: total,
      problemIds: [...new Set(acc.problemIds)],
      evidenceCount: acc.evidenceCount,
      lastPracticedAt: acc.lastPracticedAt,
      retention: recency,
    };
  });

  const masteryOf = (id: string) =>
    nodes.find((n) => n.id === id)?.mastery ?? 0;

  const edges: ConceptEdge[] = [...coOccurrence.entries()].map(([key, shared]) => {
    const [source, target] = key.split("__");
    // A synapse lights up once both concepts it links are being learned.
    const strength = Math.min(
      1,
      0.2 + shared * 0.1 + (masteryOf(source) + masteryOf(target)) / 2,
    );
    return { source, target, strength };
  });

  return { nodes, edges };
}

function recencyWeight(lastPracticedAt: string | null) {
  if (!lastPracticedAt) return 0.75;
  const ageMs = Date.now() - new Date(lastPracticedAt).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (ageMs <= day) return 1;
  if (ageMs <= 7 * day) return 0.9;
  if (ageMs <= 30 * day) return 0.75;
  return 0.55;
}

/** Aggregate progress across a whole course, for course-card summaries. */
export function courseProgress(
  course: Course,
  library: HomeworkLibrary,
  completed: Completions,
) {
  let done = 0;
  let total = 0;
  for (const hwId of course.homeworkIds) {
    const hw = library.homeworks.find((h) => h.id === hwId);
    if (!hw) continue;
    total += hw.problemIds.length;
    done += hw.problemIds.filter((id) => completed[id]).length;
  }
  return { done, total };
}
