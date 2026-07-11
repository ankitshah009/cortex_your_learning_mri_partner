import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { backend } from "../backend";
import { useHomeworkLibrary } from "../backend/useHomeworkLibrary";
import { Cora } from "../components/mascot/Cora";
import { ChunkyButton } from "../components/ui/ChunkyButton";
import { selectBrainCheckTarget } from "../learning/brainCheck";
import type {
  BrainCheckChallenge,
  BrainCheckEvaluation,
  BrainCheckRecord,
} from "../scenarios/types";
import { useApp } from "../state/store";
import { bigCelebration, miniBurst } from "../components/celebrate/confetti";
import { BrandLogo } from "../components/brand/BrandLogo";

type CheckStage = "loading" | "ready" | "challenge" | "checking" | "reveal" | "error";

export function BrainCheckPage() {
  const { library, loading } = useHomeworkLibrary();
  const completed = useApp((s) => s.completedProblems);
  const understanding = useApp((s) => s.understandingByProblem);
  const addSignal = useApp((s) => s.addUnderstandingSignal);
  const recordBrainCheck = useApp((s) => s.recordBrainCheck);
  const history = useApp((s) => s.brainCheckHistory);
  const [stage, setStage] = useState<CheckStage>("loading");
  const [challenge, setChallenge] = useState<BrainCheckChallenge | null>(null);
  const [evaluation, setEvaluation] = useState<BrainCheckEvaluation | null>(null);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");

  const target = useMemo(
    () => selectBrainCheckTarget(library, completed, understanding),
    [library, completed, understanding],
  );

  useEffect(() => {
    if (loading || !target || challenge) return;
    let cancelled = false;
    setStage("loading");
    backend
      .createBrainCheck({
        course: target.course,
        conceptId: target.node.id,
        conceptLabel: target.node.label,
        anchorProblem: target.anchorProblem,
        misconception: target.misconception,
        evidence: target.evidence,
        confidence: target.confidence,
      })
      .then((next) => {
        if (cancelled) return;
        setChallenge(next);
        setStage("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Cora couldn't prepare the check.");
        setStage("error");
      });
    return () => {
      cancelled = true;
    };
  }, [challenge, loading, target]);

  async function submit() {
    if (!challenge || !target || response.trim().length < 12) return;
    setStage("checking");
    setError("");
    try {
      const result = await backend.evaluateBrainCheck({
        challenge,
        response: response.trim(),
        daysSinceAnchor: target.daysSinceAnchor,
      });
      const delta = result.correct ? (result.evidenceClass === "delayed_transfer" ? 34 : 28) : 2;
      addSignal(challenge.anchorProblemId, {
        kind: "transfer",
        label: result.correct ? "Passed an independent brain check" : "Completed an independent brain check",
        delta,
        depth: "transfer_application",
        evidenceClass: result.evidenceClass,
        feedbackToStudent: result.feedback,
        evidence: result.observedReasoning,
      });
      const record: BrainCheckRecord = {
        id: `${challenge.id}-${Date.now().toString(36)}`,
        challenge,
        response: response.trim(),
        evaluation: result,
        completedAt: new Date().toISOString(),
      };
      recordBrainCheck(record);
      setEvaluation(result);
      setStage("reveal");
      if (result.correct) bigCelebration();
      else miniBurst();
      void backend.recordLearningSession(
        `Brain check: ${challenge.conceptLabel}`,
        `${result.outcome}. ${result.observedReasoning}`,
        result.correct ? result.confidence : Math.max(20, 100 - result.confidence),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cora couldn't compare the prediction yet.");
      setStage("challenge");
    }
  }

  if (!loading && !target) return <EmptyCheck />;

  return (
    <main className="min-h-dvh overflow-hidden bg-cream">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <BrandLogo size="sm" linked className="hidden sm:block" />
          <Link to="/" className="font-display text-lg font-extrabold text-ink-soft transition-colors hover:text-ink">
            ← My brains
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-teal anim-pulse-ring" />
          <span className="font-display text-sm font-extrabold text-ink-soft">Predictive check</span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {(stage === "loading" || loading) && <LoadingCheck key="loading" />}
        {stage === "error" && <ErrorCheck key="error" message={error} />}
        {stage === "ready" && challenge && target && (
          <ReadyCheck
            key="ready"
            challenge={challenge}
            mastery={target.node.mastery}
            evidenceCount={target.node.evidenceCount}
            previousChecks={history.filter((item) => item.challenge.conceptId === challenge.conceptId).length}
            onStart={() => setStage("challenge")}
          />
        )}
        {(stage === "challenge" || stage === "checking") && challenge && (
          <ChallengeCheck
            key="challenge"
            challenge={challenge}
            response={response}
            setResponse={setResponse}
            checking={stage === "checking"}
            error={error}
            onSubmit={submit}
          />
        )}
        {stage === "reveal" && challenge && evaluation && (
          <RevealCheck key="reveal" challenge={challenge} evaluation={evaluation} response={response} />
        )}
      </AnimatePresence>
    </main>
  );
}

function PageMotion({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function LoadingCheck() {
  return (
    <PageMotion className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl flex-col items-center justify-center px-6 text-center">
      <Cora expression="thinking" size={150} />
      <h1 className="mt-5 font-display text-3xl font-extrabold">Finding the most useful question…</h1>
      <div className="mt-6 h-3 w-64 overflow-hidden rounded-full border-2 border-ink/10 bg-white">
        <motion.div
          className="h-full w-24 rounded-full bg-lav"
          animate={{ x: [-100, 260] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
        />
      </div>
      <p className="mt-3 font-semibold text-ink-soft">Checking weak links, old evidence, and uncertain predictions.</p>
    </PageMotion>
  );
}

function ReadyCheck({
  challenge,
  mastery,
  evidenceCount,
  previousChecks,
  onStart,
}: {
  challenge: BrainCheckChallenge;
  mastery: number;
  evidenceCount: number;
  previousChecks: number;
  onStart: () => void;
}) {
  return (
    <PageMotion className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-8 px-6 pb-10 md:grid-cols-[0.8fr_1.2fr]">
      <div className="flex flex-col items-center md:items-start">
        <Cora expression="curious" size={154} />
        <p className="mt-3 max-w-sm text-center font-display text-xl font-extrabold leading-snug md:text-left">
          I found the question that will teach me the most about your brain.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border-[3px] border-ink/10 bg-white p-7 shadow-[0_8px_0_rgba(63,46,86,0.09)] md:p-9">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-lav-soft" />
        <div className="relative">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="font-display text-sm font-extrabold text-lav-dark">Cora’s brain check · about 90 seconds</p>
              <h1 className="mt-2 max-w-xl font-display text-4xl font-extrabold leading-[1.02] tracking-tight">
                Can {challenge.conceptLabel} travel to a new problem?
              </h1>
            </div>
            <span className="text-5xl" aria-hidden="true">{challenge.emoji}</span>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-2 border-y-2 border-ink/10 py-5">
            <Metric value={`${Math.round(mastery * 100)}%`} label="current model" />
            <Metric value={`${evidenceCount}`} label="evidence signals" />
            <Metric value={`${previousChecks}`} label="prior checks" />
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-2xl border-2 border-lav/30 bg-lav-soft p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl">🔒</span>
            <div>
              <p className="font-display font-extrabold">Prediction sealed</p>
              <p className="text-sm font-semibold leading-snug text-ink-soft">
                Cora recorded what she expects before you answer. You’ll open it after the check.
              </p>
            </div>
          </div>

          <ChunkyButton className="mt-6 w-full" onClick={onStart}>Start brain check</ChunkyButton>
        </div>
      </div>
    </PageMotion>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs font-bold leading-tight text-ink-soft">{label}</p>
    </div>
  );
}

function ChallengeCheck({
  challenge,
  response,
  setResponse,
  checking,
  error,
  onSubmit,
}: {
  challenge: BrainCheckChallenge;
  response: string;
  setResponse: (value: string) => void;
  checking: boolean;
  error: string;
  onSubmit: () => void;
}) {
  return (
    <PageMotion className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-5xl items-center gap-5 px-6 pb-10 md:grid-cols-[1.05fr_0.95fr]">
      <article className="rounded-[2rem] border-[3px] border-ink/10 bg-white p-7 shadow-[0_7px_0_rgba(63,46,86,0.08)] md:p-9">
        <div className="flex items-center justify-between gap-4">
          <span className="font-display text-sm font-extrabold text-coral-dark">Fresh transfer problem</span>
          <span className="rounded-full border-2 border-ink/10 bg-cloud-soft px-3 py-1 font-display text-xs font-extrabold text-ink-soft">
            no hints yet
          </span>
        </div>
        <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight">{challenge.emoji} {challenge.title}</h1>
        <p className="mt-5 text-lg font-bold leading-relaxed text-ink-soft">{challenge.statement}</p>
        <div className="mt-7 flex items-center gap-3 border-t-2 border-ink/10 pt-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lav-soft">🔒</span>
          <p className="text-sm font-semibold text-ink-soft">Your answer cannot change Cora’s sealed prediction.</p>
        </div>
      </article>

      <div className="rounded-[2rem] border-[3px] border-teal/35 bg-teal-soft p-6 md:p-7">
        <label htmlFor="brain-check-response" className="font-display text-xl font-extrabold">
          Show your thinking
        </label>
        <p className="mt-1 text-sm font-semibold text-ink-soft">Answer and explain the relationship behind your method.</p>
        <textarea
          id="brain-check-response"
          autoFocus
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onSubmit();
          }}
          rows={8}
          disabled={checking}
          className="mt-4 w-full resize-none rounded-2xl border-[3px] border-ink/10 bg-white p-4 font-semibold leading-relaxed outline-none transition-colors placeholder:text-ink-soft/70 focus:border-teal disabled:opacity-70"
          placeholder="I think… because…"
        />
        <ChunkyButton variant="teal" className="mt-4 w-full" disabled={response.trim().length < 12 || checking} onClick={onSubmit}>
          {checking ? "Comparing prediction…" : "Open the prediction"}
        </ChunkyButton>
        <p className="mt-2 text-center text-xs font-bold text-ink-soft">⌘ Enter to submit</p>
        {error && <p className="mt-3 rounded-xl bg-coral-soft p-3 text-sm font-bold text-coral-dark">{error}</p>}
      </div>
    </PageMotion>
  );
}

function RevealCheck({
  challenge,
  evaluation,
  response,
}: {
  challenge: BrainCheckChallenge;
  evaluation: BrainCheckEvaluation;
  response: string;
}) {
  const revised = evaluation.outcome === "revised";
  const uncertain = evaluation.outcome === "uncertain";
  return (
    <PageMotion className="mx-auto max-w-6xl px-6 pb-12 pt-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-display text-sm font-extrabold text-lav-dark">Prediction opened</p>
          <h1 className="mt-1 max-w-3xl font-display text-4xl font-extrabold leading-[1.02] tracking-tight md:text-5xl">
            {revised ? "You proved Cora wrong—in the best way." : uncertain ? "The model needs one more clue." : "Cora predicted the hidden step."}
          </h1>
        </div>
        <div className={`shrink-0 rounded-2xl border-[3px] px-5 py-3 ${revised ? "border-teal/40 bg-teal-soft" : uncertain ? "border-sun-dark/30 bg-sun-soft" : "border-coral/35 bg-coral-soft"}`}>
          <p className="font-display text-2xl font-extrabold tabular-nums">{evaluation.confidence}%</p>
          <p className="text-xs font-bold text-ink-soft">evidence confidence</p>
        </div>
      </div>

      <div className="mt-7 grid overflow-hidden rounded-[2rem] border-[3px] border-ink/10 bg-white shadow-[0_8px_0_rgba(63,46,86,0.08)] md:grid-cols-2">
        <section className="border-b-[3px] border-ink/10 p-6 md:border-b-0 md:border-r-[3px] md:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lav-soft text-xl">🔒</span>
            <div>
              <p className="font-display text-sm font-extrabold text-lav-dark">Before you answered</p>
              <p className="font-display text-xl font-extrabold">Cora predicted</p>
            </div>
          </div>
          <p className="mt-5 font-display text-2xl font-extrabold leading-snug">{challenge.prediction.hypothesis}</p>
          <p className="mt-4 rounded-2xl bg-cloud-soft p-4 text-sm font-bold leading-relaxed text-ink-soft">
            Expected first divergence: {challenge.prediction.expectedDivergence}
          </p>
          <div className="mt-5 space-y-2">
            {challenge.prediction.evidence.map((item) => (
              <p key={item} className="flex gap-2 text-sm font-semibold leading-snug text-ink-soft">
                <span className="text-lav-dark">●</span>{item}
              </p>
            ))}
          </div>
        </section>

        <section className={`p-6 md:p-8 ${revised ? "bg-teal-soft/55" : uncertain ? "bg-sun-soft/45" : "bg-coral-soft/45"}`}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl">🔎</span>
            <div>
              <p className="font-display text-sm font-extrabold text-ink-soft">What actually happened</p>
              <p className="font-display text-xl font-extrabold">Observed evidence</p>
            </div>
          </div>
          <p className="mt-5 font-display text-2xl font-extrabold leading-snug">{evaluation.observedReasoning}</p>
          <blockquote className="mt-4 rounded-2xl border-2 border-white bg-white/80 p-4 text-sm font-semibold italic leading-relaxed text-ink-soft">
            “{response}”
          </blockquote>
          <p className="mt-5 text-sm font-bold leading-relaxed">{evaluation.feedback}</p>
        </section>
      </div>

      <div className="mt-5 grid gap-4 rounded-[2rem] border-[3px] border-ink/10 bg-ink p-6 text-white md:grid-cols-[1fr_auto] md:items-center md:p-7">
        <div>
          <p className="font-display text-sm font-extrabold text-lav-soft">The brain changed</p>
          <p className="mt-1 font-display text-2xl font-extrabold leading-tight">{evaluation.modelUpdate}</p>
          <p className="mt-2 text-sm font-semibold text-white/70">
            Recorded as {evaluation.evidenceClass.replace("_", " ")} · next check in {evaluation.nextReviewDays} day{evaluation.nextReviewDays === 1 ? "" : "s"}
          </p>
        </div>
        <Link to={`/course/${challenge.courseId}`}>
          <ChunkyButton variant="teal" className="w-full whitespace-nowrap md:w-auto">See the rewiring</ChunkyButton>
        </Link>
      </div>
    </PageMotion>
  );
}

function EmptyCheck() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <Cora expression="curious" size={140} />
      <h1 className="mt-5 font-display text-3xl font-extrabold">Cora needs one course first</h1>
      <p className="mt-2 max-w-md font-semibold text-ink-soft">Add homework or solve a problem so Cortex has a concept to test.</p>
      <Link to="/" className="mt-6"><ChunkyButton>Go to my courses</ChunkyButton></Link>
    </main>
  );
}

function ErrorCheck({ message }: { message: string }) {
  return (
    <PageMotion className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center px-6 text-center">
      <Cora expression="thinking" size={140} />
      <h1 className="mt-4 font-display text-3xl font-extrabold">The prediction lab is offline</h1>
      <p className="mt-2 font-semibold text-ink-soft">{message}</p>
      <Link to="/" className="mt-6"><ChunkyButton variant="ghost">Back to my brains</ChunkyButton></Link>
    </PageMotion>
  );
}
