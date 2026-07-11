import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Diagnosis } from "../../scenarios/types";
import { useStage, atOrAfter } from "../../stages/stageMachine";
import { visualFor, labelFor } from "./bubbleStates";
import {
  ThoughtBubbleNode,
  type ThoughtBubbleNodeType,
} from "./ThoughtBubbleNode";
import { PathEdge, type PathEdgeType, type PathEdgeState } from "./PathEdge";

const nodeTypes = { thought: ThoughtBubbleNode };
const edgeTypes = { path: PathEdge };

/** Stepping-stone layout: left to right with a playful vertical stagger */
const positionFor = (i: number) => ({ x: i * 300, y: i % 2 === 0 ? 0 : 80 });

function edgeStateFor(targetVisual: string): PathEdgeState {
  if (targetVisual === "wobbly" || targetVisual === "probing" || targetVisual === "found")
    return "shaky";
  if (targetVisual === "cloudy") return "confused";
  if (targetVisual === "fixed" || targetVisual === "relit") return "healed";
  return "calm";
}

function CanvasInner({ diagnosis }: { diagnosis: Diagnosis }) {
  const stage = useStage((s) => s.stage);
  const probeOutcome = useStage((s) => s.probeOutcome);
  const { setCenter, fitView } = useReactFlow();

  const nodes = useMemo<ThoughtBubbleNodeType[]>(
    () =>
      diagnosis.steps.map((step, i) => {
        const visual = visualFor(step, stage, diagnosis, probeOutcome);
        return {
          id: step.id,
          type: "thought",
          position: positionFor(i),
          data: {
            label: labelFor(step, visual, diagnosis),
            caption: step.caption,
            visual,
            order: i,
            inferred: !!step.inferred,
          },
          hidden: visual === "hidden",
        };
      }),
    [diagnosis, stage, probeOutcome],
  );

  const edges = useMemo<PathEdgeType[]>(() => {
    // Thoughts hop in during "mapping"; the connections draw at "scanning"
    if (!atOrAfter(stage, "scanning")) return [];
    return diagnosis.steps.slice(0, -1).map((step, i) => {
      const next = diagnosis.steps[i + 1];
      const targetVisual = visualFor(next, stage, diagnosis, probeOutcome);
      return {
        id: `e-${step.id}`,
        source: step.id,
        target: next.id,
        type: "path",
        data: { state: edgeStateFor(targetVisual) },
      };
    });
  }, [diagnosis, stage, probeOutcome]);

  // Stage-driven camera: zoom to the wobbly step when it's discovered,
  // pull back out to see the whole path heal.
  useEffect(() => {
    const mixupId = diagnosis.mixup?.stepId;
    if ((stage === "mixupFound" || stage === "probing") && mixupId) {
      const i = diagnosis.steps.findIndex((s) => s.id === mixupId);
      const pos = positionFor(i);
      setCenter(pos.x + 120, pos.y + 60, { zoom: 1.15, duration: 900 });
    } else if (
      stage === "mapping" ||
      stage === "scanning" ||
      stage === "hypothesis" ||
      stage === "repairing" ||
      stage === "celebrated"
    ) {
      fitView({ padding: 0.25, duration: 900 });
    }
  }, [stage, diagnosis, setCenter, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.4}
      maxZoom={1.6}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag
      zoomOnScroll
      proOptions={{ hideAttribution: false }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={30}
        size={2.5}
        color="#ecdfc8"
      />
    </ReactFlow>
  );
}

export function PathCanvas({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <ReactFlowProvider>
      <CanvasInner diagnosis={diagnosis} />
    </ReactFlowProvider>
  );
}
