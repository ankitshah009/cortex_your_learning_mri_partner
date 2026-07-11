import type { DataProvider } from "./provider";
import { mockProvider } from "./mock";
import { makeLiveProvider } from "./live";

// Set VITE_ANALYZE_URL in frontend/.env to wire a real analyze endpoint.
// Without it the app runs fully on seeded content.
const analyzeUrl = import.meta.env.VITE_ANALYZE_URL as string | undefined;

export const backend: DataProvider = analyzeUrl
  ? makeLiveProvider(analyzeUrl)
  : mockProvider;
