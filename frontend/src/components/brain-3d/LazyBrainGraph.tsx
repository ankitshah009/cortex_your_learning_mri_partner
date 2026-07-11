import { lazy } from "react";

/**
 * three.js + react-three-fiber are heavy, so the brain renderer is split into
 * its own chunk and only loaded on pages that actually show a brain. Import
 * this everywhere instead of BrainGraph directly, wrapped in <Suspense>.
 */
export const BrainGraph = lazy(() =>
  import("./BrainGraph").then((m) => ({ default: m.BrainGraph })),
);
