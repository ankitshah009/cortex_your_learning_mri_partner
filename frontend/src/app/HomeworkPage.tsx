import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  getHomework,
  homeworkProgress,
  firstUnfinished,
  PROBLEMS,
} from "../scenarios/homework";
import { useApp } from "../state/store";
import { Cora } from "../components/mascot/Cora";
import { SpeechBubble } from "../components/mascot/SpeechBubble";
import { ChunkyButton } from "../components/ui/ChunkyButton";

export function HomeworkPage() {
  const { homeworkId } = useParams<{ homeworkId: string }>();
  const completed = useApp((s) => s.completedProblems);
  const hw = homeworkId ? getHomework(homeworkId) : undefined;

  if (!hw) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <Cora expression="thinking" size={130} />
        <p className="font-display text-2xl font-extrabold">
          Hmm, I can't find that homework!
        </p>
        <Link to="/">
          <ChunkyButton variant="ghost">Back to my brain 🧠</ChunkyButton>
        </Link>
      </div>
    );
  }

  const { done, total } = homeworkProgress(hw, completed);
  const nextUp = firstUnfinished(hw, completed);
  const allDone = !nextUp;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="flex items-center justify-between">
        <Link
          to="/"
          className="font-display text-lg font-extrabold text-ink-soft transition-colors hover:text-ink"
        >
          ← My brain
        </Link>
        <span className="rounded-full border-[3px] border-ink/10 bg-white px-4 py-1.5 font-display text-sm font-extrabold text-ink-soft">
          {hw.subject} · {hw.due}
        </span>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8"
      >
        <h1 className="font-display text-4xl font-extrabold leading-tight">
          {hw.emoji} {hw.title}
        </h1>
        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-5 flex-1 overflow-hidden rounded-full border-[3px] border-ink/10 bg-white">
            <motion.div
              className="h-full rounded-full bg-teal"
              initial={false}
              animate={{ width: `${(done / total) * 100}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
          <span className="font-display text-lg font-extrabold text-ink-soft">
            {done}/{total}
          </span>
        </div>
      </motion.div>

      <div className="mt-6 flex flex-col gap-3">
        {hw.problemIds.map((pid, i) => {
          const p = PROBLEMS[pid];
          const outcome = completed[pid];
          return (
            <motion.div
              key={pid}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                to={`/solve/${pid}`}
                className="flex items-center gap-4 rounded-3xl border-[3px] border-ink/10 bg-white p-5 shadow-[0_5px_0_rgba(63,46,86,0.08)] transition-transform hover:scale-[1.01] active:translate-y-[3px] active:shadow-none"
              >
                <span className="text-3xl">{p.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-extrabold">
                    {p.title}
                  </span>
                  <span className="block truncate text-sm font-semibold text-ink-soft">
                    {p.statement}
                  </span>
                </span>
                <StatusChip outcome={outcome} isNext={nextUp?.id === pid} />
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 flex items-end gap-2">
        <Cora expression={allDone ? "celebrating" : "curious"} size={100} />
        <div className="mb-10">
          <SpeechBubble
            text={
              allDone
                ? "Homework complete! Every problem scanned, every mix-up squashed! 🏆"
                : `Ready for ${nextUp.title}? Let's scan that thinking!`
            }
          />
        </div>
        <div className="mb-4 ml-auto">
          {allDone ? (
            <Link to="/">
              <ChunkyButton variant="teal">See my brain grow 🧠</ChunkyButton>
            </Link>
          ) : (
            <Link to={`/solve/${nextUp.id}`}>
              <ChunkyButton>
                {done === 0 ? "Start homework 🚀" : "Keep going ➡️"}
              </ChunkyButton>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusChip({
  outcome,
  isNext,
}: {
  outcome: "repaired" | "solid" | undefined;
  isNext: boolean;
}) {
  if (outcome === "repaired")
    return (
      <span className="shrink-0 rounded-full border-2 border-teal/40 bg-teal-soft px-3 py-1.5 font-display text-sm font-extrabold text-teal-dark">
        Fixed a mix-up 💡
      </span>
    );
  if (outcome === "solid")
    return (
      <span className="shrink-0 rounded-full border-2 border-teal/40 bg-teal-soft px-3 py-1.5 font-display text-sm font-extrabold text-teal-dark">
        Solid ✓
      </span>
    );
  if (isNext)
    return (
      <span className="shrink-0 rounded-full border-2 border-coral/40 bg-coral-soft px-3 py-1.5 font-display text-sm font-extrabold text-coral-dark anim-bounce-soft">
        Up next!
      </span>
    );
  return (
    <span className="shrink-0 rounded-full border-2 border-ink/10 bg-cloud-soft px-3 py-1.5 font-display text-sm font-extrabold text-ink-soft">
      Not scanned
    </span>
  );
}
