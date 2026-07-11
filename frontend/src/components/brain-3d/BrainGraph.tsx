import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { CourseColor, CourseGraph } from "../../scenarios/types";
import { placeConceptsInBrain, sampleBrainVolume } from "./brainShape";

/** Accent (strong-concept) colors per course, matching the app palette. */
const ACCENTS: Record<CourseColor, string> = {
  lav: "#a78bfa",
  teal: "#2dd4bf",
  coral: "#fb7185",
  sky: "#38bdf8",
  gold: "#ffc94d",
};
const WOBBLY_COLOR = "#f97316"; // warm amber for unfinished/wobbly concepts

interface PlacedNode {
  id: string;
  label: string;
  emoji: string;
  mastery: number;
  wobbly: boolean;
  position: THREE.Vector3;
}

function placeNodes(graph: CourseGraph): PlacedNode[] {
  const positions = placeConceptsInBrain(graph.nodes.length);
  return graph.nodes.map((node, i) => ({ ...node, position: positions[i] }));
}

/* ---------- The brain "tissue": a dim neuron point cloud giving the shape ---------- */

function TissueField({ accent }: { accent: string }) {
  const ref = useRef<THREE.Points>(null);
  const { geometry, material } = useMemo(() => {
    const pts = sampleBrainVolume(900, 3, 0.82);
    const positions = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(accent),
      size: 0.045,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: geo, material: mat };
  }, [accent]);

  useFrame(({ clock }) => {
    // Gentle breathing so the tissue never looks frozen.
    if (ref.current) {
      const t = clock.getElapsedTime();
      const s = 1 + Math.sin(t * 0.8) * 0.012;
      ref.current.scale.setScalar(s);
    }
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}

/* ---------- Concept neurons: bright, mastery-colored, fire on completion ---------- */

function Neuron({
  node,
  accent,
  firing,
  hovered,
  active,
  onHover,
  onSelect,
}: {
  node: PlacedNode;
  accent: string;
  /** true briefly when this concept was just completed */
  firing: boolean;
  /** this neuron is currently hovered (show its label) */
  hovered: boolean;
  /** this neuron is in an open concept chat: hold its glow + ripple */
  active: boolean;
  onHover: (id: string | null) => void;
  onSelect?: (id: string) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const fireStart = useRef<number | null>(null);

  const color = useMemo(
    () => new THREE.Color(node.wobbly ? WOBBLY_COLOR : accent),
    [node.wobbly, accent],
  );
  const size = 0.07 + node.mastery * 0.09;

  useEffect(() => {
    if (firing) fireStart.current = performance.now();
  }, [firing]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();

    // Wobbly concepts pulse to say "come fix me"; strong ones breathe slowly.
    let scale = node.wobbly ? 1 + Math.sin(t * 3) * 0.14 : 1 + Math.sin(t * 1.2) * 0.05;

    // Completion burst: a sharp expand-and-settle when the neuron fires.
    if (fireStart.current !== null) {
      const elapsed = (performance.now() - fireStart.current) / 1000;
      if (elapsed < 1.1) {
        scale *= 1 + Math.exp(-elapsed * 5) * 1.4 * Math.max(0, 1 - elapsed);
      } else {
        fireStart.current = null;
      }
    }
    ref.current.scale.setScalar(scale);
    if (haloRef.current) haloRef.current.scale.setScalar(scale * 1.5);

    // Active neuron emits a repeating ripple ring: "this region is talking".
    if (rippleRef.current) {
      const mat = rippleRef.current.material as THREE.MeshBasicMaterial;
      if (active) {
        const phase = (t % 1.4) / 1.4;
        rippleRef.current.scale.setScalar(1 + phase * 2.6);
        mat.opacity = 0.35 * (1 - phase);
      } else {
        mat.opacity = 0;
      }
    }
  });

  // Hovered/active neuron glows harder and grows so it's the clear focus.
  const emissive =
    (node.wobbly ? 0.5 : 0.6 + node.mastery * 1.0) +
    (hovered ? 0.8 : 0) +
    (active ? 0.9 : 0);
  const focused = hovered || active;

  return (
    <group position={node.position}>
      <mesh
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(node.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(node.id);
        }}
      >
        <sphereGeometry args={[focused ? size * 1.35 : size, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissive}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={focused ? 0.25 : node.wobbly ? 0.12 : 0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={rippleRef}>
        <sphereGeometry args={[size * 1.4, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Labels only show on hover/active, so a dense brain stays readable. */}
      {focused && (
        <Html center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <div
            className="-translate-y-8 select-none whitespace-nowrap rounded-full border-2 px-3 py-1 text-center font-display text-sm font-extrabold shadow-[0_3px_0_rgba(63,46,86,0.12)]"
            style={{
              background: "rgba(255,255,255,0.97)",
              borderColor: node.wobbly
                ? "rgba(249,115,22,0.5)"
                : "rgba(63,46,86,0.15)",
              color: node.wobbly ? "#b45309" : "#3f2e56",
            }}
          >
            {node.emoji} {node.label}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ---------- Synapses: curved arcs with a traveling signal pulse ---------- */

function Synapse({
  from,
  to,
  strength,
  accent,
  phase,
  dimmed,
  boosted,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  strength: number;
  accent: string;
  phase: number;
  /** faded because another concept is hovered and this isn't connected to it */
  dimmed: boolean;
  /** brightened + sped up because it touches the concept being chatted with */
  boosted: boolean;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => {
    // Bow the connection slightly outward from brain center for an organic arc.
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.multiplyScalar(1.12);
    return new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
  }, [from, to]);

  const lineGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints(curve.getPoints(24));
    return g;
  }, [curve]);

  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(accent),
        transparent: true,
        opacity: 0.12 + strength * 0.28,
      }),
    [accent, strength],
  );

  useFrame(({ clock }) => {
    lineMaterial.opacity = dimmed
      ? 0.03
      : boosted
        ? Math.min(0.85, 0.4 + strength * 0.4)
        : 0.12 + strength * 0.28;
    if (!pulseRef.current) return;
    // A light bead travels from source to target on a loop; activated
    // synapses fire their signal roughly twice as fast.
    const speed = boosted ? 0.75 : 0.35;
    const t = (clock.getElapsedTime() * speed + phase) % 1;
    const p = curve.getPoint(t);
    pulseRef.current.position.copy(p);
    // Fade the bead in and out at the ends so it "arrives" and re-emits.
    const fade = Math.sin(t * Math.PI);
    (pulseRef.current.material as THREE.MeshBasicMaterial).opacity = dimmed
      ? 0
      : fade * (boosted ? 0.95 : 0.4 + strength * 0.5);
  });

  return (
    <group>
      <primitive object={new THREE.Line(lineGeometry, lineMaterial)} />
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* ---------- Scene ---------- */

function BrainScene({
  graph,
  accent,
  interactive,
  firedIds,
  activeId,
  onNodeSelect,
}: {
  graph: CourseGraph;
  accent: string;
  interactive: boolean;
  firedIds: Set<string>;
  activeId?: string | null;
  onNodeSelect?: (id: string) => void;
}) {
  const placed = useMemo(() => placeNodes(graph), [graph]);
  const byId = useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed]);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useFrame((_, delta) => {
    // Idle cards spin; the interactive brain also drifts, but pauses on hover
    // or while a concept chat is open so the reader can study that concept.
    if (groupRef.current && (!interactive || (hovered === null && !activeId))) {
      groupRef.current.rotation.y += delta * (interactive ? 0.12 : 0.22);
    }
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <pointLight position={[6, 6, 6]} intensity={1.1} />
      <pointLight position={[-6, -4, -4]} intensity={0.5} color={accent} />
      <group ref={groupRef}>
        <TissueField accent={accent} />
        {graph.edges.map((edge, i) => {
          const a = byId.get(edge.source);
          const b = byId.get(edge.target);
          if (!a || !b) return null;
          // When a concept is hovered or chatting, only its synapses stay lit.
          const focus = hovered ?? activeId ?? null;
          const connected =
            focus === null || edge.source === focus || edge.target === focus;
          const boosted =
            !!activeId &&
            (edge.source === activeId || edge.target === activeId);
          return (
            <Synapse
              key={`${edge.source}-${edge.target}`}
              from={a.position}
              to={b.position}
              strength={edge.strength}
              accent={accent}
              phase={(i * 0.137) % 1}
              dimmed={!connected}
              boosted={boosted}
            />
          );
        })}
        {placed.map((node) => (
          <Neuron
            key={node.id}
            node={node}
            accent={accent}
            firing={firedIds.has(node.id)}
            hovered={hovered === node.id}
            active={activeId === node.id}
            onHover={setHovered}
            onSelect={onNodeSelect}
          />
        ))}
      </group>
      {interactive && (
        <OrbitControls
          enablePan={false}
          enableZoom
          autoRotate={hovered === null && !activeId}
          autoRotateSpeed={0.7}
          minDistance={4}
          maxDistance={14}
        />
      )}
    </>
  );
}

/**
 * Watch the graph's per-node mastery and flag any node whose mastery just rose
 * (a freshly completed concept) so its neuron fires. Returns the set of firing
 * ids, cleared shortly after each burst.
 */
function useFiredNodes(graph: CourseGraph): Set<string> {
  const prev = useRef<Map<string, number>>(new Map());
  const [fired, setFired] = useState<Set<string>>(new Set());

  useEffect(() => {
    const justFired = new Set<string>();
    for (const node of graph.nodes) {
      const before = prev.current.get(node.id);
      if (before !== undefined && node.mastery > before + 0.001) {
        justFired.add(node.id);
      }
    }
    prev.current = new Map(graph.nodes.map((n) => [n.id, n.mastery]));
    if (justFired.size > 0) {
      setFired(justFired);
      const timer = setTimeout(() => setFired(new Set()), 1300);
      return () => clearTimeout(timer);
    }
  }, [graph]);

  return fired;
}

export function BrainGraph({
  graph,
  color = "lav",
  interactive = true,
  className,
  activeId,
  onNodeSelect,
}: {
  graph: CourseGraph;
  color?: CourseColor;
  interactive?: boolean;
  className?: string;
  /** Concept currently open in a chat: its neuron ripples + synapses boost */
  activeId?: string | null;
  onNodeSelect?: (id: string) => void;
}) {
  const accent = ACCENTS[color] ?? ACCENTS.lav;
  const fired = useFiredNodes(graph);

  if (graph.nodes.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-3xl border-[3px] border-ink/10 bg-gradient-to-b from-[#f3eefe] to-[#eaf6ff] text-center ${className ?? ""}`}
      >
        <p className="px-6 font-display text-sm font-extrabold text-ink-soft">
          Upload homework to grow this brain 🧠
        </p>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-3xl border-[3px] border-ink/10 bg-gradient-to-b from-[#f3eefe] to-[#eaf6ff] ${className ?? ""}`}
    >
      <Canvas
        camera={{ position: [0, 0.3, 8], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <BrainScene
          graph={graph}
          accent={accent}
          interactive={interactive}
          firedIds={fired}
          activeId={activeId}
          onNodeSelect={onNodeSelect}
        />
      </Canvas>
    </div>
  );
}
