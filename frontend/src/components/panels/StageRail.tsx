import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router-dom";
import type {
  Diagnosis,
  HomeworkLibrary,
  Problem,
  RepairConversationTurn,
  UnderstandingSignal,
} from "../../scenarios/types";
import {
  nextProblemAfter,
  homeworkForProblem,
  SEEDED_LIBRARY,
} from "../../scenarios/homework";
import { backend } from "../../backend";
import { useApp } from "../../state/store";
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

export function ProblemCard({ problem }: { problem: Problem }) {
  return (
    <div className="rounded-3xl border-[3px] border-ink/10 bg-white p-5 shadow-[0_5px_0_rgba(63,46,86,0.08)]">
      <p className="font-display text-lg font-extrabold">
        {problem.emoji} {problem.title}
      </p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-soft">
        {problem.statement}
      </p>
    </div>
  );
}

/** The stage-specific card shown under the problem in the right rail */
export function StageCard({
  problem,
  diagnosis,
  library = SEEDED_LIBRARY,
}: {
  problem: Problem;
  diagnosis: Diagnosis;
  library?: HomeworkLibrary;
}) {
  const { stage, probeOutcome, goTo, answerProbe, reset } = useStage();
  const completed = useApp((s) => s.completedProblems);
  const understanding = useApp(
    (s) => s.understandingByProblem[problem.id] ?? { score: 0, signals: [] },
  );
  const addUnderstandingSignal = useApp((s) => s.addUnderstandingSignal);
  const mixup = diagnosis.mixup;

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
        if (!mixup) return null;
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
        if (!mixup) return null;
        return (
          <Card tone="sun">
            <p className="text-xs font-extrabold uppercase tracking-wide text-sun-dark">
              Cora's hunch
            </p>
            <p className="mt-1 font-display text-xl font-extrabold">
              {mixup.hypothesis.name} 🫧
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed">
              {mixup.hypothesis.kidExplanation}
            </p>
            <div className="mt-3 rounded-2xl border-2 border-lav/40 bg-lav-soft p-3">
              <p className="text-xs font-extrabold text-lav-dark">
                🧠 Cora remembers...
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug">
                {mixup.memoryEvidence}
              </p>
            </div>
            <ConfidenceMeter
              value={mixup.hypothesis.confidenceBefore}
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
        if (!mixup) return null;
        return (
          <Card tone="lav">
            <p className="text-xs font-extrabold uppercase tracking-wide text-lav-dark">
              Quick experiment
            </p>
            <p className="mt-2 font-display text-lg font-extrabold leading-snug">
              {mixup.probe.question}
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              {mixup.probe.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    addUnderstandingSignal(problem.id, {
                      kind: "probe_answer",
                      label:
                        opt.kind === "correct"
                          ? "Answered the probe"
                          : "Tested the hunch",
                      delta:
                        opt.kind === "correct" ? 15 : opt.kind === "mixup" ? 5 : 3,
                      evidence: `Student chose "${opt.label}" on the diagnostic probe.`,
                    });
                    answerProbe(opt.kind);
                  }}
                  className="rounded-2xl border-[3px] border-ink/10 bg-white px-4 py-3 text-left font-display text-lg font-extrabold shadow-[0_4px_0_rgba(63,46,86,0.1)] transition-transform hover:scale-[1.02] active:translate-y-[3px] active:shadow-none"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Card>
        );

      case "confirmed": {
        if (!mixup) return null;
        const gotItRight = probeOutcome === "correct";
        return (
          <Card tone={gotItRight ? "teal" : "sun"}>
            <p className="font-display text-2xl font-extrabold leading-tight">
              {gotItRight ? "Plot twist! 🌀" : "WE FOUND THE MIX-UP! 🎉"}
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed">
              {gotItRight
                ? "You got this one right! So the first answer was probably a slip, not a mix-up. Let's make this idea super solid anyway."
                : `It's the ${mixup.hypothesis.name}! ${mixup.confirmLine}`}
            </p>
            <ConfidenceMeter
              value={
                gotItRight
                  ? mixup.hypothesis.confidenceIfCorrect
                  : mixup.hypothesis.confidenceAfter
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
        if (!mixup) return null;
        return (
          <Card tone="teal">
            <p className="font-display text-lg font-extrabold">
              {mixup.lesson.title}
            </p>
            <ol className="mt-3 flex flex-col gap-2.5">
              {mixup.lesson.steps.map((step, i) => (
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
              onClick={() => {
                addUnderstandingSignal(problem.id, {
                  kind: "lesson_reflection",
                  label: "Studied tiny fix",
                  delta: 6,
                  evidence:
                    "Student reviewed the targeted lesson before entering the repair lab.",
                });
                goTo("repairing");
              }}
            >
              Practice the fix
            </ChunkyButton>
          </Card>
        );

      case "repairing":
        return (
          <RepairLab
            problem={problem}
            diagnosis={diagnosis}
            score={understanding.score}
            onSignal={(signal) => addUnderstandingSignal(problem.id, signal)}
            onComplete={() => goTo("celebrated")}
          />
        );

      case "celebrated": {
        const next = nextProblemAfter(problem.id, completed, library);
        const hw = homeworkForProblem(problem.id, library);
        return (
          <Card tone="teal">
            <p className="font-display text-2xl font-extrabold leading-tight">
              {diagnosis.celebration.headline} 🌱
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed">
              {diagnosis.celebration.sub}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border-2 border-teal/40 bg-white px-3 py-1.5 font-display text-sm font-extrabold text-teal-dark">
                +1 connection ✨
              </span>
              <span className="rounded-full border-2 border-teal/40 bg-white px-3 py-1.5 font-display text-sm font-extrabold text-teal-dark">
                {mixup ? "1 mix-up repaired 💡" : "Solid on the first try 💪"}
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {next ? (
                <Link to={`/solve/${next.id}`} className="block">
                  <ChunkyButton variant="teal" className="w-full">
                    Next problem ➡️
                  </ChunkyButton>
                </Link>
              ) : hw ? (
                <Link to={`/homework/${hw.id}`} className="block">
                  <ChunkyButton variant="teal" className="w-full">
                    Finish homework 🎉
                  </ChunkyButton>
                </Link>
              ) : (
                <Link to="/" className="block">
                  <ChunkyButton variant="teal" className="w-full">
                    Back to my brain 🧠
                  </ChunkyButton>
                </Link>
              )}
              <ChunkyButton variant="ghost" className="w-full" onClick={reset}>
                Replay the scan
              </ChunkyButton>
            </div>
          </Card>
        );
      }

      default:
        return null;
    }
  }
}

type SignalInput = Omit<UnderstandingSignal, "id" | "problemId" | "createdAt">;

function RepairLab({
  problem,
  diagnosis,
  score,
  onSignal,
  onComplete,
}: {
  problem: Problem;
  diagnosis: Diagnosis;
  score: number;
  onSignal: (signal: SignalInput) => void;
  onComplete: () => void;
}) {
  const opening = {
    text: diagnosis.repairPrompt,
    kind: "lesson_reflection" as const,
    signalLabel: diagnosis.mixup ? "Explained the mix-up" : "Explained method",
  };
  const [answer, setAnswer] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState(opening.text);
  const [conversation, setConversation] = useState<RepairConversationTurn[]>([]);
  const [decision, setDecision] = useState<
    "ask_follow_up" | "advance" | null
  >(null);
  const latestConfidence = conversation.at(-1)?.confidence;

  async function submitProof() {
    const text = answer.trim();
    if (text.length < 8 || checking) return;
    setChecking(true);
    setError(null);
    try {
      const result = await backend.evaluateStudentQuestion({
        problem,
        diagnosis,
        question: text,
        currentUnderstanding: score,
        mode: "cora_prompt_response",
        prompt: currentPrompt,
        conversation,
      });
      onSignal({
        kind: opening.kind,
        label: opening.signalLabel,
        delta: result.understandingDelta,
        depth: result.depth,
        feedbackToStudent: result.feedbackToStudent,
        nextPrompt:
          result.conversationAction === "ask_follow_up"
            ? result.nextPrompt
            : undefined,
        evidence: result.evidence,
      });
      const turn: RepairConversationTurn = {
        tutorPrompt: currentPrompt,
        studentAnswer: text,
        tutorFeedback: result.feedbackToStudent,
        confidence: result.confidence,
        conversationAction: result.conversationAction,
      };
      setConversation((turns) => [...turns, turn]);
      setDecision(result.conversationAction);
      setAnswer("");
      if (result.conversationAction === "ask_follow_up") {
        setCurrentPrompt(result.nextPrompt);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Cora couldn't check that proof yet.",
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card tone="teal">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-teal-dark">
            Repair lab
          </p>
          <p className="mt-1 font-display text-xl font-extrabold leading-tight">
            Talk it through
          </p>
        </div>
        <span className="shrink-0 rounded-full border-2 border-teal/40 bg-white px-3 py-1 font-display text-sm font-extrabold text-teal-dark">
          {latestConfidence === undefined
            ? "adaptive check"
            : `Cora ${latestConfidence}% sure`}
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold leading-relaxed text-ink-soft">
        Cora will ask only what she still needs to understand.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {conversation.map((turn, index) => (
          <div key={`${index}-${turn.tutorPrompt}`} className="flex flex-col gap-2">
            <ConversationBubble speaker="Cora" tone="cora">
              {turn.tutorPrompt}
            </ConversationBubble>
            <ConversationBubble speaker="You" tone="student">
              {turn.studentAnswer}
            </ConversationBubble>
            <ConversationBubble speaker="Cora" tone="feedback">
              {turn.tutorFeedback}
            </ConversationBubble>
          </div>
        ))}

        {decision !== "advance" && (
          <ConversationBubble speaker="Cora asks" tone="cora">
            {currentPrompt}
          </ConversationBubble>
        )}
      </div>

      {decision !== "advance" ? (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder="Answer Cora's question..."
            className="mt-3 w-full resize-none rounded-2xl border-[3px] border-ink/10 bg-white p-3 text-sm font-bold leading-relaxed outline-none transition-colors focus:border-teal"
          />
          <ChunkyButton
            variant="teal"
            className="mt-3 w-full"
            onClick={submitProof}
            disabled={answer.trim().length < 8 || checking}
          >
            {checking ? "Cora is thinking..." : "Send answer"}
          </ChunkyButton>
        </>
      ) : (
        <ChunkyButton
          variant="coral"
          className="mt-4 w-full"
          onClick={onComplete}
        >
          Continue
        </ChunkyButton>
      )}

      {error && (
        <p className="mt-3 rounded-2xl border-2 border-coral/30 bg-coral-soft p-3 text-sm font-bold leading-snug">
          {error}
        </p>
      )}
    </Card>
  );
}

function ConversationBubble({
  speaker,
  tone,
  children,
}: {
  speaker: string;
  tone: "cora" | "student" | "feedback";
  children: React.ReactNode;
}) {
  const tones = {
    cora: "border-teal/40 bg-white",
    student: "ml-6 border-lav/30 bg-lav-soft",
    feedback: "border-sun-dark/30 bg-sun-soft",
  };
  return (
    <div className={`rounded-2xl border-2 p-3 ${tones[tone]}`}>
      <p className="text-xs font-extrabold uppercase tracking-wide text-teal-dark">
        {speaker}
      </p>
      <p className="mt-1 text-sm font-bold leading-snug">{children}</p>
    </div>
  );
}
