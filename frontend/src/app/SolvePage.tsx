import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import type { Diagnosis, HomeworkLibrary, Problem } from "../scenarios/types";
import { problemPosition } from "../scenarios/homework";
import { backend } from "../backend";
import { useHomeworkLibrary } from "../backend/useHomeworkLibrary";
import { useStage, STAGES, stageIndex } from "../stages/stageMachine";
import { useApp } from "../state/store";
import { PathCanvas } from "../components/thought-path/PathCanvas";
import { Cora } from "../components/mascot/Cora";
import { SpeechBubble } from "../components/mascot/SpeechBubble";
import { ChunkyButton } from "../components/ui/ChunkyButton";
import { ProblemCard, StageCard } from "../components/panels/StageRail";
import {
  coraLine,
  coraExpression,
  READING_WAIT_LINES,
} from "../lib/coraScript";
import { miniBurst, bigCelebration } from "../components/celebrate/confetti";
import { UNDERSTANDING_MASTERY_THRESHOLD } from "../learning/understanding";

/** Remounts the scan for every problem so all state starts fresh */
export function SolvePage() {
  const { problemId } = useParams<{ problemId: string }>();
  if (!problemId) return <MissingProblem />;
  return <SolveScan key={problemId} problemId={problemId} />;
}

function SolveScan({ problemId }: { problemId: string }) {
  const { stage, probeOutcome, next, prev, goTo, reset } = useStage();
  const markCompleted = useApp((s) => s.markCompleted);
  const addUnderstandingSignal = useApp((s) => s.addUnderstandingSignal);
  const { library } = useHomeworkLibrary();
  const understandingScore = useApp(
    (s) => s.understandingByProblem[problemId]?.score ?? 0,
  );
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [analyzeFailed, setAnalyzeFailed] = useState(false);
  const [reasoning, setReasoning] = useState("");
  const celebratedRef = useRef(false);

  // Fresh scan per mount; load the problem and pre-fill the reasoning box
  useEffect(() => {
    reset();
    backend
      .getProblem(problemId)
      .then((p) => {
        setProblem(p);
        setReasoning(p.sampleReasoning ?? "");
      })
      .catch(() => setNotFound(true));
    return () => reset();
  }, [problemId, reset]);

  const submit = useCallback(async () => {
    setAnalyzeFailed(false);
    goTo("reading");
    addUnderstandingSignal(problemId, {
      kind: "attempt",
      label: "Tried the problem",
      delta: 20,
      evidence: "Student submitted an answer with reasoning.",
    });
    try {
      const result = await backend.analyzeReasoning(problemId, reasoning);
      setDiagnosis(result);
    } catch (err) {
      // Custom problems have no seeded fallback, so a live failure lands
      // here; seeded problems never do (live.ts falls back silently).
      console.warn("[solve] analyze failed", err);
      setAnalyzeFailed(true);
    }
  }, [addUnderstandingSignal, goTo, problemId, reasoning]);

  // Auto-advance the cinematic opening. A solid path (no mix-up) skips the
  // whole diagnosis arc and goes straight to the celebration.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (stage === "reading" && diagnosis) {
      t = setTimeout(() => goTo("mapping"), 700);
    } else if (stage === "mapping" && diagnosis) {
      t = setTimeout(() => goTo("scanning"), diagnosis.steps.length * 450 + 1400);
    } else if (stage === "scanning" && diagnosis) {
      t = setTimeout(
        () => goTo(diagnosis.mixup ? "mixupFound" : "repairing"),
        2100,
      );
    }
    return () => clearTimeout(t);
  }, [stage, diagnosis, goTo]);

  // Celebration side effects, fired once per completed scan
  useEffect(() => {
    if (!problem || !diagnosis) return;
    if (stage === "confirmed" && probeOutcome !== "correct") miniBurst();
    // A solid diagnosis (no mix-up) skips the whole diagnosis arc, so the
    // understanding score can't reach the mastery threshold on this scan —
    // solid reasoning alone earns completion. The mixup path still requires
    // mastery, which RepairLab provides the route to.
    const masteryReached =
      diagnosis.mixup === null ||
      understandingScore >= UNDERSTANDING_MASTERY_THRESHOLD;
    if (stage === "celebrated" && masteryReached && !celebratedRef.current) {
      celebratedRef.current = true;
      bigCelebration();
      markCompleted(problem.id, diagnosis.mixup ? "repaired" : "solid");
      addUnderstandingSignal(problem.id, {
        kind: diagnosis.mixup ? "lesson_reflection" : "transfer",
        label: diagnosis.mixup ? "Completed repair loop" : "Solid reasoning",
        delta: diagnosis.mixup ? 12 : 24,
        evidence: diagnosis.mixup
          ? "Student completed the scan after a diagnosed mix-up."
          : "Student reasoning was solid on the first scan.",
      });
      backend.recordLearningSession(
        problem.title,
        diagnosis.mixup
          ? `Found and repaired the ${diagnosis.mixup.hypothesis.name}`
          : "Solid reasoning on the first try",
        diagnosis.mixup ? 95 : 100,
      );
    }
    if (stage !== "celebrated") celebratedRef.current = false;
  }, [
    stage,
    probeOutcome,
    problem,
    diagnosis,
    markCompleted,
    addUnderstandingSignal,
    understandingScore,
  ]);

  // Presenter keys: arrows drive the demo, r restarts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;
      if (e.key === "ArrowRight" && stage !== "intro" && diagnosis) {
        // Solid path has no diagnosis arc to step through
        if (stage === "scanning" && !diagnosis.mixup) goTo("repairing");
        else next();
      }
      if (e.key === "ArrowLeft") prev();
      if (e.key === "r") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, diagnosis, next, prev, goTo, reset]);

  if (notFound) return <MissingProblem />;
  if (!problem) return null;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar problem={problem} library={library} />
      {stage === "intro" ? (
        <IntroLayout
          problem={problem}
          reasoning={reasoning}
          setReasoning={setReasoning}
          onSubmit={submit}
        />
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className="relative min-w-0 flex-1">
            {diagnosis ? (
              <PathCanvas diagnosis={diagnosis} />
            ) : analyzeFailed ? (
              <AnalyzeFailed
                onRetry={submit}
                onBack={() => {
                  setAnalyzeFailed(false);
                  reset();
                }}
              />
            ) : (
              <ReadingOverlay />
            )}
            {/* Cora narrates from the bottom-left corner of the canvas */}
            <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-end gap-1">
              <Cora expression={coraExpression(stage)} size={110} />
              <div className="mb-14">
                <SpeechBubble
                  text={coraLine(stage, probeOutcome, !!diagnosis?.mixup)}
                />
              </div>
            </div>
          </div>
          <aside className="flex w-[380px] shrink-0 flex-col gap-4 overflow-y-auto border-l-[3px] border-ink/5 bg-cream p-4">
            <ProblemCard problem={problem} />
            {diagnosis && (
              <StageCard
                problem={problem}
                diagnosis={diagnosis}
                library={library}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function TopBar({
  problem,
  library,
}: {
  problem: Problem;
  library: HomeworkLibrary;
}) {
  const stage = useStage((s) => s.stage);
  const pos = problemPosition(problem.id, library);
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b-[3px] border-ink/5 bg-white px-5">
      <Link
        to={pos ? `/homework/${pos.homework.id}` : "/"}
        className="font-display text-lg font-extrabold text-ink-soft transition-colors hover:text-ink"
      >
        ← {pos ? pos.homework.title : "My brain"}
      </Link>
      <span className="font-display text-xl font-extrabold">
        {pos
          ? `Problem ${pos.index} of ${pos.total} 🫧`
          : "Brain Scan Adventure 🫧"}
      </span>
      {/* Progress dots: one per stage, filled as the scan advances */}
      <div className="flex items-center gap-1.5">
        {STAGES.map((s, i) => (
          <span
            key={s}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i <= stageIndex(stage) ? "bg-coral" : "bg-cloud-soft"
            }`}
          />
        ))}
      </div>
    </header>
  );
}

function IntroLayout({
  problem,
  reasoning,
  setReasoning,
  onSubmit,
}: {
  problem: Problem;
  reasoning: string;
  setReasoning: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-4xl items-end gap-8">
        <div className="hidden shrink-0 flex-col items-center md:flex">
          <SpeechBubble text={coraLine("intro", null)} />
          <div className="mt-3">
            <Cora expression="curious" size={150} />
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0 flex-1"
        >
          <div className="rounded-3xl border-[3px] border-ink/10 bg-white p-6 shadow-[0_6px_0_rgba(63,46,86,0.08)]">
            <p className="font-display text-2xl font-extrabold">
              {problem.emoji} {problem.title}
            </p>
            <p className="mt-3 font-semibold leading-relaxed text-ink-soft">
              {problem.statement}
            </p>
          </div>
          <div className="mt-4 rounded-3xl border-[3px] border-lav/40 bg-lav-soft p-6 shadow-[0_6px_0_rgba(63,46,86,0.08)]">
            <label
              htmlFor="reasoning"
              className="font-display text-lg font-extrabold"
            >
              What did your brain do? 💭
            </label>
            <p className="mt-1 text-sm font-semibold text-ink-soft">
              Explain your thinking, not just your answer.
            </p>
            <textarea
              id="reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              rows={3}
              className="mt-3 w-full resize-none rounded-2xl border-[3px] border-ink/10 bg-white p-4 font-semibold leading-relaxed outline-none transition-colors focus:border-lav"
            />
            <ChunkyButton
              className="mt-4 w-full"
              onClick={onSubmit}
              disabled={reasoning.trim().length < 10}
            >
              Scan my thinking! 🔍
            </ChunkyButton>
            {reasoning.trim().length < 10 && (
              <p className="mt-2 text-center text-sm font-bold text-ink-soft">
                Tell me a little more about how you got there so I can scan it! ✍️
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ReadingOverlay() {
  // Live analysis can take up to ~45s; step through progressively more
  // reassuring copy so the wait never feels stuck. Text swaps aren't
  // animated (so nothing new to gate on prefers-reduced-motion); the
  // existing pulse on the line is kept as-is.
  const [lineIndex, setLineIndex] = useState(0);
  useEffect(() => {
    const timers = READING_WAIT_LINES.filter((l) => l.afterMs > 0).map(
      (line, i) => setTimeout(() => setLineIndex(i + 1), line.afterMs),
    );
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center">
        <Cora expression="thinking" size={160} />
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="mt-4 font-display text-xl font-extrabold text-ink-soft"
        >
          {READING_WAIT_LINES[lineIndex].text}
        </motion.p>
      </div>
    </div>
  );
}

function AnalyzeFailed({
  onRetry,
  onBack,
}: {
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex max-w-sm flex-col items-center text-center">
        <Cora expression="thinking" size={140} />
        <p className="mt-4 font-display text-xl font-extrabold">
          My scanner glitched! 🔌
        </p>
        <p className="mt-2 text-sm font-semibold text-ink-soft">
          I couldn't finish reading your thinking. Let's give it another go —
          your words are still here.
        </p>
        <div className="mt-4 flex gap-2.5">
          <ChunkyButton onClick={onRetry}>Scan again 🔍</ChunkyButton>
          <ChunkyButton variant="ghost" onClick={onBack}>
            Edit my thinking
          </ChunkyButton>
        </div>
      </div>
    </div>
  );
}

function MissingProblem() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <Cora expression="thinking" size={130} />
      <p className="font-display text-2xl font-extrabold">
        Hmm, I can't find that problem!
      </p>
      <Link to="/">
        <ChunkyButton variant="ghost">Back to my brain 🧠</ChunkyButton>
      </Link>
    </div>
  );
}
