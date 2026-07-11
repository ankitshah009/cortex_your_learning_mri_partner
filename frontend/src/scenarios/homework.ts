import type {
  Course,
  Diagnosis,
  Homework,
  HomeworkLibrary,
  Problem,
} from "./types";
import { rexProblem, rexDiagnosis } from "./average-speed";
import { bikeProblem, bikeDiagnosis } from "./bike-speed";
import { meetProblem, meetDiagnosis } from "./closing-speed";

export type Outcome = "repaired" | "solid";
export type Completions = Record<string, Outcome>;

export const PROBLEMS: Record<string, Problem> = {
  [rexProblem.id]: rexProblem,
  [bikeProblem.id]: bikeProblem,
  [meetProblem.id]: meetProblem,
};

export const DIAGNOSES: Record<string, Diagnosis> = {
  [rexDiagnosis.problemId]: rexDiagnosis,
  [bikeDiagnosis.problemId]: bikeDiagnosis,
  [meetDiagnosis.problemId]: meetDiagnosis,
};

/** Course every seeded/uncategorized homework lands in by default. */
export const DEFAULT_COURSE_ID = "course-math";

export const HOMEWORKS: Homework[] = [
  {
    id: "hw-motion",
    title: "Motion & Rates Worksheet",
    emoji: "🏁",
    subject: "Math",
    due: "Due Tue, Jul 14",
    problemIds: [rexProblem.id, bikeProblem.id, meetProblem.id],
    courseId: DEFAULT_COURSE_ID,
  },
];

export const COURSES: Course[] = [
  {
    id: DEFAULT_COURSE_ID,
    title: "Math",
    emoji: "🧮",
    color: "lav",
    subject: "Math",
    homeworkIds: ["hw-motion"],
    source: "seeded",
  },
];

export const SEEDED_LIBRARY: HomeworkLibrary = {
  courses: COURSES,
  homeworks: HOMEWORKS,
  problems: PROBLEMS,
};

export function mergeHomeworkLibrary(
  base: HomeworkLibrary,
  imported: HomeworkLibrary,
): HomeworkLibrary {
  const seenHw = new Set<string>();
  const homeworks = [...imported.homeworks, ...base.homeworks].filter((hw) => {
    if (seenHw.has(hw.id)) return false;
    seenHw.add(hw.id);
    return true;
  });

  // Merge courses by id. Imported course entries win for metadata, but their
  // homeworkIds are unioned with the base so a scoped upload appends rather
  // than replaces the seeded homeworks.
  const courseById = new Map<string, Course>();
  for (const course of [...base.courses, ...imported.courses]) {
    const existing = courseById.get(course.id);
    if (!existing) {
      courseById.set(course.id, { ...course, homeworkIds: [...course.homeworkIds] });
      continue;
    }
    // Only let the incoming entry override fields it actually provides, so a
    // scoped-upload stub ({ id, homeworkIds }) never blanks a seeded course.
    const merged: Course = {
      ...existing,
      title: course.title || existing.title,
      emoji: course.emoji || existing.emoji,
      color: course.color || existing.color,
      subject: course.subject || existing.subject,
      createdAt: course.createdAt ?? existing.createdAt,
      source: course.source ?? existing.source,
    };
    merged.homeworkIds = [
      ...new Set([...existing.homeworkIds, ...course.homeworkIds]),
    ];
    courseById.set(course.id, merged);
  }

  return {
    courses: [...courseById.values()],
    homeworks,
    problems: { ...base.problems, ...imported.problems },
  };
}

export function getCourse(
  id: string,
  library: HomeworkLibrary = SEEDED_LIBRARY,
): Course | undefined {
  return library.courses.find((c) => c.id === id);
}

export function homeworksInCourse(
  courseId: string,
  library: HomeworkLibrary = SEEDED_LIBRARY,
): Homework[] {
  const course = getCourse(courseId, library);
  if (!course) return [];
  return course.homeworkIds
    .map((id) => library.homeworks.find((h) => h.id === id))
    .filter((hw): hw is Homework => Boolean(hw));
}

export function courseForHomework(
  homeworkId: string,
  library: HomeworkLibrary = SEEDED_LIBRARY,
): Course | undefined {
  return library.courses.find((c) => c.homeworkIds.includes(homeworkId));
}

export function getHomework(
  id: string,
  library: HomeworkLibrary = SEEDED_LIBRARY,
): Homework | undefined {
  return library.homeworks.find((h) => h.id === id);
}

export function homeworkForProblem(
  problemId: string,
  library: HomeworkLibrary = SEEDED_LIBRARY,
): Homework | undefined {
  return library.homeworks.find((h) => h.problemIds.includes(problemId));
}

/** Position of a problem within its homework, 1-based, for "Problem 2 of 3" */
export function problemPosition(
  problemId: string,
  library: HomeworkLibrary = SEEDED_LIBRARY,
) {
  const hw = homeworkForProblem(problemId, library);
  if (!hw) return null;
  return { index: hw.problemIds.indexOf(problemId) + 1, total: hw.problemIds.length, homework: hw };
}

/** Next unfinished problem after the current one (current counts as done) */
export function nextProblemAfter(
  problemId: string,
  completed: Completions,
  library: HomeworkLibrary = SEEDED_LIBRARY,
): Problem | null {
  const hw = homeworkForProblem(problemId, library);
  if (!hw) return null;
  const nextId = hw.problemIds.find((id) => id !== problemId && !completed[id]);
  return nextId ? library.problems[nextId] : null;
}

/** First unfinished problem of a homework, for "Continue" buttons */
export function firstUnfinished(
  hw: Homework,
  completed: Completions,
  library: HomeworkLibrary = SEEDED_LIBRARY,
): Problem | null {
  const id = hw.problemIds.find((pid) => !completed[pid]);
  return id ? library.problems[id] : null;
}

export function homeworkProgress(hw: Homework, completed: Completions) {
  const done = hw.problemIds.filter((id) => completed[id]).length;
  return { done, total: hw.problemIds.length };
}

/* ---------- Brain map derivation (the EverOS view) ---------- */

export interface IslandState {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  /** 0..1, drives brightness: how strong this concept region is */
  mastery: number;
  wobbly: boolean;
}

export function islandStates(completed: Completions): IslandState[] {
  const speedDone = ["average-speed", "closing-speed"].filter(
    (id) => completed[id],
  ).length;
  const timeDone = completed["bike-speed"] ? 1 : 0;
  return [
    {
      id: "speed",
      name: "Speed Springs",
      emoji: "⚡",
      x: 170,
      y: 265,
      mastery: Math.min(0.95, 0.45 + speedDone * 0.25),
      wobbly: speedDone < 2,
    },
    {
      id: "time",
      name: "Time Trails",
      emoji: "⏰",
      x: 452,
      y: 150,
      mastery: timeDone ? 0.9 : 0.6,
      wobbly: false,
    },
    {
      id: "fractions",
      name: "Fraction Falls",
      emoji: "🍕",
      x: 720,
      y: 275,
      mastery: 0.62,
      wobbly: false,
    },
  ];
}
