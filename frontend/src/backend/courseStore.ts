import type { Course, CourseColor, CreateCourseInput } from "../scenarios/types";

const COURSES_KEY = "cortex-created-courses";

const COLORS: CourseColor[] = ["lav", "teal", "coral", "sky", "gold"];

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "course"
  );
}

/** Build a Course from user input, filling sensible defaults. */
export function makeCourse(input: CreateCourseInput): Course {
  const title = input.title.trim() || "New Course";
  return {
    id: `course-${slugify(title)}-${Date.now().toString(36)}`,
    title,
    emoji: input.emoji?.trim() || "📁",
    color: input.color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
    subject: input.subject?.trim() || title,
    homeworkIds: [],
    createdAt: new Date().toISOString(),
    source: "created",
  };
}

export function loadCreatedCourses(): Course[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COURSES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Course[]) : [];
  } catch {
    return [];
  }
}

export function saveCreatedCourses(courses: Course[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
}
