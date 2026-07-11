import { describe, expect, it } from "vitest";
import { buildCourseGraph, courseProgress } from "./knowledgeGraph";
import type {
  Course,
  HomeworkLibrary,
  Problem,
  UnderstandingSignal,
} from "./types";
import type { UnderstandingState } from "../state/store";

const problem = (id: string, conceptId: string): Problem => ({
  id,
  conceptId,
  title: id,
  emoji: "🧪",
  statement: "",
  sampleReasoning: "",
});

const signal = (createdAt: string): UnderstandingSignal => ({
  id: `sig-${createdAt}`,
  problemId: "p1",
  kind: "probe_answer",
  label: "probe",
  delta: 10,
  createdAt,
});

const understanding = (
  score: number,
  createdAt = new Date().toISOString(),
): UnderstandingState => ({ score, signals: [signal(createdAt)] });

/** One course, one homework, problems p1..pN across the given concepts. */
function fixture(concepts: Record<string, string>): {
  course: Course;
  library: HomeworkLibrary;
} {
  const problems = Object.fromEntries(
    Object.entries(concepts).map(([pid, cid]) => [pid, problem(pid, cid)]),
  );
  const course: Course = {
    id: "c1",
    title: "Test course",
    emoji: "📚",
    color: "lav",
    subject: "Math",
    homeworkIds: ["hw1", "hw-does-not-exist"],
  };
  const library: HomeworkLibrary = {
    courses: [course],
    homeworks: [
      {
        id: "hw1",
        title: "HW 1",
        emoji: "📄",
        subject: "Math",
        due: "someday",
        problemIds: Object.keys(concepts),
      },
    ],
    problems,
  };
  return { course, library };
}

describe("buildCourseGraph", () => {
  it("flags a concept wobbly when its understanding score is below the mastery threshold", () => {
    const { course, library } = fixture({ p1: "speed" });
    const graph = buildCourseGraph(
      course,
      library,
      { p1: "solid" },
      { p1: understanding(50) },
    );
    const node = graph.nodes.find((n) => n.id === "speed")!;
    // Completed, but evidenceRatio*100 = 50 < 85 threshold.
    expect(node.wobbly).toBe(true);
  });

  it("does not flag wobbly when complete and understanding meets the threshold", () => {
    const { course, library } = fixture({ p1: "speed" });
    const graph = buildCourseGraph(
      course,
      library,
      { p1: "solid" },
      { p1: understanding(90) },
    );
    expect(graph.nodes.find((n) => n.id === "speed")!.wobbly).toBe(false);
  });

  it("flags wobbly when problems are incomplete, and floors mastery at 0.2", () => {
    const { course, library } = fixture({ p1: "speed" });
    const graph = buildCourseGraph(course, library, {}, {});
    const node = graph.nodes.find((n) => n.id === "speed")!;
    expect(node.wobbly).toBe(true);
    expect(node.mastery).toBeCloseTo(0.2, 5);
  });

  it("caps mastery at 0.95 even with perfect, recent evidence", () => {
    const { course, library } = fixture({ p1: "speed" });
    const graph = buildCourseGraph(
      course,
      library,
      { p1: "solid" },
      { p1: understanding(100) },
    );
    // 0.2 + 1.0*0.7*1(recent) + 1.0*0.05 = 0.95, min-capped at 0.95.
    expect(graph.nodes.find((n) => n.id === "speed")!.mastery).toBe(0.95);
  });

  it("treats a legacy completion (no understanding entry) as understanding 100", () => {
    const { course, library } = fixture({ p1: "speed" });
    const graph = buildCourseGraph(course, library, { p1: "repaired" }, {});
    const node = graph.nodes.find((n) => n.id === "speed")!;
    expect(node.wobbly).toBe(false);
    // evidenceRatio 1, no lastPracticedAt so recency is 0.75:
    // 0.2 + 1*0.7*0.75 + 1*0.05 = 0.775
    expect(node.mastery).toBeCloseTo(0.775, 5);
    expect(node.lastPracticedAt).toBeNull();
  });

  it("connects concepts co-occurring within a problem, with edge strength capped at 1", () => {
    const { course, library } = fixture({ p1: "speed", p2: "time" });
    // Edges only form when concepts share a problem, so make "time" a related
    // concept of p1. p2 alone (concept "time") must not create any edge.
    library.problems.p1 = {
      ...library.problems.p1,
      relatedConceptIds: ["time"],
    };
    const strongGraph = buildCourseGraph(
      course,
      library,
      { p1: "solid", p2: "solid" },
      { p1: understanding(100), p2: understanding(100) },
    );
    expect(strongGraph.edges).toHaveLength(1);
    const strong = strongGraph.edges[0];
    expect([strong.source, strong.target].sort()).toEqual(["speed", "time"]);
    // 0.2 + 1 shared problem * 0.1 + (0.95 + 0.95)/2 = 1.25 → capped at 1.
    expect(strong.strength).toBe(1);

    const weakGraph = buildCourseGraph(course, library, {}, {});
    expect(weakGraph.edges).toHaveLength(1);
    for (const edge of weakGraph.edges) {
      expect(edge.strength).toBeLessThanOrEqual(1);
      // 0.2 + 1*0.1 + (0.2 + 0.2)/2 = 0.5 for unpracticed concepts.
      expect(edge.strength).toBeCloseTo(0.5, 5);
    }
  });

  it("does not connect concepts that never share a problem", () => {
    const { course, library } = fixture({ p1: "speed", p2: "time" });
    const graph = buildCourseGraph(
      course,
      library,
      { p1: "solid", p2: "solid" },
      { p1: understanding(100), p2: understanding(100) },
    );
    expect(graph.nodes.map((n) => n.id).sort()).toEqual(["speed", "time"]);
    expect(graph.edges).toHaveLength(0);
  });

  it("falls back to concept 'math' when a problem has no conceptId", () => {
    const { course, library } = fixture({ p1: "speed" });
    library.problems.p1 = { ...library.problems.p1, conceptId: "" };
    const graph = buildCourseGraph(course, library, {}, {});
    expect(graph.nodes.map((n) => n.id)).toEqual(["math"]);
  });
});

describe("courseProgress", () => {
  it("counts done/total across homeworks and ignores unknown homework ids", () => {
    const { course, library } = fixture({ p1: "speed", p2: "time", p3: "speed" });
    // course.homeworkIds includes "hw-does-not-exist", which contributes nothing.
    expect(courseProgress(course, library, { p1: "solid", p3: "repaired" })).toEqual(
      { done: 2, total: 3 },
    );
    expect(courseProgress(course, library, {})).toEqual({ done: 0, total: 3 });
  });
});
