import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion } from "motion/react";
import type { BubbleVisual } from "./bubbleStates";

export type ThoughtBubbleData = {
  label: string;
  caption: string;
  visual: BubbleVisual;
  order: number;
  inferred: boolean;
};

export type ThoughtBubbleNodeType = Node<ThoughtBubbleData, "thought">;

/** Sticker-style badge pinned to the bubble's top-right corner */
function Badge({ visual }: { visual: BubbleVisual }) {
  const badge: Partial<Record<BubbleVisual, { text: string; cls: string }>> = {
    solid: { text: "✓", cls: "bg-teal text-white" },
    wobbly: { text: "?", cls: "bg-sun text-ink anim-bounce-soft" },
    found: { text: "MIX-UP!", cls: "bg-coral text-white -rotate-6" },
    cloudy: { text: "😵‍💫", cls: "bg-cloud-soft" },
    probing: { text: "🔍", cls: "bg-sun text-ink anim-bounce-soft" },
    fixed: { text: "💡", cls: "bg-teal text-white" },
    relit: { text: "✓", cls: "bg-teal text-white" },
  };
  const b = badge[visual];
  if (!b) return null;
  return (
    <span
      className={`absolute -right-2.5 -top-2.5 z-10 flex min-h-7 min-w-7 items-center justify-center rounded-full border-[3px] border-white px-1.5 font-display text-sm font-bold shadow-md ${b.cls}`}
    >
      {b.text}
    </span>
  );
}

const bubbleStyles: Record<BubbleVisual, string> = {
  hidden: "opacity-0",
  pop: "border-lav bg-white",
  solid: "border-teal bg-white",
  wobbly: "border-dashed border-sun-dark bg-sun-soft anim-wobble anim-pulse-ring",
  found: "border-dashed border-coral bg-sun-soft",
  cloudy: "border-cloud bg-cloud-soft opacity-70 saturate-50",
  probing: "border-dashed border-sun-dark bg-sun-soft anim-pulse-ring",
  fixed: "border-teal bg-teal-soft",
  relit: "border-teal bg-teal-soft",
};

export function ThoughtBubbleNode({ data }: NodeProps<ThoughtBubbleNodeType>) {
  const { label, caption, visual, order, inferred } = data;
  const entering = visual === "pop";
  const repaired = visual === "fixed" || visual === "relit";

  return (
    <motion.div
      initial={entering ? { scale: 0, opacity: 0, y: 30 } : false}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 18,
        delay: entering ? order * 0.45 : 0,
      }}
      className="relative"
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <div
        className={`relative w-60 rounded-3xl border-[3px] px-5 py-4 shadow-[0_5px_0_rgba(63,46,86,0.12)] transition-colors duration-500 ${bubbleStyles[visual]}`}
      >
        <Badge visual={visual} />
        <motion.p
          key={label}
          initial={repaired ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: repaired ? order * 0.5 : 0 }}
          className="font-display text-[15px] font-bold leading-snug"
        >
          {label}
        </motion.p>
        <p className="mt-1.5 text-xs font-semibold text-ink-soft">
          {inferred ? "🫧 " : ""}
          {caption}
        </p>
      </div>
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </motion.div>
  );
}
