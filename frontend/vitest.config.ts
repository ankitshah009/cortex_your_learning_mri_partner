import { defineConfig } from "vitest/config";

// Minimal test config, independent of vite.config.ts (no React/Tailwind
// plugins needed — the tests avoid JSX). Default environment is node;
// files that need the DOM/localStorage opt in via a
// `// @vitest-environment jsdom` docblock at the top of the file.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
