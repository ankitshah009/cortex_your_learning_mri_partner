import type { Stage, ProbeOutcome } from "../stages/stageMachine";
import type { Expression } from "../components/mascot/Cora";

/**
 * Cora's script: one line and one face per stage, so her whole
 * performance lives in one file and copy edits never touch components.
 */
export function coraExpression(stage: Stage): Expression {
  switch (stage) {
    case "intro":
      return "curious";
    case "reading":
    case "mapping":
    case "scanning":
      return "thinking";
    case "mixupFound":
      return "curious";
    case "hypothesis":
    case "probing":
      return "thinking";
    case "confirmed":
    case "repairing":
      return "excited";
    case "lesson":
      return "happy";
    case "celebrated":
      return "celebrating";
  }
}

/**
 * Progressive wait copy while Cora analyzes reasoning. Live analysis can
 * take up to ~45s (validation-retry path), so the overlay steps through
 * these lines as time passes instead of pulsing one line forever.
 */
export const READING_WAIT_LINES: readonly {
  afterMs: number;
  text: string;
}[] = [
  { afterMs: 0, text: "Cora is reading your thinking..." },
  {
    afterMs: 8000,
    text: "Hmm, this is interesting thinking! Looking closer... 🔍",
  },
  {
    afterMs: 20000,
    text: "Cora is thinking extra hard about your reasoning... 🧠",
  },
  { afterMs: 35000, text: "Almost there! Double-checking every step..." },
];

export function coraLine(
  stage: Stage,
  probeOutcome: ProbeOutcome,
  hasMixup = true,
): string {
  switch (stage) {
    case "intro":
      return "Tell me what your brain did — I love a good thought path!";
    case "reading":
      return "Reading your thinking... every word is a clue!";
    case "mapping":
      return "Look! Each bubble is one step your brain took.";
    case "scanning":
      return hasMixup
        ? "Now I'm tracing your path, step by step..."
        : "Tracing your path... this one looks super solid!";
    case "mixupFound":
      return "Ooh — that bubble is wobbly. Your brain used a hidden step!";
    case "hypothesis":
      return "I have a hunch about the mix-up. Want to test it with me?";
    case "probing":
      return "One quick experiment — there's no wrong answer, just clues!";
    case "confirmed":
      return probeOutcome === "correct"
        ? "Plot twist! You got it right — the slip wasn't a mix-up after all."
        : "That's the clue I needed. We found your mix-up!";
    case "lesson":
      return "Here comes the tiny fix — way smaller than relearning everything.";
    case "repairing":
      return "Repairing the wobbly bubble... watch the path light back up!";
    case "celebrated":
      return hasMixup
        ? "You fixed a real mix-up today. Your brain literally grew!"
        : "Solid on the first try — that idea is rock steady!";
  }
}
