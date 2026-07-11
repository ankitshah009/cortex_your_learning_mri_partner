import { useCallback, useEffect, useState } from "react";
import type { HomeworkLibrary } from "../scenarios/types";
import { SEEDED_LIBRARY } from "../scenarios/homework";
import { backend } from ".";

export function useHomeworkLibrary() {
  const [library, setLibrary] = useState<HomeworkLibrary>(SEEDED_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLibrary(await backend.getHomeworkLibrary());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load homework.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { library, loading, error, refresh, setLibrary };
}
