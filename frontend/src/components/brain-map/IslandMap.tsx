import { motion } from "motion/react";
import type { IslandState } from "../../scenarios/homework";

function IslandBlob({ island }: { island: IslandState }) {
  const glow = island.mastery > 0.88;
  return (
    <g
      transform={`translate(${island.x}, ${island.y})`}
      className={island.wobbly ? "anim-wobble" : undefined}
      style={{
        opacity: 0.55 + island.mastery * 0.45,
        filter: glow
          ? "saturate(1.15) drop-shadow(0 0 14px rgba(255,201,77,0.8))"
          : `saturate(${0.55 + island.mastery * 0.45})`,
        transition: "opacity 1s ease, filter 1s ease",
      }}
    >
      {/* Water shadow */}
      <ellipse cx="0" cy="52" rx="92" ry="16" fill="#8fd7f2" opacity="0.6" />
      {/* Sandy base */}
      <path
        d="M-85 30 Q-90 55 -55 58 L55 58 Q90 55 85 30 Q60 12 0 14 Q-60 12 -85 30 Z"
        fill="#f6d9a4"
        stroke="#dfb578"
        strokeWidth="3.5"
      />
      {/* Grass top */}
      <path
        d="M-78 28 Q-80 -6 -40 -12 Q-20 -30 12 -24 Q48 -32 62 -8 Q82 2 74 26 Q40 40 0 38 Q-40 40 -78 28 Z"
        fill="#7cd08a"
        stroke="#4faf62"
        strokeWidth="3.5"
      />
      <text x="-14" y="8" fontSize="30">
        {island.emoji}
      </text>
      {/* Label plaque */}
      <g transform="translate(0, 84)">
        <rect
          x="-70"
          y="-17"
          width="140"
          height="34"
          rx="17"
          fill="white"
          stroke="rgba(63,46,86,0.12)"
          strokeWidth="3"
        />
        <text
          textAnchor="middle"
          y="6"
          fontSize="16"
          fontWeight="800"
          fill="#3f2e56"
          fontFamily="Baloo 2, sans-serif"
        >
          {island.name}
        </text>
      </g>
      {/* Wobbly-spot marker: an unresolved mix-up lives here */}
      {island.wobbly && (
        <g className="anim-bounce-soft">
          <circle cx="52" cy="-38" r="17" fill="#ffc94d" stroke="#d99a14" strokeWidth="3" />
          <text
            x="52"
            y="-30"
            textAnchor="middle"
            fontSize="20"
            fontWeight="800"
            fill="#3f2e56"
            fontFamily="Baloo 2, sans-serif"
          >
            ?
          </text>
        </g>
      )}
    </g>
  );
}

export function IslandMap({
  islands,
  connected,
}: {
  islands: IslandState[];
  /** At least one repaired/solid session: the first concept bridge lights up */
  connected: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-[3px] border-ink/10 bg-gradient-to-b from-sky to-[#dff4ff] shadow-[0_6px_0_rgba(63,46,86,0.08)]">
      <svg viewBox="0 0 900 430" className="block w-full">
        {/* Drifting clouds */}
        <motion.g
          animate={{ x: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse cx="150" cy="60" rx="52" ry="20" fill="white" opacity="0.9" />
          <ellipse cx="190" cy="52" rx="38" ry="16" fill="white" opacity="0.9" />
        </motion.g>
        <motion.g
          animate={{ x: [0, -36, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse cx="700" cy="75" rx="58" ry="20" fill="white" opacity="0.85" />
          <ellipse cx="748" cy="66" rx="36" ry="15" fill="white" opacity="0.85" />
        </motion.g>

        {/* Bridge between Speed Springs and Time Trails: a connection between
            concepts. Dashed while learning, solid and flowing once earned. */}
        <path
          d="M255 235 Q330 165 375 165"
          fill="none"
          stroke={connected ? "var(--color-teal)" : "var(--color-cloud)"}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={connected ? "12 6" : "3 14"}
          className={connected ? "anim-dash-flow" : undefined}
          style={{ transition: "stroke 1s ease" }}
        />
        {connected && (
          <g transform="translate(300, 130)">
            <rect
              x="-72"
              y="-16"
              width="144"
              height="32"
              rx="16"
              fill="var(--color-teal)"
            />
            <text
              textAnchor="middle"
              y="6"
              fontSize="15"
              fontWeight="800"
              fill="white"
              fontFamily="Baloo 2, sans-serif"
            >
              +1 connection! ✨
            </text>
          </g>
        )}

        {islands.map((island) => (
          <IslandBlob key={island.id} island={island} />
        ))}
      </svg>
    </div>
  );
}
