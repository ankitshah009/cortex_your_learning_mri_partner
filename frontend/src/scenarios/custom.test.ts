// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  CUSTOM_PREFIX,
  getCustomProblem,
  isCustomProblem,
  saveCustomProblem,
} from "./custom";

const KEY = "cortex-custom-problems";

describe("custom problems", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saveCustomProblem roundtrips via getCustomProblem", () => {
    const saved = saveCustomProblem({
      title: "Train times",
      statement: "Two trains leave...",
      sampleReasoning: "I added the speeds.",
    });
    expect(getCustomProblem(saved.id)).toEqual(saved);
    expect(saved.conceptId).toBe("custom");
    expect(saved.emoji).toBe("✏️");
  });

  it("prefixes ids with custom-", () => {
    const saved = saveCustomProblem({
      title: "T",
      statement: "s",
      sampleReasoning: "r",
    });
    expect(saved.id.startsWith(CUSTOM_PREFIX)).toBe(true);
    expect(isCustomProblem(saved.id)).toBe(true);
  });

  it("trims title, statement and sampleReasoning", () => {
    const saved = saveCustomProblem({
      title: "  Padded title  ",
      statement: "  padded statement  ",
      sampleReasoning: "  padded reasoning  ",
    });
    expect(saved.title).toBe("Padded title");
    expect(saved.statement).toBe("padded statement");
    expect(saved.sampleReasoning).toBe("padded reasoning");
  });

  it("defaults the title to 'My own problem' when empty or whitespace", () => {
    const saved = saveCustomProblem({
      title: "   ",
      statement: "s",
      sampleReasoning: "r",
    });
    expect(saved.title).toBe("My own problem");
  });

  it("treats corrupt JSON in storage as an empty store (no throw)", () => {
    localStorage.setItem(KEY, "{definitely not json");
    expect(() => getCustomProblem("custom-123")).not.toThrow();
    expect(getCustomProblem("custom-123")).toBeUndefined();
    // Saving over a corrupt store still works and replaces it.
    const saved = saveCustomProblem({
      title: "Fresh",
      statement: "s",
      sampleReasoning: "r",
    });
    expect(getCustomProblem(saved.id)).toEqual(saved);
  });

  it("isCustomProblem boundary cases", () => {
    expect(isCustomProblem("custom-123")).toBe(true);
    // startsWith: the bare prefix itself counts as custom.
    expect(isCustomProblem("custom-")).toBe(true);
    expect(isCustomProblem("custom")).toBe(false);
    expect(isCustomProblem("customx-1")).toBe(false);
    expect(isCustomProblem("average-speed")).toBe(false);
    expect(isCustomProblem("")).toBe(false);
  });

  it("getCustomProblem returns undefined for unknown ids", () => {
    expect(getCustomProblem("custom-nope")).toBeUndefined();
  });
});
