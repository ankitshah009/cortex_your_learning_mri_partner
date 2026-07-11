import type {
  Course,
  Diagnosis,
  HomeworkImportResult,
  HomeworkLibrary,
  Problem,
} from "../scenarios/types";
import type { DataProvider } from "./provider";
import { mockProvider } from "./mock";
import {
  DEFAULT_COURSE_ID,
  mergeHomeworkLibrary,
  SEEDED_LIBRARY,
} from "../scenarios/homework";
import {
  loadCreatedCourses,
  makeCourse,
  saveCreatedCourses,
} from "./courseStore";
import { getCustomProblem, isCustomProblem } from "../scenarios/custom";

const STORAGE_KEY = "cortex-imported-homework-library";

interface LiveProviderOptions {
  apiBaseUrl?: string;
  analyzeUrl?: string;
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function emptyImportedLibrary(): HomeworkLibrary {
  return { courses: [], homeworks: [], problems: {} };
}

function loadImportedLibrary(): HomeworkLibrary {
  if (typeof window === "undefined") return emptyImportedLibrary();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyImportedLibrary();
    const parsed = JSON.parse(raw) as HomeworkLibrary;
    if (!Array.isArray(parsed.homeworks) || typeof parsed.problems !== "object") {
      return emptyImportedLibrary();
    }
    // Tolerate libraries saved before courses existed.
    if (!Array.isArray(parsed.courses)) parsed.courses = [];
    return parsed;
  } catch {
    return emptyImportedLibrary();
  }
}

function saveImportedLibrary(library: HomeworkLibrary) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

/**
 * Provenance of a Diagnosis returned by the live provider, so the judge
 * panel can be honest about where the data came from. Unset means the
 * provider ran in mock-only mode (no live endpoint configured).
 */
export type DiagnosisSource = "live" | "seeded-fallback";
export type LiveDiagnosis = Diagnosis & { source?: DiagnosisSource };

function validateDiagnosis(data: Diagnosis, problemId: string): Diagnosis {
  if (!Array.isArray(data.steps) || data.steps.length === 0) {
    throw new Error("diagnosis missing steps");
  }
  if (!data.celebration?.headline || !data.celebration?.sub) {
    throw new Error("diagnosis missing celebration");
  }
  if (data.mixup) {
    if (!data.steps.some((s) => s.id === data.mixup!.stepId)) {
      throw new Error("diagnosis mixup.stepId does not match any step id");
    }
    if (
      !Array.isArray(data.mixup.probe?.options) ||
      data.mixup.probe.options.length === 0
    ) {
      throw new Error("diagnosis mixup.probe.options must be a non-empty array");
    }
  }
  return { ...data, problemId };
}

/**
 * Live adapter: POSTs the student's reasoning to a real analyze endpoint
 * (a Butterbase serverless function wrapping the LLM + EverOS).
 *
 * Contract (general — works for ANY problem, not just seeded ones):
 *   POST {url}  body: { problemId, problem: { title, statement }, reasoning }
 *   response: a Diagnosis JSON (see scenarios/types.ts)
 *
 * Failures on seeded problems fall back to the seeded diagnosis so a live
 * demo can never stall — the returned Diagnosis is tagged with
 * source: "seeded-fallback" (vs "live") so the judge panel can disclose it.
 * Custom problems have no seed, so a failure propagates and the UI shows
 * its retry state.
 */
export function makeLiveProvider(options: LiveProviderOptions): DataProvider {
  const apiBaseUrl = options.apiBaseUrl
    ? normalizeBaseUrl(options.apiBaseUrl)
    : undefined;
  const analyzeUrl = options.analyzeUrl;
  // Butterbase functions are reachable only at exactly /v1/{app}/fn/{name} —
  // subpaths 404 at the platform edge. The deployed `api` router function
  // reads the intended route from ?path=, so all API calls go through here.
  const apiUrl = (path: string) =>
    `${apiBaseUrl}?path=${encodeURIComponent(path)}`;
  let importedLibrary = loadImportedLibrary();
  let createdCourses = loadCreatedCourses();

  const getLibrary = () =>
    mergeHomeworkLibrary(SEEDED_LIBRARY, {
      ...importedLibrary,
      courses: [...createdCourses, ...importedLibrary.courses],
    });

  return {
    async getHomeworkLibrary() {
      return getLibrary();
    },
    async listCourses() {
      return getLibrary().courses;
    },
    async createCourse(input) {
      const course = makeCourse(input);
      if (apiBaseUrl) {
        try {
          const res = await fetch(apiUrl("/api/courses"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input),
          });
          if (res.ok) {
            const saved = (await res.json()) as Course;
            createdCourses = [...createdCourses, saved];
            saveCreatedCourses(createdCourses);
            return saved;
          }
        } catch (err) {
          console.warn("[live] createCourse API failed, storing locally", err);
        }
      }
      createdCourses = [...createdCourses, course];
      saveCreatedCourses(createdCourses);
      return course;
    },
    async listHomeworks() {
      return getLibrary().homeworks;
    },
    async getProblem(problemId) {
      const problem = isCustomProblem(problemId)
        ? getCustomProblem(problemId)
        : getLibrary().problems[problemId];
      if (!problem) throw new Error(`Unknown problem: ${problemId}`);
      return problem;
    },
    async importHomeworkPdf(file, courseId): Promise<HomeworkImportResult> {
      const targetCourseId = courseId ?? DEFAULT_COURSE_ID;
      if (!apiBaseUrl) {
        return mockProvider.importHomeworkPdf(file, targetCourseId);
      }

      const form = new FormData();
      form.append("file", file);
      form.append("courseId", targetCourseId);

      const res = await fetch(apiUrl("/api/homeworks/import-pdf"), {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `PDF import returned ${res.status}`);
      }

      const result = (await res.json()) as HomeworkImportResult;
      const homework = { ...result.homework, courseId: targetCourseId };
      const problems = Object.fromEntries(result.problems.map((p) => [p.id, p]));
      // File the new homework into its course so the folder structure grows.
      importedLibrary = mergeHomeworkLibrary(importedLibrary, {
        courses: [
          {
            id: targetCourseId,
            title: "",
            emoji: "",
            color: "lav",
            subject: "",
            homeworkIds: [homework.id],
          },
        ],
        homeworks: [homework],
        problems,
      });
      saveImportedLibrary(importedLibrary);
      return { ...result, homework, courseId: targetCourseId };
    },
    async analyzeReasoning(problemId, reasoning): Promise<Diagnosis> {
      const problem = isCustomProblem(problemId)
        ? getCustomProblem(problemId)
        : (getLibrary().problems[problemId] as Problem | undefined);
      if (!problem) throw new Error(`Unknown problem: ${problemId}`);
      const url = apiBaseUrl ? apiUrl("/api/analyze") : analyzeUrl;
      if (!url) return mockProvider.analyzeReasoning(problemId, reasoning);

      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 45000);
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ problemId, problem, reasoning }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`analyze returned ${res.status}`);
        const data = (await res.json()) as Diagnosis;
        const live: LiveDiagnosis = {
          ...validateDiagnosis(data, problemId),
          source: "live",
        };
        return live;
      } catch (err) {
        console.warn("[live] analyze failed, using seeded diagnosis", err);
        // No seed exists for custom/pdf problems: rethrow to the UI.
        if (isCustomProblem(problemId) || problem.source === "pdf") throw err;
        const seeded: LiveDiagnosis = {
          ...(await mockProvider.analyzeReasoning(problemId, reasoning)),
          source: "seeded-fallback",
        };
        return seeded;
      }
    },
    async evaluateStudentQuestion(input) {
      if (!apiBaseUrl) return mockProvider.evaluateStudentQuestion(input);

      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch(apiUrl("/api/evaluate-question"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`evaluate-question returned ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn("[live] evaluate-question failed, using local heuristic", err);
        return mockProvider.evaluateStudentQuestion(input);
      }
    },
    async recordLearningSession(topic, summary, score) {
      if (!apiBaseUrl) {
        return mockProvider.recordLearningSession(topic, summary, score);
      }
      try {
        await fetch(apiUrl("/api/sessions"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ topic, summary, score }),
        });
      } catch (err) {
        console.info("[live] record session skipped", err);
      }
    },
  };
}
