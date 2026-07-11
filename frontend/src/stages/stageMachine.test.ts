import { beforeEach, describe, expect, it } from "vitest";
import { STAGES, atOrAfter, stageIndex, useStage } from "./stageMachine";

describe("stageMachine", () => {
  beforeEach(() => {
    useStage.getState().reset();
  });

  it("reset returns to intro with no probe outcome", () => {
    useStage.getState().goTo("lesson");
    useStage.getState().answerProbe("correct");
    useStage.getState().reset();
    expect(useStage.getState().stage).toBe("intro");
    expect(useStage.getState().probeOutcome).toBeNull();
  });

  it("next() advances one stage", () => {
    useStage.getState().next();
    expect(useStage.getState().stage).toBe("reading");
  });

  it("next() clamps at the last stage", () => {
    useStage.getState().goTo("celebrated");
    useStage.getState().next();
    expect(useStage.getState().stage).toBe("celebrated");
  });

  it("next() is also a no-op from 'repairing' (explicit guard, not just the last stage)", () => {
    // Actual current behavior: `if (s.stage === "repairing") return {}` means
    // arrow-key advancement stops at repairing even though it is not last.
    useStage.getState().goTo("repairing");
    useStage.getState().next();
    expect(useStage.getState().stage).toBe("repairing");
  });

  it("next() from probing with a null outcome advances AND assumes the mixup answer", () => {
    useStage.getState().goTo("probing");
    expect(useStage.getState().probeOutcome).toBeNull();
    useStage.getState().next();
    expect(useStage.getState().stage).toBe("confirmed");
    expect(useStage.getState().probeOutcome).toBe("mixup");
  });

  it("next() from probing keeps an already-answered outcome", () => {
    useStage.setState({ stage: "probing", probeOutcome: "correct" });
    useStage.getState().next();
    expect(useStage.getState().stage).toBe("confirmed");
    expect(useStage.getState().probeOutcome).toBe("correct");
  });

  it("prev() floors at intro", () => {
    useStage.getState().prev();
    expect(useStage.getState().stage).toBe("intro");
  });

  it("prev() steps back one stage", () => {
    useStage.getState().goTo("mapping");
    useStage.getState().prev();
    expect(useStage.getState().stage).toBe("reading");
  });

  it("answerProbe('correct') sets the outcome and jumps to confirmed", () => {
    useStage.getState().goTo("probing");
    useStage.getState().answerProbe("correct");
    expect(useStage.getState().stage).toBe("confirmed");
    expect(useStage.getState().probeOutcome).toBe("correct");
  });

  it("stageIndex reflects the declared stage order", () => {
    expect(stageIndex("intro")).toBe(0);
    expect(stageIndex("celebrated")).toBe(STAGES.length - 1);
    for (let i = 1; i < STAGES.length; i++) {
      expect(stageIndex(STAGES[i])).toBeGreaterThan(stageIndex(STAGES[i - 1]));
    }
  });

  it("atOrAfter compares stage positions", () => {
    expect(atOrAfter("lesson", "probing")).toBe(true);
    expect(atOrAfter("probing", "probing")).toBe(true);
    expect(atOrAfter("mapping", "probing")).toBe(false);
  });
});
