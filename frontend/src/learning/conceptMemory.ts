import type {
  ConceptNode,
  HomeworkLibrary,
  Problem,
  UnderstandingSignal,
} from "../scenarios/types";
import type { Completions } from "../scenarios/homework";
import type { UnderstandingState } from "../state/store";
import { everosMemory } from "../backend";

/**
 * Concept memory: everything Cora can truthfully "remember" about one neuron.
 * Items come from the student's real evidence trail — completions and
 * understanding signals on the problems behind the concept — plus EverOS
 * episodes when a live memory backend is configured. This is what the
 * concept-chat recall step shows, so it must never invent history.
 */

export interface ConceptMemoryItem {
  /** ISO timestamp when known, null for undated completions */
  at: string | null;
  icon: string;
  line: string;
  source: "brain-log" | "everos";
}

const SIGNAL_ICONS: Record<UnderstandingSignal["kind"], string> = {
  attempt: "✏️",
  probe_answer: "🧪",
  student_question: "❓",
  lesson_reflection: "📘",
  transfer: "🚀",
};

export function gatherConceptMemories(
  node: ConceptNode,
  library: HomeworkLibrary,
  completed: Completions,
  understandingByProblem: Record<string, UnderstandingState>,
): ConceptMemoryItem[] {
  const items: ConceptMemoryItem[] = [];

  for (const pid of node.problemIds) {
    const problem = library.problems[pid];
    const title = problem ? `“${problem.title}”` : "a problem";

    const outcome = completed[pid];
    if (outcome === "repaired") {
      items.push({
        at: understandingByProblem[pid]?.signals.at(-1)?.createdAt ?? null,
        icon: "💡",
        line: `Found and repaired a mix-up in ${title}`,
        source: "brain-log",
      });
    } else if (outcome === "solid") {
      items.push({
        at: understandingByProblem[pid]?.signals.at(-1)?.createdAt ?? null,
        icon: "💪",
        line: `Solved ${title} solidly on the first scan`,
        source: "brain-log",
      });
    }

    for (const signal of understandingByProblem[pid]?.signals ?? []) {
      items.push({
        at: signal.createdAt,
        icon: SIGNAL_ICONS[signal.kind] ?? "🧠",
        line: signal.evidence
          ? `${signal.label} — ${signal.evidence}`
          : signal.label,
        source: "brain-log",
      });
    }
  }

  // Newest first; undated completions sink to the end.
  return items
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))
    .slice(0, 6);
}

/** Best-effort EverOS episodic recall; silently empty when not configured. */
export async function recallEverosEpisodes(
  label: string,
): Promise<ConceptMemoryItem[]> {
  if (!everosMemory) return [];
  try {
    const evidence = await everosMemory.getMemoryEvidence(label);
    return evidence.episodes
      .map((episode): ConceptMemoryItem | null => {
        const line = episodeText(episode);
        return line
          ? { at: null, icon: "🗄️", line, source: "everos" }
          : null;
      })
      .filter((item): item is ConceptMemoryItem => item !== null)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function episodeText(episode: unknown): string {
  if (typeof episode === "string") return episode.slice(0, 140);
  if (episode && typeof episode === "object") {
    const rec = episode as Record<string, unknown>;
    for (const key of ["summary", "content", "memory", "text"]) {
      if (typeof rec[key] === "string" && rec[key]) {
        return (rec[key] as string).slice(0, 140);
      }
    }
  }
  return "";
}

/** Cora's recall line: the memory model narrated in kid-friendly words. */
export function recallSummary(
  node: ConceptNode,
  items: ConceptMemoryItem[],
): string {
  if (items.length === 0) {
    return `This neuron is brand new — we haven't practiced ${node.label} together yet. Let's wire it up right now!`;
  }
  const sleepy = (node.retention ?? 1) < 0.8;
  if (node.wobbly) {
    return `I remember ${node.label}! We've worked on it across ${node.problemCount} problem${node.problemCount === 1 ? "" : "s"}, and something still feels wobbly in there. Perfect time for a brain check.`;
  }
  if (sleepy) {
    return `We built ${node.label} strong, but it's been a while — this synapse is getting sleepy 😴. A quick zap will wake it right up!`;
  }
  return `Your ${node.label} neuron is glowing! Let's see if it can handle a stretch question.`;
}

/** The opening check question, tiered by how strong the neuron already is. */
export function openingCheckPrompt(node: ConceptNode): string {
  if (node.mastery < 0.45) {
    return `Teach me ${node.label} like I'm a curious baby robot 🤖 — what is it, in your own words?`;
  }
  if (node.mastery < 0.75) {
    return `Why does ${node.label} work the way it does? Explain the why, not just the steps.`;
  }
  return `Stretch time! When would ${node.label} NOT work the way you expect? Give me a tricky case.`;
}

/**
 * The problem that anchors this concept chat: understanding deltas earned in
 * the chat are recorded against it, so the neuron's mastery genuinely moves.
 * Pick the least-understood problem — strengthen the weakest evidence first.
 */
export function pickAnchorProblem(
  node: ConceptNode,
  library: HomeworkLibrary,
  understandingByProblem: Record<string, UnderstandingState>,
): Problem {
  const candidates = node.problemIds
    .map((pid) => library.problems[pid])
    .filter((p): p is Problem => Boolean(p));

  const anchor = candidates.sort(
    (a, b) =>
      (understandingByProblem[a.id]?.score ?? 0) -
      (understandingByProblem[b.id]?.score ?? 0),
  )[0];

  // A node only exists because a problem touched it, but guard anyway so the
  // chat still opens if the library and graph ever disagree.
  return (
    anchor ?? {
      id: `concept-${node.id}`,
      conceptId: node.id,
      title: node.label,
      emoji: node.emoji,
      statement: `A check-in conversation about ${node.label}.`,
      sampleReasoning: "",
    }
  );
}
