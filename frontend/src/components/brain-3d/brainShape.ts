import * as THREE from "three";

/**
 * Brain-shaped point sampling.
 *
 * The brain is modeled as an ellipsoid (wider than tall, flattened front-back)
 * split into two hemispheres with a gap down the midline, plus a lengthwise
 * folding wobble so the silhouette reads as a lobed brain rather than an egg.
 * Both the faint "tissue" neurons and the labeled concept nodes are placed by
 * the same sampler so concepts always sit inside the brain volume.
 */

// Ellipsoid half-extents (x = left-right, y = up-down, z = front-back).
const BRAIN = { x: 2.7, y: 1.9, z: 2.2 };
const MIDLINE_GAP = 0.22; // hemisphere separation down the center

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function rand(seed: number) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Surface folding: pushes points in/out to fake gyri so it isn't a smooth egg. */
function fold(dir: THREE.Vector3) {
  const f =
    Math.sin(dir.x * 6.0) * 0.06 +
    Math.sin(dir.y * 7.0 + 1.3) * 0.05 +
    Math.sin(dir.z * 5.0 + 2.1) * 0.05;
  return 1 + f;
}

/**
 * Place `count` points filling the brain volume. `jitter` (0..1) controls how
 * far toward the surface points push; concept nodes use a lower jitter so they
 * sit in the meatier interior and read clearly.
 */
export function sampleBrainVolume(
  count: number,
  seedOffset = 0,
  fillBias = 0.72,
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const s = i + seedOffset * 1000;
    // Spherical direction via golden-angle for even coverage.
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = Math.PI * (3 - Math.sqrt(5)) * i;
    const dir = new THREE.Vector3(
      Math.cos(theta) * r,
      y,
      Math.sin(theta) * r,
    ).normalize();

    // Radius: bias points toward the surface so the shell (cortex) is dense,
    // but keep interior filled. fillBias closer to 1 = more surface-hugging.
    const radius = fillBias + (1 - fillBias) * rand(s + 7);
    const shaped = radius * fold(dir);

    const p = new THREE.Vector3(
      dir.x * BRAIN.x * shaped,
      dir.y * BRAIN.y * shaped,
      dir.z * BRAIN.z * shaped,
    );

    // Split hemispheres: push each side away from the midline plane.
    p.x += p.x >= 0 ? MIDLINE_GAP : -MIDLINE_GAP;

    // Slight downward/forward brain-stem taper at the bottom-front.
    if (p.y < -0.4) p.z -= (p.y + 0.4) * 0.35;

    points.push(p);
  }
  return points;
}

/**
 * Place concept nodes inside the brain volume. Uses a distinct seed so concept
 * positions are stable and spread across both hemispheres, not clustered.
 */
export function placeConceptsInBrain(count: number): THREE.Vector3[] {
  if (count === 0) return [];
  if (count === 1) return [new THREE.Vector3(0, 0.2, 0)];
  // Concepts sit deeper (lower fillBias) so labels aren't lost on the surface.
  return sampleBrainVolume(count, 42, 0.42).map((p, i) =>
    // Nudge alternating concepts left/right to guarantee both hemispheres used.
    p.clone().setX(p.x + (i % 2 === 0 ? 0.15 : -0.15)),
  );
}
