import type {
  Course,
  CreateCourseInput,
  Diagnosis,
  Homework,
  HomeworkImportResult,
  HomeworkLibrary,
  Problem,
} from "../scenarios/types";

/**
 * The seam between the UI and the real backend.
 * The UI only ever talks to a DataProvider, so the demo runs on the mock
 * and Butterbase / EverOS adapters can be swapped in without UI changes.
 */
export interface DataProvider {
  /** Runtime homework/problem catalog, including imported PDFs */
  getHomeworkLibrary(): Promise<HomeworkLibrary>;
  /** Courses/folders the student has organized their work into */
  listCourses(): Promise<Course[]>;
  /** Create a new course/folder to upload homework into */
  createCourse(input: CreateCourseInput): Promise<Course>;
  /** Homework assigned to this student */
  listHomeworks(): Promise<Homework[]>;
  getProblem(problemId: string): Promise<Problem>;
  /**
   * Upload a worksheet PDF and extract real questions into renderable problems.
   * The homework is filed into `courseId` (or the default course when omitted).
   */
  importHomeworkPdf(
    file: File,
    courseId?: string,
  ): Promise<HomeworkImportResult>;
  /** Observe + Map + Detect + Hypothesize: reasoning text in, diagnosis out */
  analyzeReasoning(problemId: string, reasoning: string): Promise<Diagnosis>;
  /** EverOS: record the repaired session so the brain map grows */
  recordLearningSession(
    topic: string,
    summary: string,
    score: number,
  ): Promise<void>;
}
