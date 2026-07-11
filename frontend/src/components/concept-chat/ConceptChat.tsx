import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type {
  ConceptBrief,
  ConceptNode,
  Course,
  HomeworkLibrary,
  RepairConversationTurn,
  UnderstandingDepth,
} from "../../scenarios/types";
import { backend } from "../../backend";
import { useApp } from "../../state/store";
import {
  gatherConceptMemories,
  openingCheckPrompt,
  pickAnchorProblem,
  recallEverosEpisodes,
  recallSummary,
  type ConceptMemoryItem,
} from "../../learning/conceptMemory";
import { miniBurst } from "../celebrate/confetti";
import { ChunkyButton } from "../ui/ChunkyButton";

/**
 * The concept chat: click a neuron, talk to it. Cora visibly runs her tools
 * (memory recall, web brief, answer evaluation) as little chips in the
 * thread, so students SEE the brain machinery working — then asks adaptive
 * check questions whose understanding deltas flow back into the same store
 * the knowledge graph reads. Answer well and the neuron behind fires.
 */

type ChatItem =
  | {
      id: string;
      kind: "tool";
      name: string;
      arg: string;
      status: "running" | "done" | "failed";
      result?: string;
    }
  | { id: string; kind: "cora"; text: string }
  | { id: string; kind: "student"; text: string }
  | { id: string; kind: "memories"; items: ConceptMemoryItem[] }
  | { id: string; kind: "brief"; brief: ConceptBrief }
  | { id: string; kind: "celebrate"; text: string };

type WithoutId<T> = T extends { id: string } ? Omit<T, "id"> : never;
type ChatItemInput = WithoutId<ChatItem>;

const DEPTH_LABELS: Record<UnderstandingDepth, string> = {
  surface_confusion: "warming up",
  procedural_question: "how-to question",
  conceptual_question: "deep why question",
  contrast_question: "compare power",
  transfer_question: "stretch question",
  metacognitive_question: "brain-watching",
  explanation_attempt: "own-words proof",
  transfer_application: "transfer power",
  memory_rule: "future-me rule",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ConceptChat({
  node,
  course,
  library,
  onClose,
}: {
  node: ConceptNode;
  course: Course;
  library: HomeworkLibrary;
  onClose: () => void;
}) {
  const completed = useApp((s) => s.completedProblems);
  const understandingByProblem = useApp((s) => s.understandingByProblem);
  const addUnderstandingSignal = useApp((s) => s.addUnderstandingSignal);

  const [items, setItems] = useState<ChatItem[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [checking, setChecking] = useState(false);
  const [booting, setBooting] = useState(true);

  const anchorRef = useRef(
    pickAnchorProblem(node, library, understandingByProblem),
  );
  const conversationRef = useRef<RepairConversationTurn[]>([]);
  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const score = useApp(
    (s) => s.understandingByProblem[anchorRef.current.id]?.score ?? 0,
  );

  const makeId = () => `chat-${nextId.current++}`;
  const push = (item: ChatItemInput) => {
    const id = makeId();
    setItems((prev) => [...prev, { ...item, id } as ChatItem]);
    return id;
  };
  const patchTool = (
    id: string,
    patch: Partial<Extract<ChatItem, { kind: "tool" }>>,
  ) =>
    setItems((prev) =>
      prev.map((item) =>
        item.id === id && item.kind === "tool" ? { ...item, ...patch } : item,
      ),
    );

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items]);

  // Opening sequence: recall memories, fetch the concept brief, ask a check
  // question. On every (re)run — including strict-mode double effects — the
  // thread resets and boots fresh; the cancelled flag kills stale sequences.
  useEffect(() => {
    let cancelled = false;
    setItems([]);
    setPendingPrompt(null);
    setBooting(true);
    conversationRef.current = [];

    async function boot() {
      const recallId = push({
        kind: "tool",
        name: "memory.recall",
        arg: node.label,
        status: "running",
      });

      const local = gatherConceptMemories(
        node,
        library,
        completed,
        understandingByProblem,
      );
      const [everos] = await Promise.all([
        recallEverosEpisodes(node.label),
        sleep(900), // let the recall visibly "think"
      ]);
      if (cancelled) return;

      const memories = [...local, ...everos];
      patchTool(recallId, {
        status: "done",
        result:
          memories.length === 0
            ? "no memories yet"
            : `${memories.length} memor${memories.length === 1 ? "y" : "ies"} found`,
      });
      if (memories.length > 0) push({ kind: "memories", items: memories });

      await sleep(350);
      if (cancelled) return;
      push({ kind: "cora", text: recallSummary(node, memories) });

      // Tavily research and the model-generated brief also author the first
      // active-recall question, so this node conversation starts grounded in
      // the student's real coursework instead of a fixed prompt ladder.
      const briefId = push({
        kind: "tool",
        name: "web.brief",
        arg: node.label,
        status: "running",
      });
      let conceptBrief: ConceptBrief | null = null;
      try {
        conceptBrief = await backend.getConceptBrief({
          conceptId: node.id,
          label: node.label,
          courseTitle: course.title,
          subject: course.subject,
          problemTitles: node.problemIds
            .map((pid) => library.problems[pid]?.title)
            .filter((t): t is string => Boolean(t))
            .slice(0, 6),
          problemStatements: node.problemIds
            .map((pid) => library.problems[pid]?.statement)
            .filter((s): s is string => Boolean(s))
            .slice(0, 4),
        });
        if (cancelled) return;
        patchTool(briefId, {
          status: "done",
          result:
            conceptBrief.grounding === "tavily"
              ? "web-grounded"
              : "from what I know",
        });
        push({ kind: "brief", brief: conceptBrief });
      } catch {
        if (cancelled) return;
        patchTool(briefId, { status: "failed", result: "offline" });
      }

      await sleep(450);
      if (cancelled) return;
      const prompt = conceptBrief?.studyPrompt || openingCheckPrompt(node);
      setPendingPrompt(prompt);
      push({ kind: "cora", text: prompt });
      setBooting(false);
    }

    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  async function send() {
    const text = answer.trim();
    if (text.length < 4 || checking || booting) return;
    setChecking(true);
    push({ kind: "student", text });
    setAnswer("");

    const evalId = push({
      kind: "tool",
      name: "cora.evaluate",
      arg: pendingPrompt ? "your answer" : "your question",
      status: "running",
    });

    try {
      const anchor = anchorRef.current;
      const result = await backend.evaluateStudentQuestion({
        problem: anchor,
        question: text,
        currentUnderstanding: score,
        mode: pendingPrompt ? "cora_prompt_response" : "student_question",
        prompt: pendingPrompt ?? undefined,
        conversation: conversationRef.current,
      });

      patchTool(evalId, {
        status: "done",
        result: `+${result.understandingDelta} understanding · ${DEPTH_LABELS[result.depth]}`,
      });

      // The delta lands on the anchor problem, so the course graph — and the
      // neuron glowing behind this chat — genuinely moves.
      addUnderstandingSignal(anchor.id, {
        kind: pendingPrompt ? "transfer" : "student_question",
        label: pendingPrompt
          ? `Brain check: ${node.label}`
          : `Asked about ${node.label}`,
        delta: result.understandingDelta,
        depth: result.depth,
        feedbackToStudent: result.feedbackToStudent,
        evidence: result.evidence,
      });

      conversationRef.current = [
        ...conversationRef.current,
        {
          tutorPrompt: pendingPrompt ?? "(student-led question)",
          studentAnswer: text,
          tutorFeedback: result.feedbackToStudent,
          confidence: result.confidence,
          conversationAction: result.conversationAction,
        },
      ];

      push({ kind: "cora", text: result.feedbackToStudent });

      if (result.conversationAction === "ask_follow_up" && result.nextPrompt) {
        setPendingPrompt(result.nextPrompt);
        push({ kind: "cora", text: result.nextPrompt });
      } else if (result.conversationAction === "advance") {
        setPendingPrompt(null);
        miniBurst();
        push({
          kind: "celebrate",
          text: `Neuron powered up! ⚡ Cora is ${result.confidence}% sure ${node.label} is wired in. Ask me anything else, or tap another neuron.`,
        });
        // Persist the session to long-term memory (EverOS when configured).
        void backend
          .recordLearningSession(
            node.label,
            `Concept chat on ${node.label}: ${result.evidence}`,
            Math.min(100, score + result.understandingDelta),
          )
          .catch(() => {});
      }
    } catch {
      patchTool(evalId, { status: "failed", result: "try again" });
      push({
        kind: "cora",
        text: "Oops, my thinking cap slipped! Send that one more time?",
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 32, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="flex h-full flex-col overflow-hidden rounded-3xl border-[3px] border-ink/10 bg-white/95 shadow-[0_8px_0_rgba(63,46,86,0.10)] backdrop-blur"
    >
      <header className="flex items-center gap-3 border-b-2 border-ink/10 bg-lav-soft/60 px-4 py-3">
        <span className="text-2xl">{node.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-extrabold leading-tight">
            {node.label}
          </p>
          <p className="text-xs font-bold text-ink-soft">
            {node.problemCount} problem{node.problemCount === 1 ? "" : "s"} ·{" "}
            {Math.round(node.baselineMastery * 100)}% before →{" "}
            {Math.round(node.mastery * 100)}% now · {node.evidenceCount} evidence
            {node.wobbly ? " · wobbly 🫨" : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close concept chat"
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink/10 bg-white font-display text-base font-extrabold text-ink-soft transition-transform hover:scale-105 active:translate-y-[2px]"
        >
          ✕
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3.5"
      >
        {items.map((item) => (
          <ChatRow key={item.id} item={item} />
        ))}
      </div>

      <div className="border-t-2 border-ink/10 p-3">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder={
            booting
              ? "Cora is remembering..."
              : pendingPrompt
                ? "Answer Cora, or ask your own question..."
                : `Ask anything about ${node.label}...`
          }
          disabled={booting}
          className="w-full resize-none rounded-2xl border-[3px] border-ink/10 bg-white p-3 text-sm font-bold leading-relaxed outline-none transition-colors focus:border-lav disabled:opacity-60"
        />
        <ChunkyButton
          variant="lav"
          className="mt-2 w-full"
          onClick={() => void send()}
          disabled={answer.trim().length < 4 || checking || booting}
        >
          {checking ? "Cora is thinking..." : "Send to Cora 🧠"}
        </ChunkyButton>
      </div>
    </motion.div>
  );
}

function ChatRow({ item }: { item: ChatItem }) {
  switch (item.kind) {
    case "tool":
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex flex-wrap items-center gap-x-2 gap-y-1 self-start rounded-full border-2 px-3 py-1.5 ${
            item.status === "failed"
              ? "border-coral/40 bg-coral-soft"
              : "border-lav/40 bg-lav-soft"
          } ${item.status === "running" ? "animate-pulse" : ""}`}
        >
          <span className="text-xs">
            {item.status === "running" ? "⚙️" : item.status === "done" ? "✅" : "⚠️"}
          </span>
          <code className="font-mono text-[11px] font-bold text-lav-dark">
            {item.name}(&quot;{item.arg}&quot;)
          </code>
          {item.result && (
            <span className="text-[11px] font-extrabold text-ink-soft">
              → {item.result}
            </span>
          )}
        </motion.div>
      );

    case "memories":
      return (
        <Bubble tone="border-lav/30 bg-white">
          <p className="text-xs font-extrabold uppercase tracking-wide text-lav-dark">
            🧠 Brain log
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {item.items.map((memory, i) => (
              <li
                key={i}
                className="flex gap-2 text-[13px] font-semibold leading-snug"
              >
                <span className="shrink-0">{memory.icon}</span>
                <span className="min-w-0">
                  {memory.line}
                  {memory.at && (
                    <span className="ml-1 text-[11px] font-bold text-ink-soft">
                      ·{" "}
                      {new Date(memory.at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {memory.source === "everos" && (
                    <span className="ml-1 text-[11px] font-bold text-ink-soft">
                      · EverOS
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Bubble>
      );

    case "brief":
      return (
        <Bubble tone="border-sun-dark/30 bg-sun-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-wide text-sun-dark">
              📚 Quick brain boost
            </p>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-extrabold text-teal-dark">
              {item.brief.grounding === "tavily" ? "Tavily + AI" : "AI fallback"}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-semibold leading-snug">
            {item.brief.overview}
          </p>
          {item.brief.keyIdeas.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {item.brief.keyIdeas.slice(0, 3).map((idea) => (
                <li key={idea} className="flex gap-2 text-[13px] font-semibold leading-snug">
                  <span className="text-teal-dark">●</span>
                  {idea}
                </li>
              ))}
            </ul>
          )}
          {item.brief.commonMisconceptions[0] && (
            <p className="mt-1.5 text-[13px] font-semibold leading-snug">
              <span className="font-extrabold">Watch out:</span>{" "}
              {item.brief.commonMisconceptions[0]}
            </p>
          )}
          {item.brief.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {item.brief.sources.slice(0, 4).map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-extrabold text-lav-dark underline decoration-lav/50 underline-offset-2"
                >
                  {source.title}
                </a>
              ))}
            </div>
          )}
        </Bubble>
      );

    case "cora":
      return (
        <Bubble tone="border-teal/40 bg-white">
          <p className="text-xs font-extrabold uppercase tracking-wide text-teal-dark">
            Cora
          </p>
          <p className="mt-1 text-sm font-bold leading-snug">{item.text}</p>
        </Bubble>
      );

    case "student":
      return (
        <Bubble tone="ml-8 border-lav/30 bg-lav-soft">
          <p className="text-xs font-extrabold uppercase tracking-wide text-lav-dark">
            You
          </p>
          <p className="mt-1 text-sm font-bold leading-snug">{item.text}</p>
        </Bubble>
      );

    case "celebrate":
      return (
        <Bubble tone="border-teal/40 bg-teal-soft">
          <p className="text-sm font-extrabold leading-snug text-teal-dark">
            {item.text}
          </p>
        </Bubble>
      );
  }
}

function Bubble({
  tone,
  children,
}: {
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`rounded-2xl border-2 p-3 ${tone}`}
    >
      {children}
    </motion.div>
  );
}
