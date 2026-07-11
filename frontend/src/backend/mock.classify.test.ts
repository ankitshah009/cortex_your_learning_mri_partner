// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mockProvider } from "./mock";
import { DIAGNOSES, PROBLEMS } from "../scenarios/homework";
import type { UnderstandingTurnMode } from "../scenarios/types";

/**
 * classifyQuestion / classifyTurn are module-private in mock.ts, so they are
 * exercised through the exported surface that uses them:
 * mockProvider.evaluateStudentQuestion.
 */
const evaluate = (
  question: string,
  mode?: UnderstandingTurnMode,
  prompt?: string,
) =>
  mockProvider.evaluateStudentQuestion({
    problem: PROBLEMS["average-speed"],
    diagnosis: DIAGNOSES["average-speed"],
    question,
    currentUnderstanding: 40,
    mode,
    prompt,
  });

describe("question classification (student_question / default mode)", () => {
  it("classifies 'when ... use' phrasing as transfer_question (+16)", async () => {
    const r = await evaluate("When do I use average speed?");
    expect(r.depth).toBe("transfer_question");
    expect(r.understandingDelta).toBe(16);
  });

  it("classifies 'what if' phrasing as transfer_question (+16)", async () => {
    const r = await evaluate("What if Rex ran faster on the way back?");
    expect(r.depth).toBe("transfer_question");
    expect(r.understandingDelta).toBe(16);
  });

  it("classifies 'how do i know' as metacognitive_question (+18)", async () => {
    const r = await evaluate("How do I know which mistake I made?");
    expect(r.depth).toBe("metacognitive_question");
    expect(r.understandingDelta).toBe(18);
  });

  it("classifies 'why' questions as conceptual_question (+14)", async () => {
    const r = await evaluate("Why does the slow part matter more?");
    expect(r.depth).toBe("conceptual_question");
    expect(r.understandingDelta).toBe(14);
    expect(r.feedbackToStudent).toBe(
      "That gives me evidence your brain is building the idea, not just copying a step.",
    );
  });

  it("classifies 'difference' questions as contrast_question (+15)", async () => {
    const r = await evaluate("What is the difference between speed and velocity?");
    expect(r.depth).toBe("contrast_question");
    expect(r.understandingDelta).toBe(15);
  });

  it("classifies 'formula' questions as procedural_question (+9, weak feedback)", async () => {
    const r = await evaluate("What formula do I need here?");
    expect(r.depth).toBe("procedural_question");
    expect(r.understandingDelta).toBe(9);
    expect(r.feedbackToStudent).toBe(
      "Good start. Add a why, when, or next-time check so the idea sticks.",
    );
  });

  it("falls back to surface_confusion (+5) with the foggy-part prompt", async () => {
    const r = await evaluate("I am so lost");
    expect(r.depth).toBe("surface_confusion");
    expect(r.understandingDelta).toBe(5);
    expect(r.nextPrompt).toBe(
      "What part feels foggy: the numbers, the operation, or the idea?",
    );
    expect(r.evidence).toBe('Student asked: "I am so lost"');
  });
});

describe("cora_prompt_response classification", () => {
  it("classifies 'next time' answers as memory_rule (+30)", async () => {
    const r = await evaluate(
      "Next time I will look at how long each part took",
      "cora_prompt_response",
    );
    expect(r.depth).toBe("memory_rule");
    expect(r.understandingDelta).toBe(30);
  });

  it("classifies 'similar' answers as transfer_application (+32)", async () => {
    const r = await evaluate(
      "I could try a similar problem to be sure",
      "cora_prompt_response",
    );
    expect(r.depth).toBe("transfer_application");
    expect(r.understandingDelta).toBe(32);
  });

  it("classifies long non-keyword answers (>= 8 words) as explanation_attempt (+26)", async () => {
    const r = await evaluate(
      "the total distance divided by the total elapsed duration gives it",
      "cora_prompt_response",
    );
    expect(r.depth).toBe("explanation_attempt");
    expect(r.understandingDelta).toBe(26);
  });

  it("classifies short non-keyword answers as surface_confusion (+8)", async () => {
    const r = await evaluate("no idea", "cora_prompt_response");
    expect(r.depth).toBe("surface_confusion");
    expect(r.understandingDelta).toBe(8);
  });

  it("includes Cora's prompt text in the classification (prompt keywords can trigger memory_rule)", async () => {
    // The question alone has no keywords, but the prompt contains "remember".
    const r = await evaluate(
      "the units",
      "cora_prompt_response",
      "What will you remember to do?",
    );
    expect(r.depth).toBe("memory_rule");
    expect(r.understandingDelta).toBe(30);
  });

  it("uses question classification (not turn classification) when mode is student_question", async () => {
    // Same 11-word text that is explanation_attempt in prompt-response mode
    // classifies as surface_confusion through classifyQuestion.
    const r = await evaluate(
      "the total distance divided by the total elapsed duration gives it",
      "student_question",
    );
    expect(r.depth).toBe("surface_confusion");
    expect(r.understandingDelta).toBe(5);
  });
});
