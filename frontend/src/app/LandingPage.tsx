/**
 * Cinematic marketing hero shown before the kids app.
 * One composition, one dominant CTA. Two motions total (fade-up + gradient
 * shimmer), both gated behind prefers-reduced-motion in index.css.
 */
export function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0a0a1a] text-[#f2f0fb]">
      {/* Ambient glow + synapse constellation (pure decoration) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,93,250,0.16),rgba(59,130,246,0.07)_45%,transparent_70%)]"
      />
      <Constellation />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-6 py-8 md:px-10">
        {/* Wordmark: the brand lockup, pre-trimmed and sized for the web
            (cortex-lockup-tight.png is derived from cortex-lockup-transparent.png) */}
        <header className="flex items-center">
          <img
            src="/brand/cortex-lockup-tight.png"
            alt="Cortex"
            className="h-10 w-auto select-none"
            draggable={false}
          />
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col justify-center py-12">
          <p
            className="landing-fade-up inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-semibold tracking-wide text-[#b9b1e6]"
            style={{ animationDelay: "0ms" }}
          >
            <span aria-hidden className="text-[#8b7bff]">
              ✦
            </span>
            Learning MRI&trade; Technology
          </p>

          <h1
            className="landing-fade-up mt-7 max-w-4xl font-display text-5xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl md:text-7xl"
            style={{ animationDelay: "90ms" }}
          >
            See where{" "}
            <span className="landing-shimmer bg-gradient-to-r from-[#5b8cff] via-[#8b7bff] to-[#a855f7] bg-clip-text text-transparent">
              understanding
            </span>{" "}
            <span className="text-[#ff6b8a]">breaks.</span>
          </h1>

          <p
            className="landing-fade-up mt-6 max-w-[56ch] text-lg leading-relaxed text-[#aaa3c8]"
            style={{ animationDelay: "180ms" }}
          >
            Cortex analyzes how students reason, identifies the root
            misunderstanding, and delivers the exact next step that drives real
            learning.
          </p>

          <div
            className="landing-fade-up mt-10 flex flex-wrap items-center gap-6"
            style={{ animationDelay: "270ms" }}
          >
            <button
              type="button"
              onClick={onEnter}
              className="cursor-pointer rounded-2xl bg-gradient-to-r from-[#5b8cff] to-[#a855f7] px-8 py-4 font-display text-lg font-extrabold text-white shadow-[0_8px_32px_rgba(124,93,250,0.35)] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9b1e6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a1a] motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              Enter Cortex &rarr;
            </button>
            <button
              type="button"
              onClick={onEnter}
              className="cursor-pointer text-base font-semibold text-[#aaa3c8] underline decoration-white/25 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9b1e6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a1a] rounded-sm"
            >
              or upload your own homework
            </button>
          </div>
        </main>

        {/* Pillars: the diagnostic loop, in order */}
        <footer
          className="landing-fade-up grid grid-cols-1 gap-x-10 gap-y-6 border-t border-white/[0.07] py-8 sm:grid-cols-2 lg:grid-cols-4"
          style={{ animationDelay: "360ms" }}
        >
          <Pillar
            color="#5b8cff"
            title="Trace"
            blurb="Reconstruct student reasoning"
            icon={
              <path d="M3 15c3.5 0 3.5-7 7-7s3.5 7 7 7M3 15h.01M17 15h.01" />
            }
          />
          <Pillar
            color="#a78bfa"
            title="Diagnose"
            blurb="Find the first point of misunderstanding"
            icon={
              <>
                <circle cx="10" cy="10" r="5.5" />
                <path d="m14.2 14.2 3.3 3.3" />
              </>
            }
          />
          <Pillar
            color="#ff6b8a"
            title="Probe"
            blurb="Verify with adaptive questions"
            icon={
              <path d="M7 8.2a3.2 3.2 0 1 1 4.4 3c-1 .5-1.4 1.1-1.4 2.1M10 16.5h.01" />
            }
          />
          <Pillar
            color="#ffa94d"
            title="Prescribe"
            blurb="Deliver the smallest next step"
            icon={<path d="M3 10h11M10 5.5 14.5 10 10 14.5M17 4v12" />}
          />
        </footer>
      </div>
    </div>
  );
}

function Pillar({
  color,
  title,
  blurb,
  icon,
}: {
  color: string;
  title: string;
  blurb: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}1f` }}
      >
        <svg
          viewBox="0 0 20 20"
          className="h-5 w-5"
          fill="none"
          stroke={color}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icon}
        </svg>
      </span>
      <div>
        <p className="font-display text-base font-extrabold" style={{ color }}>
          {title}
        </p>
        <p className="text-base leading-snug text-[#aaa3c8]">{blurb}</p>
      </div>
    </div>
  );
}

/** Faint synapse network behind the right side of the hero. Static, decorative. */
function Constellation() {
  const nodes: Array<[number, number, number, string]> = [
    [110, 90, 4, "#5b8cff"],
    [260, 40, 3, "#a78bfa"],
    [400, 130, 5, "#8b7bff"],
    [190, 230, 3.5, "#ff6b8a"],
    [340, 300, 4, "#5b8cff"],
    [480, 250, 3, "#a78bfa"],
    [250, 420, 4.5, "#8b7bff"],
    [430, 470, 3, "#ffa94d"],
    [120, 380, 2.5, "#a78bfa"],
    [520, 400, 3.5, "#5b8cff"],
  ];
  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [0, 3],
    [3, 4],
    [2, 5],
    [4, 5],
    [4, 6],
    [6, 7],
    [3, 8],
    [5, 9],
    [7, 9],
    [8, 6],
  ];
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 560"
      className="pointer-events-none absolute -right-24 top-1/2 hidden h-[34rem] w-[36rem] -translate-y-1/2 opacity-40 md:block lg:-right-8"
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]}
          y1={nodes[a][1]}
          x2={nodes[b][0]}
          y2={nodes[b][1]}
          stroke="#8b7bff"
          strokeOpacity="0.22"
          strokeWidth="1"
        />
      ))}
      {nodes.map(([x, y, r, c], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={c} fillOpacity="0.55" />
      ))}
    </svg>
  );
}
