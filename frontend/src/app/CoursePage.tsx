import { Suspense, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { useApp } from "../state/store";
import {
  homeworkProgress,
  firstUnfinished,
  getCourse,
  homeworksInCourse,
} from "../scenarios/homework";
import { buildCourseGraph, courseProgress } from "../scenarios/knowledgeGraph";
import type { Homework, HomeworkLibrary } from "../scenarios/types";
import type { Completions } from "../scenarios/homework";
import { backend } from "../backend";
import { useHomeworkLibrary } from "../backend/useHomeworkLibrary";
import { BrainGraph } from "../components/brain-3d/LazyBrainGraph";
import { Cora } from "../components/mascot/Cora";
import { SpeechBubble } from "../components/mascot/SpeechBubble";
import { ChunkyButton } from "../components/ui/ChunkyButton";

export function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const completed = useApp((s) => s.completedProblems);
  const { library, loading, refresh } = useHomeworkLibrary();
  const course = courseId ? getCourse(courseId, library) : undefined;

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <p className="font-display text-2xl font-extrabold text-ink-soft">
          Loading course...
        </p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <Cora expression="thinking" size={130} />
        <p className="font-display text-2xl font-extrabold">
          Hmm, I can't find that course!
        </p>
        <Link to="/">
          <ChunkyButton variant="ghost">Back to my courses 📁</ChunkyButton>
        </Link>
      </div>
    );
  }

  const homeworks = homeworksInCourse(course.id, library);
  const graph = buildCourseGraph(course, library, completed);
  const { done, total } = courseProgress(course, library, completed);
  const strongConcepts = graph.nodes.filter((n) => !n.wobbly).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between">
        <Link
          to="/"
          className="font-display text-lg font-extrabold text-ink-soft transition-colors hover:text-ink"
        >
          ← My courses
        </Link>
        <span className="rounded-full border-[3px] border-ink/10 bg-white px-4 py-1.5 font-display text-sm font-extrabold text-ink-soft">
          {course.subject}
        </span>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6"
      >
        <h1 className="font-display text-4xl font-extrabold leading-tight">
          {course.emoji} {course.title}
        </h1>
        <p className="mt-2 max-w-[60ch] text-lg font-semibold text-ink-soft">
          This is your {course.title} brain. Every concept you practice becomes
          a neuron, and everything in this course wires together — that's how
          Cora personalizes your guidance.
        </p>
      </motion.div>

      {/* The interactive 3D brain for this course */}
      <div className="relative mt-6">
        <Suspense
          fallback={
            <div className="h-[420px] rounded-3xl border-[3px] border-ink/10 bg-gradient-to-b from-[#f3eefe] to-[#eaf6ff]" />
          }
        >
          <BrainGraph
            graph={graph}
            color={course.color}
            interactive
            className="h-[420px]"
          />
        </Suspense>
        <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge>{graph.nodes.length} concepts 🧠</Badge>
          <Badge>{graph.edges.length} connections ✨</Badge>
          <Badge>{strongConcepts} strong 💪</Badge>
        </div>
        <p className="pointer-events-none absolute bottom-3 right-4 rounded-full bg-white/80 px-3 py-1 font-display text-xs font-extrabold text-ink-soft">
          drag to spin · scroll to zoom
        </p>
      </div>

      {/* Homework in this course + scoped upload */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-extrabold">
            Homework in this course 📚
          </h2>
          <PdfUpload courseId={course.id} onImported={refresh} />
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {homeworks.length === 0 ? (
            <div className="rounded-3xl border-[3px] border-dashed border-ink/15 bg-white/60 p-6 text-center">
              <p className="font-display text-lg font-extrabold text-ink-soft">
                No homework yet
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-soft">
                Upload a worksheet PDF to grow this brain.
              </p>
            </div>
          ) : (
            homeworks.map((hw, i) => (
              <HomeworkRow
                key={hw.id}
                homework={hw}
                library={library}
                completedProblems={completed}
                delay={0.08 + i * 0.05}
              />
            ))
          )}
        </div>
      </section>

      <div className="pointer-events-none mt-8 flex items-end gap-2">
        <Cora expression={done === total && total > 0 ? "celebrating" : "curious"} size={92} />
        <div className="mb-8">
          <SpeechBubble
            text={
              total === 0
                ? "Upload homework and I'll start wiring up this brain!"
                : done === total
                  ? "Every problem scanned — this brain is glowing! 🌟"
                  : `${done} of ${total} done. Each one adds a connection!`
            }
          />
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border-2 border-ink/10 bg-white/85 px-3 py-1 font-display text-xs font-extrabold text-ink">
      {children}
    </span>
  );
}

function PdfUpload({
  courseId,
  onImported,
}: {
  courseId: string;
  onImported: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStatus("uploading");
    setMessage("");
    try {
      const result = await backend.importHomeworkPdf(file, courseId);
      await onImported();
      navigate(`/homework/${result.homework.id}`);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Could not import that PDF.",
      );
    }
  }

  return (
    <label className="relative inline-flex cursor-pointer">
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={onFileChange}
        disabled={status === "uploading"}
      />
      <span className="rounded-full border-[3px] border-lav/40 bg-lav-soft px-4 py-2 font-display text-sm font-extrabold text-lav-dark shadow-[0_3px_0_rgba(63,46,86,0.08)] transition-transform hover:scale-[1.02] active:translate-y-[2px] active:shadow-none">
        {status === "uploading" ? "Reading PDF..." : "Upload homework PDF"}
      </span>
      {status === "error" && (
        <span className="absolute right-0 top-full z-10 mt-2 w-72 rounded-2xl border-[3px] border-coral/30 bg-white p-3 text-sm font-bold text-coral-dark shadow-[0_5px_0_rgba(63,46,86,0.08)]">
          {message}
        </span>
      )}
    </label>
  );
}

function HomeworkRow({
  homework,
  library,
  completedProblems,
  delay,
}: {
  homework: Homework;
  library: HomeworkLibrary;
  completedProblems: Completions;
  delay: number;
}) {
  const { done, total } = homeworkProgress(homework, completedProblems);
  const nextUp = firstUnfinished(homework, completedProblems, library);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center gap-5 rounded-3xl border-[3px] border-ink/10 bg-white p-5 shadow-[0_5px_0_rgba(63,46,86,0.08)]"
    >
      <span className="text-4xl">{homework.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-extrabold">{homework.title}</p>
        <p className="text-sm font-semibold text-ink-soft">
          {homework.subject} · {homework.due}
          {homework.sourceFileName ? ` · ${homework.sourceFileName}` : ""}
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <div className="h-3.5 max-w-56 flex-1 overflow-hidden rounded-full border-2 border-ink/10 bg-cloud-soft">
            <div
              className="h-full rounded-full bg-teal transition-[width] duration-700"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
          <span className="font-display text-sm font-extrabold text-ink-soft">
            {done}/{total}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        {nextUp ? (
          <Link to={`/solve/${nextUp.id}`}>
            <ChunkyButton>
              {done === 0 ? "Start homework 🚀" : "Keep going ➡️"}
            </ChunkyButton>
          </Link>
        ) : (
          <span className="rounded-full border-2 border-teal/40 bg-teal-soft px-4 py-2 text-center font-display font-extrabold text-teal-dark">
            All done! 🏆
          </span>
        )}
        <Link to={`/homework/${homework.id}`} className="text-center">
          <span className="font-display text-sm font-extrabold text-ink-soft underline decoration-2 underline-offset-2 hover:text-ink">
            See all problems
          </span>
        </Link>
      </div>
    </motion.div>
  );
}
