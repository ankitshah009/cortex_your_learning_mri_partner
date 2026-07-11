import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useApp } from "../state/store";
import {
  HOMEWORKS,
  PROBLEMS,
  homeworkProgress,
  firstUnfinished,
  islandStates,
} from "../scenarios/homework";
import { IslandMap } from "../components/brain-map/IslandMap";
import { Cora } from "../components/mascot/Cora";
import { SpeechBubble } from "../components/mascot/SpeechBubble";
import { ChunkyButton } from "../components/ui/ChunkyButton";

const AVATARS = ["🦊", "🐙", "🦖", "🐼"];

export function HomePage() {
  const { profile, completedProblems } = useApp();
  if (!profile) return <WelcomeScreen />;

  const islands = islandStates(completedProblems);
  const anyDone = Object.keys(completedProblems).length > 0;
  const hw = HOMEWORKS[0];
  const { done, total } = homeworkProgress(hw, completedProblems);
  const nextUp = firstUnfinished(hw, completedProblems);

  // Cora's memory book: the EverOS beat. Seeded history plus today's sessions.
  const memories = [
    { emoji: "🧃", text: "Unit rates: compared juice prices, 2 weeks ago" },
    { emoji: "🍕", text: "Fractions: shared pizza slices, last month" },
    ...Object.entries(completedProblems).map(([pid, outcome]) => {
      const p = PROBLEMS[pid];
      return {
        emoji: p?.emoji ?? "✨",
        text:
          outcome === "repaired"
            ? `Today: fixed a mix-up on ${p?.title ?? pid}!`
            : `Today: solid path on ${p?.title ?? pid}!`,
      };
    }),
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
        <IslandMap islands={islands} connected={anyDone} />
        <div className="pointer-events-none absolute -bottom-3 left-4 flex items-end gap-1">
          <Cora expression={anyDone ? "celebrating" : "curious"} size={104} />
          <div className="mb-12">
            <SpeechBubble
              text={
                done === total
                  ? "Homework done and your brain is glowing! 🌟"
                  : anyDone
                    ? "Your brain is growing! Ready for the next problem?"
                    : "I found a wobbly spot on Speed Springs! Your homework can help us fix it!"
              }
            />
          </div>
        </div>
      </div>

      {/* Homework: the guided path through real assigned problems */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-extrabold">My homework 📚</h2>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-3 flex items-center gap-5 rounded-3xl border-[3px] border-ink/10 bg-white p-5 shadow-[0_5px_0_rgba(63,46,86,0.08)]"
        >
          <span className="text-4xl">{hw.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold">{hw.title}</p>
            <p className="text-sm font-semibold text-ink-soft">
              {hw.subject} · {hw.due}
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <div className="h-3.5 max-w-56 flex-1 overflow-hidden rounded-full border-2 border-ink/10 bg-cloud-soft">
                <div
                  className="h-full rounded-full bg-teal transition-[width] duration-700"
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </div>
              <span className="font-display text-sm font-extrabold text-ink-soft">
                {done}/{total}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            {nextUp ? (
              <Link to={`/solve/${nextUp.id}`}>
                <ChunkyButton>
                  {done === 0 ? "Start homework 🚀" : "Keep going ➡️"}
                </ChunkyButton>
              </Link>
            ) : (
              <span className="rounded-full border-2 border-teal/40 bg-teal-soft px-4 py-2 text-center font-display font-extrabold text-teal-dark">
                All done! 🏆
              </span>
            )}
            <Link to={`/homework/${hw.id}`} className="text-center">
              <span className="font-display text-sm font-extrabold text-ink-soft underline decoration-2 underline-offset-2 hover:text-ink">
                See all problems
              </span>
            </Link>
          </div>
        </motion.div>

        {/* General path: prove the scanner works on ANY problem, not a script */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-3 flex items-center gap-5 rounded-3xl border-[3px] border-dashed border-lav/50 bg-lav-soft p-5"
        >
          <span className="text-4xl">✏️</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold">
              Bring your own problem
            </p>
            <p className="text-sm font-semibold text-ink-soft">
              Type any problem and Cora will scan your real thinking.
            </p>
          </div>
          <Link to="/custom" className="shrink-0">
            <ChunkyButton variant="lav">Try it ✨</ChunkyButton>
          </Link>
        </motion.div>
      </section>

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
