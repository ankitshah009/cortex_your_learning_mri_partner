import {
  BaseEdge,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

export type PathEdgeState = "calm" | "shaky" | "confused" | "healed";

export type PathEdgeData = { state: PathEdgeState };

export type PathEdgeType = Edge<PathEdgeData, "path">;

const edgeStyles: Record<
  PathEdgeState,
  { stroke: string; dash?: string; flow?: boolean; opacity?: number }
> = {
  calm: { stroke: "var(--color-teal)" },
  shaky: { stroke: "var(--color-sun-dark)", dash: "7 7" },
  confused: { stroke: "var(--color-cloud)", dash: "4 8", opacity: 0.7 },
  healed: { stroke: "var(--color-teal)", dash: "10 4", flow: true },
};

export function PathEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<PathEdgeType>) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const s = edgeStyles[data?.state ?? "calm"];

  return (
    <BaseEdge
      path={path}
      className={s.flow ? "anim-dash-flow" : undefined}
      style={{
        stroke: s.stroke,
        strokeWidth: 4,
        strokeLinecap: "round",
        strokeDasharray: s.dash,
        opacity: s.opacity ?? 1,
        transition: "stroke 0.5s ease, opacity 0.5s ease",
      }}
    />
  );
}
