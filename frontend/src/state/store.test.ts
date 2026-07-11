// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { useApp } from "./store";

const resetStore = () =>
  useApp.setState({
    profile: null,
    completedProblems: {},
    understandingByProblem: {},
  });

const add = (
  problemId: string,
  signal: Parameters<ReturnType<typeof useApp.getState>["addUnderstandingSignal"]>[1],
) => useApp.getState().addUnderstandingSignal(problemId, signal);

const stateOf = (problemId: string) =>
  useApp.getState().understandingByProblem[problemId];

describe("addUnderstandingSignal", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it("clamps the score at 100", () => {
    add("p1", { kind: "probe_answer", label: "Nailed the probe", delta: 150 });
    expect(stateOf("p1").score).toBe(100);
  });

  it("clamps the score at 0 when a negative delta would underflow", () => {
    add("p1", { kind: "probe_answer", label: "Missed it", delta: -40 });
    expect(stateOf("p1").score).toBe(0);
  });

  it("keeps only the last 12 signals", () => {
    for (let i = 0; i < 15; i++) {
      add("p1", { kind: "probe_answer", label: `probe ${i}`, delta: 1 });
    }
    const s = stateOf("p1");
    expect(s.signals).toHaveLength(12);
    // Oldest three were dropped, newest kept.
    expect(s.signals[0].label).toBe("probe 3");
    expect(s.signals.at(-1)!.label).toBe("probe 14");
    // Score still accumulated across all 15 additions.
    expect(s.score).toBe(15);
  });

  it("counts a repeated attempt signal's delta only once (passive dedup)", () => {
    add("p1", { kind: "attempt", label: "Tried the problem", delta: 6 });
    add("p1", { kind: "attempt", label: "Tried the problem", delta: 6 });
    const s = stateOf("p1");
    expect(s.score).toBe(6);
    // Both signals are still recorded, the duplicate just carries delta 0.
    expect(s.signals).toHaveLength(2);
    expect(s.signals[1].delta).toBe(0);
  });

  it("adds 0 for a second lesson_reflection 'Studied tiny fix' signal", () => {
    add("p1", { kind: "lesson_reflection", label: "Studied tiny fix", delta: 8 });
    add("p1", { kind: "lesson_reflection", label: "Studied tiny fix", delta: 8 });
    expect(stateOf("p1").score).toBe(8);
  });

  it("does NOT dedup lesson_reflection signals with a different label", () => {
    add("p1", { kind: "lesson_reflection", label: "Explained it back", delta: 8 });
    add("p1", { kind: "lesson_reflection", label: "Explained it back", delta: 8 });
    expect(stateOf("p1").score).toBe(16);
  });

  it("always adds probe_answer and transfer deltas, even when repeated", () => {
    add("p1", { kind: "probe_answer", label: "Got the probe", delta: 10 });
    add("p1", { kind: "probe_answer", label: "Got the probe", delta: 10 });
    add("p1", { kind: "transfer", label: "Transferred the idea", delta: 20 });
    add("p1", { kind: "transfer", label: "Transferred the idea", delta: 20 });
    expect(stateOf("p1").score).toBe(60);
  });

  it("stamps id, problemId and createdAt on stored signals", () => {
    add("p1", { kind: "attempt", label: "Tried the problem", delta: 6 });
    const sig = stateOf("p1").signals[0];
    expect(sig.id).toMatch(/^sig-/);
    expect(sig.problemId).toBe("p1");
    expect(Number.isNaN(Date.parse(sig.createdAt))).toBe(false);
  });

  it("tracks understanding per problem independently", () => {
    add("p1", { kind: "attempt", label: "Tried the problem", delta: 6 });
    add("p2", { kind: "attempt", label: "Tried the problem", delta: 6 });
    expect(stateOf("p1").score).toBe(6);
    expect(stateOf("p2").score).toBe(6);
  });
});
