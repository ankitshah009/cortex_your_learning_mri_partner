import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router-dom";
import type { Scenario } from "../../scenarios/types";
import { useStage, type Stage } from "../../stages/stageMachine";
import { ChunkyButton } from "../ui/ChunkyButton";
import { useCountUp } from "../../lib/useCountUp";

function Card({
  children,
  tone = "white",
}: {
  children: React.ReactNode;
  tone?: "white" | "sun" | "teal" | "lav";
}) {
  const tones = {
    white: "bg-white border-ink/10",
    sun: "bg-sun-soft border-sun-dark/40",
    teal: "bg-teal-soft border-teal/40",
    lav: "bg-lav-soft border-lav/40",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`rounded-3xl border-[3px] p-5 shadow-[0_5px_0_rgba(63,46,86,0.08)] ${tones[tone]}`}
    >
      {children}
    </motion.div>
  );
}

function ConfidenceMeter({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value);
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold text-ink-soft">{label}</span>
        <span className="font-display text-xl font-extrabold text-lav-dark">
          {shown}%
        </span>
      </div>
      <div className="mt-1.5 h-4 overflow-hidden rounded-full border-2 border-ink/10 bg-white">
        <motion.div
          className="h-full rounded-full bg-lav"
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function ProblemCard({ scenario }: { scenario: Scenario }) {
  return (
    <div className="rounded-3xl border-[3px] border-ink/10 bg-white p-5 shadow-[0_5px_0_rgba(63,46,86,0.08)]">
      <p className="font-display text-lg font-extrabold">
        {scenario.emoji} {scenario.title}
      </p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-soft">
        {scenario.problem}
      </p>
    </div>
  );
}

/** The stage-specific card shown under the problem in the right rail */
export function StageCard({ scenario }: { scenario: Scenario }) {
  const { stage, probeOutcome, goTo, answerProbe, reset } = useStage();

  return (
    <AnimatePresence mode="wait">
      <div key={stage}>{renderStage(stage)}</div>
    </AnimatePresence>
  );

  function renderStage(stage: Stage) {
    switch (stage) {
      case "mapping":
      case "scanning":
        return (
          <Card>
            <p className="font-display text-lg font-extrabold">
              {stage === "mapping" ? "Building your thought path 🫧" : "Tracing your steps 🔎"}
            </p>
            <p className="mt-2 text-sm font-semibold text-ink-soft">
              Every bubble is one thing your brain did. Watch closely...
            </p>
          </Card>
        );

      case "mixupFound":
        return (
          <Card tone="sun">
            <p className="font-display text-lg font-extrabold">
              Found something! 👀
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed">
              One step on your path is wobbly. It's a hidden step your brain
              used without telling you!
            </p>
            <ChunkyButton
              variant="coral"
              className="mt-4 w-full"
              onClick={() => goTo("hypothesis")}
            >
              What is it, Cora?
            </ChunkyButton>
          </Card>
        );

      case "hypothesis":
        return (
          <Card tone="sun">
            <p className="text-xs font-extrabold uppercase tracking-wide text-sun-dark">
              Cora's hunch
            </p>
            <p className="mt-1 font-display text-xl font-extrabold">
              {scenario.hypothesis.name} 🥤
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed">
              {scenario.hypothesis.kidExplanation}
            </p>
            <div className="mt-3 rounded-2xl border-2 border-lav/40 bg-lav-soft p-3">
              <p className="text-xs font-extrabold text-lav-dark">
                🧠 Cora remembers...
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug">
                {scenario.memoryEvidence}
              </p>
            </div>
            <ConfidenceMeter
              value={scenario.hypothesis.confidenceBefore}
              label="How sure is Cora?"
            />
            <ChunkyButton
              variant="lav"
              className="mt-4 w-full"
              onClick={() => goTo("probing")}
            >
              Test the hunch!
            </ChunkyButton>
          </Card>
        );

      case "probing":
        return (
          <Card tone="lav">
            <p className="text-xs font-extrabold uppercase tracking-wide text-lav-dark">
              Quick experiment
            </p>
            <p className="mt-2 font-display text-lg font-extrabold leading-snug">
              {scenario.probe.question}
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              {scenario.probe.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => answerProbe(opt.kind)}
                  className="rounded-2xl border-[3px] border-ink/10 bg-white px-4 py-3 text-left font-display text-lg font-extrabold shadow-[0_4px_0_rgba(63,46,86,0.1)] transition-transform hover:scale-[1.02] active:translate-y-[3px] active:shadow-none"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Card>
        );

      case "confirmed": {
        const gotItRight = probeOutcome === "correct";
        return (
          <Card tone={gotItRight ? "teal" : "sun"}>
            <p className="font-display text-2xl font-extrabold leading-tight">
              {gotItRight ? "Plot twist! 🌀" : "WE FOUND THE MIX-UP! 🎉"}
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed">
              {gotItRight
                ? "You weighted the time correctly this round! So the first answer was probably a slip, not a mix-up. Let's make this idea super solid anyway."
                : `It's the ${scenario.hypothesis.name}! Your brain averaged the speeds without checking the time. Finding it is the hard part, fixing it is easy!`}
            </p>
            <ConfidenceMeter
              value={
                gotItRight
                  ? scenario.hypothesis.confidenceIfCorrect
                  : scenario.hypothesis.confidenceAfter
              }
              label="How sure is Cora now?"
            />
            <ChunkyButton
              variant="teal"
              className="mt-4 w-full"
              onClick={() => goTo("lesson")}
            >
              Show me the tiny fix
            </ChunkyButton>
          </Card>
        );
      }

      case "lesson":
        return (
          <Card tone="teal">
            <p className="font-display text-lg font-extrabold">
              {scenario.lesson.title}
            </p>
            <ol className="mt-3 flex flex-col gap-2.5">
              {scenario.lesson.steps.map((step, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.35 }}
                  className="flex gap-2.5 text-sm font-semibold leading-snug"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal font-display text-xs font-extrabold text-white">
                    {i + 1}
                  </span>
                  {step}
                </motion.li>
              ))}
            </ol>
            <ChunkyButton
              variant="coral"
              className="mt-4 w-full"
              onClick={() => goTo("repairing")}
            >
              Repair my brain! 🔧
            </ChunkyButton>
          </Card>
        );

      case "repairing":
        return (
          <Card tone="teal">
            <p className="font-display text-lg font-extrabold">
              Repairing... ⚡
            </p>
            <p className="mt-2 text-sm font-semibold text-ink-soft">
              Watch the wobbly bubble turn into a lightbulb, and everything
              after it lights back up!
            </p>
          </Card>
        );

      case "celebrated":
        return (
          <Card tone="teal">
            <p className="font-display text-2xl font-extrabold leading-tight">
              {scenario.celebration.headline} 🌱
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed">
              {scenario.celebration.sub}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border-2 border-teal/40 bg-white px-3 py-1.5 font-display text-sm font-extrabold text-teal-dark">
                +1 connection ✨
              </span>
              <span className="rounded-full border-2 border-teal/40 bg-white px-3 py-1.5 font-display text-sm font-extrabold text-teal-dark">
                1 mix-up repaired 💡
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              <Link to="/" className="block">
                <ChunkyButton variant="teal" className="w-full">
                  Back to my brain 🧠
                </ChunkyButton>
              </Link>
              <ChunkyButton variant="ghost" className="w-full" onClick={reset}>
                Replay the scan
              </ChunkyButton>
            </div>
          </Card>
        );

      default:
        return null;
    }
  }
}
