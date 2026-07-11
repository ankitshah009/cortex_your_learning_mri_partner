import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useApp } from "../state/store";
import { averageSpeed } from "../scenarios/average-speed";
import { IslandMap } from "../components/brain-map/IslandMap";
import { Cora } from "../components/mascot/Cora";
import { SpeechBubble } from "../components/mascot/SpeechBubble";
import { ChunkyButton } from "../components/ui/ChunkyButton";

const AVATARS = ["🦊", "🐙", "🦖", "🐼"];

export function HomePage() {
  const { profile, repairedScenarios } = useApp();
  if (!profile) return <WelcomeScreen />;

  const repaired = repairedScenarios.includes(averageSpeed.id);

  // Cora's memory book: the EverOS beat. Seeded history plus today's session.
  const memories = [
    { emoji: "🧃", text: "Unit rates: compared juice prices, 2 weeks ago" },
    { emoji: "🍕", text: "Fractions: shared pizza slices, last month" },
    ...(repaired
      ? [{ emoji: "⚡", text: "Today: fixed the Speed-Smoothie Mix-up!" }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between">
        <p className="font-display text-2xl font-extrabold">Cortex 🧠</p>
        <span className="rounded-full border-[3px] border-ink/10 bg-white px-4 py-1.5 font-display font-extrabold">
          {profile.avatar} {profile.name}
        </span>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8"
      >
        <h1 className="font-display text-4xl font-extrabold leading-tight">
          Hi {profile.name}! This is your learning brain
        </h1>
        <p className="mt-2 max-w-[60ch] text-lg font-semibold text-ink-soft">
          Every island is something you're learning. Bright islands are strong.
          Wobbly spots are mix-ups waiting to be found!
        </p>
      </motion.div>

      <div className="relative mt-6">
        <IslandMap repaired={repaired} />
        <div className="pointer-events-none absolute -bottom-3 left-4 flex items-end gap-1">
          <Cora expression={repaired ? "celebrating" : "curious"} size={104} />
          <div className="mb-12">
            <SpeechBubble
              text={
                repaired
                  ? "Speed Springs is glowing! You fixed a mix-up today! 🌟"
                  : "I found a wobbly spot on Speed Springs! Want to check it out?"
              }
            />
          </div>
        </div>
        <div className="absolute bottom-5 right-5">
          <Link to="/solve">
            <ChunkyButton>
              {repaired ? "Explore it again 🔁" : "Start today's adventure 🚀"}
            </ChunkyButton>
          </Link>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-extrabold">
          Cora's memory book 📖
        </h2>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {memories.map((m) => (
            <span
              key={m.text}
              className="rounded-full border-[3px] border-ink/10 bg-white px-4 py-2 text-sm font-bold shadow-[0_3px_0_rgba(63,46,86,0.08)]"
            >
              {m.emoji} {m.text}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function WelcomeScreen() {
  const setProfile = useApp((s) => s.setProfile);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center">
          <Cora expression="excited" size={140} />
        </div>
        <div className="mt-4 rounded-3xl border-[3px] border-ink/10 bg-white p-7 shadow-[0_6px_0_rgba(63,46,86,0.08)]">
          <h1 className="text-center font-display text-3xl font-extrabold">
            Who's learning today?
          </h1>
          <label
            htmlFor="name"
            className="mt-5 block text-sm font-extrabold text-ink-soft"
          >
            Your name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
            className="mt-1.5 w-full rounded-2xl border-[3px] border-ink/10 p-3.5 font-display text-lg font-bold outline-none transition-colors focus:border-lav"
          />
          <p className="mt-4 text-sm font-extrabold text-ink-soft">
            Pick your buddy
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2.5">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={`rounded-2xl border-[3px] py-3 text-3xl transition-transform active:scale-90 ${
                  avatar === a
                    ? "border-coral bg-coral-soft"
                    : "border-ink/10 bg-white hover:scale-105"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <ChunkyButton
            className="mt-6 w-full"
            disabled={name.trim().length === 0}
            onClick={() => setProfile({ name: name.trim(), avatar })}
          >
            Let's go! 🚀
          </ChunkyButton>
        </div>
      </motion.div>
    </div>
  );
}
