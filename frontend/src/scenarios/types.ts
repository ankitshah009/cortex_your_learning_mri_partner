export type StepKind = "claim" | "mystery" | "operation" | "conclusion";

export interface ReasoningStep {
  id: string;
  kind: StepKind;
  /** Kid-friendly summary shown inside the thought bubble */
  label: string;
  /** Small caption under the label ("your words", "hidden step", ...) */
  caption: string;
  /** True when Cortex surfaced a step the student never wrote */
  inferred?: boolean;
}

export interface ProbeOption {
  id: string;
  label: string;
  kind: "mixup" | "correct" | "other";
}

/** A homework item: what the student sees before they start reasoning */
export interface Problem {
  id: string;
  /** Concept region this problem belongs to (links to an island on the brain map) */
  conceptId: string;
  /** Supporting concepts discovered in the worksheet (used for graph edges). */
  relatedConceptIds?: string[];
  title: string;
  emoji: string;
  statement: string;
  /** Pre-filled student reasoning, editable in the input box */
  sampleReasoning: string;
  source?: "seeded" | "pdf";
  sourceLabel?: string;
  /** Optional web grounding gathered for an imported worksheet. */
  learningContext?: LearningContext;
}

export interface LearningSource {
  title: string;
  url: string;
  snippet: string;
}

export interface LearningContext {
  mainTopic: string;
  summary: string;
  query: string;
  sources: LearningSource[];
}

export interface ConceptBriefInput {
  conceptId: string;
  label: string;
  courseTitle: string;
  subject: string;
  problemTitles: string[];
  problemStatements: string[];
}

export interface ConceptBrief {
  conceptId: string;
  title: string;
  overview: string;
  keyIdeas: string[];
  commonMisconceptions: string[];
  studyPrompt: string;
  sources: LearningSource[];
  grounding: "tavily" | "model_only";
}

/** Present only when the scan found a first divergence */
export interface Mixup {
  /** The first divergence: earliest step everything downstream depends on */
  stepId: string;
  downstreamIds: string[];
  hypothesis: {
    name: string;
    kidExplanation: string;
    confidenceBefore: number;
    confidenceAfter: number;
    confidenceIfCorrect: number;
  };
  /** Shown on the confirmed card: what the brain did, in one kid sentence */
  confirmLine: string;
  /** EverOS memory beat shown as evidence for the hypothesis */
  memoryEvidence: string;
  probe: {
    question: string;
    options: ProbeOption[];
  };
  lesson: {
    title: string;
    steps: string[];
  };
  /** stepId -> corrected bubble label after the repair cascade */
  fixedLabels: Record<string, string>;
}

/** What the scan produces for one submission of reasoning */
export interface Diagnosis {
  problemId: string;
  steps: ReasoningStep[];
  /** null means the reasoning was solid: no first divergence found */
  mixup: Mixup | null;
  /** AI-authored opening turn for the adaptive repair conversation. */
  repairPrompt: string;
  celebration: {
    headline: string;
    sub: string;
  };
  /** Sources used as background when generating this diagnosis. */
  learningContext?: LearningContext;
}

export type UnderstandingDepth =
  | "surface_confusion"
  | "procedural_question"
  | "conceptual_question"
  | "contrast_question"
  | "transfer_question"
  | "metacognitive_question"
  | "explanation_attempt"
  | "transfer_application"
  | "memory_rule";

export type UnderstandingSignalKind =
  | "attempt"
  | "probe_answer"
  | "student_question"
  | "lesson_reflection"
  | "transfer";

export interface UnderstandingSignal {
  id: string;
  problemId: string;
  kind: UnderstandingSignalKind;
  label: string;
  delta: number;
  createdAt: string;
  depth?: UnderstandingDepth;
  feedbackToStudent?: string;
  nextPrompt?: string;
  evidence?: string;
  /** Separates participation from independent proof of transfer. */
  evidenceClass?: LearningEvidenceClass;
}

export interface UnderstandingEvaluation {
  depth: UnderstandingDepth;
  understandingDelta: number;
  confidence: number;
  conversationAction: "ask_follow_up" | "advance";
  feedbackToStudent: string;
  nextPrompt: string;
  evidence: string;
}

export interface RepairConversationTurn {
  tutorPrompt: string;
  studentAnswer: string;
  tutorFeedback: string;
  confidence: number;
  conversationAction: "ask_follow_up" | "advance";
}

export type UnderstandingTurnMode =
  | "student_question"
  | "cora_prompt_response";

export interface Homework {
  id: string;
  title: string;
  emoji: string;
  subject: string;
  due: string;
  /** Problems in the order the student should do them */
  problemIds: string[];
  /** Course/folder this homework belongs to */
  courseId?: string;
  source?: "seeded" | "pdf";
  sourceFileName?: string;
  importedAt?: string;
  /** Main topic and sources used to ground explanations for this worksheet. */
  learningContext?: LearningContext;
}

/**
 * A course / folder: the top-level container a student organizes work under.
 * Each course grows its own knowledge graph as homeworks inside it are solved.
 */
export interface Course {
  id: string;
  title: string;
  emoji: string;
  /** Palette accent key (see COURSE_COLORS) that themes the 3D brain */
  color: CourseColor;
  subject: string;
  /** Homeworks assigned into this course */
  homeworkIds: string[];
  createdAt?: string;
  source?: "seeded" | "created";
}

export type CourseColor = "lav" | "teal" | "coral" | "sky" | "gold";

export interface HomeworkLibrary {
  courses: Course[];
  homeworks: Homework[];
  problems: Record<string, Problem>;
}

export interface HomeworkImportResult {
  homework: Homework;
  problems: Problem[];
  courseId: string;
}

/* ---------- Predictive brain checks ---------- */

export type LearningEvidenceClass =
  | "exposure"
  | "guided_success"
  | "immediate_transfer"
  | "delayed_transfer";

export interface BrainCheckPrediction {
  hypothesis: string;
  expectedDivergence: string;
  confidence: number;
  evidence: string[];
}

export interface BrainCheckChallenge {
  id: string;
  courseId: string;
  conceptId: string;
  conceptLabel: string;
  emoji: string;
  anchorProblemId: string;
  title: string;
  statement: string;
  answerHint: string;
  prediction: BrainCheckPrediction;
}

export interface BrainCheckEvaluation {
  outcome: "confirmed" | "revised" | "uncertain";
  correct: boolean;
  confidence: number;
  observedReasoning: string;
  feedback: string;
  modelUpdate: string;
  nextReviewDays: number;
  evidenceClass: Extract<
    LearningEvidenceClass,
    "immediate_transfer" | "delayed_transfer"
  >;
}

export interface BrainCheckRecord {
  id: string;
  challenge: BrainCheckChallenge;
  response: string;
  evaluation: BrainCheckEvaluation;
  completedAt: string;
}

export interface CreateCourseInput {
  title: string;
  emoji?: string;
  color?: CourseColor;
  subject?: string;
}

/* ---------- Knowledge graph (the per-course brain) ---------- */

/** One concept region in a course's brain. Nodes are distinct conceptIds. */
export interface ConceptNode {
  id: string;
  label: string;
  emoji: string;
  /** 0..1: how strong this concept is, from completions across the course */
  mastery: number;
  /** An unresolved mix-up or unfinished work lives here */
  wobbly: boolean;
  /** How many problems in the course touch this concept */
  problemCount: number;
  /** Problems that contributed curriculum or student evidence to this node. */
  problemIds: string[];
  /** 0..1 mastery before the student's recorded evidence in this course. */
  baselineMastery: number;
  /** Number of recorded student evidence signals touching this concept. */
  evidenceCount: number;
  /** Most recent evidence signal that touched this concept */
  lastPracticedAt?: string | null;
  /** 0..1 temporal confidence after recency decay */
  retention?: number;
}

/** A synapse: two concepts that co-occur in the same course are connected. */
export interface ConceptEdge {
  source: string;
  target: string;
  /** 0..1: grows as both endpoints are practiced together */
  strength: number;
}

export interface CourseGraph {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}
