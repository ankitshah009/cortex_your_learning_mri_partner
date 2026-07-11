import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { saveCustomProblem } from "../scenarios/custom";
import { Cora } from "../components/mascot/Cora";
import { SpeechBubble } from "../components/mascot/SpeechBubble";
import { ChunkyButton } from "../components/ui/ChunkyButton";

/** Bring-your-own-problem: the general path that proves Cortex isn't canned */
export function CustomProblemPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");

  const start = () => {
    const problem = saveCustomProblem({
      title,
      statement,
      sampleReasoning: "",
    });
    navigate(`/solve/${problem.id}`);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b-[3px] border-ink/5 bg-white px-5">
        <Link
          to="/"
          className="font-display text-lg font-extrabold text-ink-soft transition-colors hover:text-ink"
        >
          ← My brain
        </Link>
        <span className="font-display text-xl font-extrabold">
          Bring your own problem ✏️
        </span>
        <span className="w-24" />
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-4xl items-end gap-8">
          <div className="hidden shrink-0 flex-col items-center md:flex">
            <SpeechBubble text="Give me any problem — I'll scan real thinking, not a script!" />
            <div className="mt-3">
              <Cora expression="excited" size={150} />
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0 flex-1"
          >
            <div className="rounded-3xl border-[3px] border-ink/10 bg-white p-6 shadow-[0_6px_0_rgba(63,46,86,0.08)]">
              <label
                htmlFor="custom-title"
                className="font-display text-lg font-extrabold"
              >
                What's the problem called?
              </label>
              <input
                id="custom-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My own problem"
                className="mt-2 w-full rounded-2xl border-[3px] border-ink/10 bg-white p-3 font-semibold outline-none transition-colors focus:border-lav"
              />
              <label
                htmlFor="custom-statement"
                className="mt-4 block font-display text-lg font-extrabold"
              >
                Type the problem 📝
              </label>
              <p className="mt-1 text-sm font-semibold text-ink-soft">
                Any word problem works — math, rates, fractions, you name it.
              </p>
              <textarea
                id="custom-statement"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border-[3px] border-ink/10 bg-white p-4 font-semibold leading-relaxed outline-none transition-colors focus:border-lav"
              />
              <ChunkyButton
                className="mt-4 w-full"
                onClick={start}
                disabled={statement.trim().length < 15}
              >
                Let's reason through it! 🔍
              </ChunkyButton>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
