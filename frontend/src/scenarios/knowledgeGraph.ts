import type {
  Course,
  CourseGraph,
  ConceptEdge,
  ConceptNode,
  HomeworkLibrary,
} from "./types";
import type { Completions } from "./homework";

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
}

/**
 * Derive the knowledge graph for one course. This is the personalization
 * substrate: nodes are the distinct concepts the course touches, edges connect
 * concepts that co-occur in the course's problems ("everything in the same
 * course is connected"), and both grow as the student completes work.
 */
export function buildCourseGraph(
  course: Course,
  library: HomeworkLibrary,
  completed: Completions,
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
    const conceptId = problem.conceptId || "math";

    const acc = concepts.get(conceptId) ?? {
      problemIds: [],
      completed: 0,
      repaired: 0,
    };
    acc.problemIds.push(pid);
    const outcome = completed[pid];
    if (outcome) acc.completed += 1;
    if (outcome === "repaired") acc.repaired += 1;
    concepts.set(conceptId, acc);
  }

  // Every pair of concepts that appear in the same course is linked. Edges
  // between two well-practiced concepts are the strongest synapses.
  const conceptIds = [...concepts.keys()];
  for (let i = 0; i < conceptIds.length; i++) {
    for (let j = i + 1; j < conceptIds.length; j++) {
      const key = `${conceptIds[i]}__${conceptIds[j]}`;
      coOccurrence.set(key, (coOccurrence.get(key) ?? 0) + 1);
    }
  }

  const nodes: ConceptNode[] = conceptIds.map((id) => {
    const acc = concepts.get(id)!;
    const total = acc.problemIds.length;
    const ratio = total ? acc.completed / total : 0;
    const meta = conceptMeta(id);
    return {
      id,
      label: meta.label,
      emoji: meta.emoji,
      // Baseline familiarity + earned mastery from completions.
      mastery: Math.min(0.95, 0.35 + ratio * 0.6),
      wobbly: total > 0 && acc.completed < total,
      problemCount: total,
    };
  });

  const masteryOf = (id: string) =>
    nodes.find((n) => n.id === id)?.mastery ?? 0;

  const edges: ConceptEdge[] = [...coOccurrence.keys()].map((key) => {
    const [source, target] = key.split("__");
    // A synapse lights up once both concepts it links are being learned.
    const strength = Math.min(
      1,
      0.3 + (masteryOf(source) + masteryOf(target)) / 2,
    );
    return { source, target, strength };
  });

  return { nodes, edges };
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
