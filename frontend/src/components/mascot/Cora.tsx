import { motion } from "motion/react";

export type Expression =
  | "happy"
  | "curious"
  | "thinking"
  | "excited"
  | "celebrating";

/**
 * Cora, the brain buddy. A deliberate hand-drawn SVG character (the one
 * illustration in the app), animated with springs. Four eye/mouth combos
 * carry the whole emotional arc of the demo.
 */
function Eyes({ expression }: { expression: Expression }) {
  if (expression === "celebrating") {
    // Closed happy arcs: ^ ^
    return (
      <g stroke="#3f2e56" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M40 60 Q48 50 56 60" />
        <path d="M80 60 Q88 50 96 60" />
      </g>
    );
  }
  if (expression === "excited") {
    // Wide sparkle eyes
    return (
      <g>
        <circle cx="48" cy="60" r="13" fill="white" />
        <circle cx="88" cy="60" r="13" fill="white" />
        <circle cx="48" cy="60" r="7.5" fill="#3f2e56" />
        <circle cx="88" cy="60" r="7.5" fill="#3f2e56" />
        <circle cx="51" cy="56" r="3" fill="white" />
        <circle cx="91" cy="56" r="3" fill="white" />
        <circle cx="45" cy="63" r="1.6" fill="white" />
        <circle cx="85" cy="63" r="1.6" fill="white" />
      </g>
    );
  }
  const pupilOffset =
    expression === "thinking" ? { dx: -3, dy: -4 } : { dx: 0, dy: 0 };
  return (
    <g>
      <circle cx="48" cy="60" r="11" fill="white" />
      <circle cx="88" cy="60" r="11" fill="white" />
      <circle
        cx={48 + pupilOffset.dx}
        cy={60 + pupilOffset.dy}
        r="5.5"
        fill="#3f2e56"
      />
      <circle
        cx={88 + pupilOffset.dx}
        cy={60 + pupilOffset.dy}
        r="5.5"
        fill="#3f2e56"
      />
      <circle cx={50 + pupilOffset.dx} cy={57 + pupilOffset.dy} r="2" fill="white" />
      <circle cx={90 + pupilOffset.dx} cy={57 + pupilOffset.dy} r="2" fill="white" />
    </g>
  );
}

function Mouth({ expression }: { expression: Expression }) {
  switch (expression) {
    case "celebrating":
    case "excited":
      return (
        <path
          d="M56 78 Q68 92 80 78 Z"
          fill="#3f2e56"
          stroke="#3f2e56"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      );
    case "curious":
      return <circle cx="68" cy="82" r="6" fill="#3f2e56" />;
    case "thinking":
      return (
        <path
          d="M58 82 Q63 78 68 82 Q73 86 78 82"
          fill="none"
          stroke="#3f2e56"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      );
    default:
      return (
        <path
          d="M58 79 Q68 88 78 79"
          fill="none"
          stroke="#3f2e56"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      );
  }
}

export function Cora({
  expression = "happy",
  size = 120,
}: {
  expression?: Expression;
  size?: number;
}) {
  return (
    <motion.div
      animate={
        expression === "celebrating"
          ? { rotate: [0, -6, 6, -6, 0], y: [0, -10, 0] }
          : { y: [0, -6, 0] }
      }
      transition={
        expression === "celebrating"
          ? { duration: 0.8, repeat: Infinity }
          : { duration: 3, repeat: Infinity, ease: "easeInOut" }
      }
      style={{ width: size, height: size * 0.92 }}
    >
      <svg viewBox="0 0 136 125" width="100%" height="100%">
        {/* Body: a squishy cartoon brain blob */}
        <path
          d="M68 8
             C82 2 100 6 106 18
             C122 20 132 34 127 48
             C136 58 132 76 120 82
             C120 98 106 110 90 107
             C82 118 54 118 46 107
             C30 110 16 98 16 82
             C4 76 0 58 9 48
             C4 34 14 20 30 18
             C36 6 54 2 68 8 Z"
          fill="#ff9bb3"
          stroke="#e56b8c"
          strokeWidth="4"
        />
        {/* Cortex squiggles: what makes the blob read as a brain */}
        <g
          fill="none"
          stroke="#e56b8c"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.85"
        >
          <path d="M68 10 Q66 24 68 36" />
          <path d="M30 26 Q42 22 46 32" />
          <path d="M106 26 Q94 22 90 32" />
          <path d="M18 56 Q30 52 32 62" />
          <path d="M118 56 Q106 52 104 62" />
        </g>
        <Eyes expression={expression} />
        {/* Blush */}
        <ellipse cx="32" cy="76" rx="8" ry="5" fill="#ff6b8a" opacity="0.45" />
        <ellipse cx="104" cy="76" rx="8" ry="5" fill="#ff6b8a" opacity="0.45" />
        <Mouth expression={expression} />
      </svg>
    </motion.div>
  );
}
