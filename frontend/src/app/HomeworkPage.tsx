import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  getHomework,
  homeworkProgress,
  firstUnfinished,
  courseForHomework,
} from "../scenarios/homework";
import { useApp } from "../state/store";
import { useHomeworkLibrary } from "../backend/useHomeworkLibrary";
import { Cora } from "../components/mascot/Cora";
import { SpeechBubble } from "../components/mascot/SpeechBubble";
import { ChunkyButton } from "../components/ui/ChunkyButton";
import { BrandLogo } from "../components/brand/BrandLogo";

export function HomeworkPage() {
  const { homeworkId } = useParams<{ homeworkId: string }>();
  const completed = useApp((s) => s.completedProblems);
  const { library, loading } = useHomeworkLibrary();
  const hw = homeworkId ? getHomework(homeworkId, library) : undefined;

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <p className="font-display text-2xl font-extrabold text-ink-soft">
          Loading homework...
        </p>
      </div>
    );
  }

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
  const nextUp = firstUnfinished(hw, completed, library);
  const allDone = !nextUp;
  const course = hw.courseId
    ? { id: hw.courseId }
    : courseForHomework(hw.id, library);
  const backTo = course ? `/course/${course.id}` : "/";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BrandLogo size="sm" linked className="hidden sm:block" />
          <Link
            to={backTo}
            className="font-display text-lg font-extrabold text-ink-soft transition-colors hover:text-ink"
          >
            ← Back to course
          </Link>
        </div>
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
        {hw.learningContext?.sources.length ? (
          <section className="mt-4 rounded-3xl border-[3px] border-sky/30 bg-sky-soft/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 font-display text-xs font-extrabold text-ink-soft">
                Web-grounded topic
              </span>
              <strong className="font-display text-lg text-ink">
                {hw.learningContext.mainTopic}
              </strong>
            </div>
            {hw.learningContext.summary ? (
              <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-soft">
                {hw.learningContext.summary}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-sky-dark">
              {hw.learningContext.sources.slice(0, 3).map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-sky/50 underline-offset-2 hover:text-ink"
                >
                  {source.title} ↗
                </a>
              ))}
            </div>
          </section>
        ) : null}
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
          const p = library.problems[pid];
          if (!p) return null;
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
            <Link to={backTo}>
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
