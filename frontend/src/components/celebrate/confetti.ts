import confetti from "canvas-confetti";

const PALETTE = ["#ff6b6b", "#2ec4b6", "#ffc94d", "#9b8cff", "#ff9bb3"];

const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Small burst for "we found the mix-up!" */
export function miniBurst() {
  if (reduceMotion()) return;
  confetti({
    particleCount: 70,
    spread: 70,
    startVelocity: 32,
    origin: { x: 0.65, y: 0.5 },
    colors: PALETTE,
  });
}

/** The big one: repair complete, brain grew */
export function bigCelebration() {
  if (reduceMotion()) return;
  const fire = (x: number, angle: number) =>
    confetti({
      particleCount: 90,
      angle,
      spread: 65,
      startVelocity: 45,
      origin: { x, y: 0.75 },
      colors: PALETTE,
    });
  fire(0.1, 60);
  fire(0.9, 120);
  setTimeout(() => confetti({ particleCount: 120, spread: 100, origin: { y: 0.4 }, colors: PALETTE }), 350);
}
