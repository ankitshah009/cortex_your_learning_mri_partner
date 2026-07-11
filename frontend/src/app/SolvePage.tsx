import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import type { Scenario } from "../scenarios/types";
import { averageSpeed } from "../scenarios/average-speed";
import { backend } from "../backend/mock";
import { useStage, STAGES, stageIndex } from "../stages/stageMachine";
import { useApp } from "../state/store";
import { PathCanvas } from "../components/thought-path/PathCanvas";
import { Cora } from "../components/mascot/Cora";
import { SpeechBubble } from "../components/mascot/SpeechBubble";
import { ChunkyButton } from "../components/ui/ChunkyButton";
import { ProblemCard, StageCard } from "../components/panels/StageRail";
import { coraLine, coraExpression } from "../lib/coraScript";
import { miniBurst, bigCelebration } from "../components/celebrate/confetti";

export function SolvePage() {
  const { stage, probeOutcome, next, prev, goTo, reset } = useStage();
  const markRepaired = useApp((s) => s.markRepaired);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [reasoning, setReasoning] = useState(averageSpeed.sampleReasoning);
  const celebratedRef = useRef(false);

  // Fresh scan whenever the page mounts
  useEffect(() => {
    reset();
    return () => reset();
  }, [reset]);

  const submit = useCallback(async () => {
    goTo("reading");
    const result = await backend.analyzeReasoning(averageSpeed.id, reasoning);
    setScenario(result);
  }, [goTo, reasoning]);

  // Auto-advance the cinematic opening (mapping and scanning play themselves);
  // everything after mixupFound is advanced by the student.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (stage === "reading" && scenario) {
      t = setTimeout(() => goTo("mapping"), 700);
    } else if (stage === "mapping" && scenario) {
      t = setTimeout(() => goTo("scanning"), scenario.steps.length * 450 + 1400);
    } else if (stage === "scanning") {
      t = setTimeout(() => goTo("mixupFound"), 2100);
    } else if (stage === "repairing") {
      t = setTimeout(() => goTo("celebrated"), 2600);
    }
    return () => clearTimeout(t);
  }, [stage, scenario, goTo]);

  // Celebration side effects, fired once per state
  useEffect(() => {
    if (stage === "confirmed" && probeOutcome !== "correct") miniBurst();
    if (stage === "celebrated" && !celebratedRef.current) {
      celebratedRef.current = true;
      bigCelebration();
      markRepaired(averageSpeed.id);
      backend.recordLearningSession(
        averageSpeed.title,
        "Found and repaired the Speed-Smoothie Mix-up",
        95,
      );
    }
    if (stage !== "celebrated") celebratedRef.current = false;
  }, [stage, probeOutcome, markRepaired]);

  // Presenter keys: arrows drive the demo, r restarts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;
      if (e.key === "ArrowRight" && stage !== "intro" && scenario) next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "r") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, scenario, next, prev, reset]);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      {stage === "intro" ? (
        <IntroLayout
          reasoning={reasoning}
          setReasoning={setReasoning}
          onSubmit={submit}
        />
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className="relative min-w-0 flex-1">
            {scenario ? (
              <PathCanvas scenario={scenario} />
            ) : (
              <ReadingOverlay />
            )}
            {/* Cora narrates from the bottom-left corner of the canvas */}
            <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-end gap-1">
              <Cora expression={coraExpression(stage)} size={110} />
              <div className="mb-14">
                <SpeechBubble text={coraLine(stage, probeOutcome)} />
              </div>
            </div>
          </div>
          <aside className="flex w-[380px] shrink-0 flex-col gap-4 overflow-y-auto border-l-[3px] border-ink/5 bg-cream p-4">
            <ProblemCard scenario={averageSpeed} />
            {scenario && <StageCard scenario={scenario} />}
          </aside>
        </div>
      )}
    </div>
  );
}

function TopBar() {
  const stage = useStage((s) => s.stage);
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b-[3px] border-ink/5 bg-white px-5">
      <Link
        to="/"
        className="font-display text-lg font-extrabold text-ink-soft transition-colors hover:text-ink"
      >
        ← My brain
      </Link>
      <span className="font-display text-xl font-extrabold">
        Brain Scan Adventure 🫧
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
  reasoning,
  setReasoning,
  onSubmit,
}: {
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
              {averageSpeed.emoji} {averageSpeed.title}
            </p>
            <p className="mt-3 font-semibold leading-relaxed text-ink-soft">
              {averageSpeed.problem}
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ReadingOverlay() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center">
        <Cora expression="thinking" size={160} />
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="mt-4 font-display text-xl font-extrabold text-ink-soft"
        >
          Cora is reading your thinking...
        </motion.p>
      </div>
    </div>
  );
}
