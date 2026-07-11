import { AnimatePresence, motion } from "motion/react";

export function SpeechBubble({ text }: { text: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={text}
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -6 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="relative max-w-xs rounded-3xl border-[3px] border-ink/10 bg-white px-5 py-3.5 shadow-[0_5px_0_rgba(63,46,86,0.1)]"
      >
        <p className="font-display text-[15px] font-bold leading-snug">{text}</p>
        {/* Tail pointing down-left toward Cora */}
        <span className="absolute -bottom-2.5 left-8 h-5 w-5 rotate-45 rounded-sm border-b-[3px] border-r-[3px] border-ink/10 bg-white" />
      </motion.div>
    </AnimatePresence>
  );
}
