import { useCallback } from "react";
import type { CreateCourseInput } from "../scenarios/types";
import { backend } from ".";
import { useHomeworkLibrary } from "./useHomeworkLibrary";

/**
 * Courses live inside the homework library, so this hook wraps
 * useHomeworkLibrary and adds course creation. Refreshing the library keeps
 * courses, homeworks, and the derived brain graph in sync.
 */
export function useCourses() {
  const { library, loading, error, refresh } = useHomeworkLibrary();

  const createCourse = useCallback(
    async (input: CreateCourseInput) => {
      const course = await backend.createCourse(input);
      await refresh();
      return course;
    },
    [refresh],
  );

  return {
    courses: library.courses,
    library,
    loading,
    error,
    refresh,
    createCourse,
  };
}
