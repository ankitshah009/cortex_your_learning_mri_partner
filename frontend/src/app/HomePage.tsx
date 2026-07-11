import { Suspense, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useApp } from "../state/store";
import { courseProgress, buildCourseGraph } from "../scenarios/knowledgeGraph";
import type {
  Course,
  CourseColor,
  CreateCourseInput,
  HomeworkLibrary,
} from "../scenarios/types";
import { backend } from "../backend";
import { useCourses } from "../backend/useCourses";
import { BrainGraph } from "../components/brain-3d/LazyBrainGraph";
import { Cora } from "../components/mascot/Cora";
import { SpeechBubble } from "../components/mascot/SpeechBubble";
import { ChunkyButton } from "../components/ui/ChunkyButton";

const AVATARS = ["🦊", "🐙", "🦖", "🐼"];
const COURSE_EMOJI = ["🧮", "🔬", "📖", "🌍", "🎨", "🎵", "💻", "⚗️"];
const COURSE_COLORS: CourseColor[] = ["lav", "teal", "coral", "sky", "gold"];

export function HomePage() {
  const { profile, completedProblems, understandingByProblem } = useApp();
  const { courses, library, loading, error, createCourse, refresh } =
    useCourses();
  if (!profile) return <WelcomeScreen />;

  const totalConnections = courses.reduce(
    (sum, c) =>
      sum +
      buildCourseGraph(c, library, completedProblems, understandingByProblem)
        .edges.length,
    0,
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex items-center justify-between">
        <p className="font-display text-2xl font-extrabold">Cortex 🧠</p>
        <span className="rounded-full border-[3px] border-ink/10 bg-white px-4 py-1.5 font-display font-extrabold">
          {profile.avatar} {profile.name}
        </span>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 flex items-end gap-3"
      >
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight">
            Hi {profile.name}! Your learning brains
          </h1>
          <p className="mt-2 max-w-[62ch] text-lg font-semibold text-ink-soft">
            Every folder is a course with its own 3D brain. Upload homework and
            watch each brain grow and connect — that map is how Cora gives you
            guidance made just for you.
          </p>
        </div>
      </motion.div>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-extrabold">
            My courses 📁
            <span className="ml-2 font-display text-sm font-extrabold text-ink-soft">
              {totalConnections} connection{totalConnections === 1 ? "" : "s"} grown
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <UploadNewCourseButton
              existingCount={courses.length}
              createCourse={createCourse}
              onImported={refresh}
            />
            <NewCourseButton
              onCreate={(input) => createCourse(input)}
              existingCount={courses.length}
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-2xl border-[3px] border-coral/30 bg-coral-soft px-4 py-3 text-sm font-extrabold text-coral-dark">
            {error}
          </p>
        )}

        {loading ? (
          <div className="mt-4 rounded-3xl border-[3px] border-ink/10 bg-white p-5 font-display font-extrabold text-ink-soft">
            Loading your courses...
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, i) => (
              <CourseCard
                key={course.id}
                course={course}
                library={library}
                delay={0.06 + i * 0.05}
              />
            ))}
          </div>
        )}
      </section>

      <div className="pointer-events-none mt-10 flex items-end gap-2">
        <Cora expression={totalConnections > 0 ? "celebrating" : "curious"} size={96} />
        <div className="mb-8">
          <SpeechBubble
            text={
              courses.length === 0
                ? "Make your first course folder and I'll start building its brain!"
                : totalConnections > 0
                  ? "Your brains are wiring up! Open a course to see it in 3D."
                  : "Upload homework into a course and watch its brain light up!"
            }
          />
        </div>
      </div>
    </div>
  );
}

function CourseCard({
  course,
  library,
  delay,
}: {
  course: Course;
  library: HomeworkLibrary;
  delay: number;
}) {
  const completed = useApp((s) => s.completedProblems);
  const understanding = useApp((s) => s.understandingByProblem);
  const { done, total } = courseProgress(course, library, completed);
  const graph = buildCourseGraph(course, library, completed, understanding);
  const hwCount = course.homeworkIds.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Link
        to={`/course/${course.id}`}
        className="group block overflow-hidden rounded-3xl border-[3px] border-ink/10 bg-white shadow-[0_5px_0_rgba(63,46,86,0.08)] transition-transform hover:scale-[1.01] active:translate-y-[3px] active:shadow-none"
      >
        {/* Mini 3D brain preview — idle spin, no controls */}
        <Suspense
          fallback={
            <div className="h-40 bg-gradient-to-b from-[#f3eefe] to-[#eaf6ff]" />
          }
        >
          <BrainGraph
            graph={graph}
            color={course.color}
            interactive={false}
            className="h-40 !rounded-none !border-0 !border-b-[3px]"
          />
        </Suspense>
        <div className="p-4">
          <p className="font-display text-lg font-extrabold">
            {course.emoji} {course.title}
          </p>
          <p className="text-sm font-semibold text-ink-soft">
            {hwCount} homework{hwCount === 1 ? "" : "s"} ·{" "}
            {graph.nodes.length} concept{graph.nodes.length === 1 ? "" : "s"}
          </p>
          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-ink/10 bg-cloud-soft">
              <div
                className="h-full rounded-full bg-teal transition-[width] duration-700"
                style={{ width: `${total ? (done / total) * 100 : 0}%` }}
              />
            </div>
            <span className="font-display text-sm font-extrabold text-ink-soft">
              {done}/{total}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function UploadNewCourseButton({
  existingCount,
  createCourse,
  onImported,
}: {
  existingCount: number;
  createCourse: (input: CreateCourseInput) => Promise<Course>;
  onImported: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStatus("working");
    setMessage("");
    try {
      // Each uploaded worksheet becomes its own course so its brain stays
      // one coherent topic (no mixing with other subjects).
      const title = file.name.replace(/\.pdf$/i, "").trim() || "New Course";
      const color = COURSE_COLORS[existingCount % COURSE_COLORS.length];
      const course = await createCourse({ title, emoji: "📄", color });
      await backend.importHomeworkPdf(file, course.id);
      await onImported();
      navigate(`/course/${course.id}`);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Could not import that PDF.",
      );
    }
  }

  return (
    <label className="relative inline-flex cursor-pointer">
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={onFileChange}
        disabled={status === "working"}
      />
      <span className="rounded-full border-[3px] border-teal/40 bg-teal-soft px-4 py-2 font-display text-sm font-extrabold text-teal-dark shadow-[0_3px_0_rgba(63,46,86,0.08)] transition-transform hover:scale-[1.02] active:translate-y-[2px] active:shadow-none">
        {status === "working" ? "Building brain..." : "📄 Upload PDF → new course"}
      </span>
      {status === "error" && (
        <span className="absolute right-0 top-full z-10 mt-2 w-72 rounded-2xl border-[3px] border-coral/30 bg-white p-3 text-sm font-bold text-coral-dark shadow-[0_5px_0_rgba(63,46,86,0.08)]">
          {message}
        </span>
      )}
    </label>
  );
}

function NewCourseButton({
  onCreate,
  existingCount,
}: {
  onCreate: (input: {
    title: string;
    emoji: string;
    color: CourseColor;
  }) => Promise<Course>;
  existingCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(COURSE_EMOJI[0]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    const color = COURSE_COLORS[existingCount % COURSE_COLORS.length];
    try {
      await onCreate({ title: title.trim(), emoji, color });
      setTitle("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border-[3px] border-lav/40 bg-lav-soft px-4 py-2 font-display text-sm font-extrabold text-lav-dark shadow-[0_3px_0_rgba(63,46,86,0.08)] transition-transform hover:scale-[1.02] active:translate-y-[2px] active:shadow-none"
      >
        + New course
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-0 top-full z-20 mt-2 w-72 rounded-3xl border-[3px] border-ink/10 bg-white p-4 shadow-[0_8px_0_rgba(63,46,86,0.1)]"
        >
          <p className="font-display text-sm font-extrabold text-ink-soft">
            Course name
          </p>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Physics"
            className="mt-1 w-full rounded-2xl border-[3px] border-ink/10 p-2.5 font-display font-bold outline-none focus:border-lav"
          />
          <p className="mt-3 font-display text-sm font-extrabold text-ink-soft">
            Pick an icon
          </p>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {COURSE_EMOJI.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`rounded-xl border-[3px] py-2 text-xl transition-transform active:scale-90 ${
                  emoji === e
                    ? "border-coral bg-coral-soft"
                    : "border-ink/10 hover:scale-105"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <ChunkyButton
            variant="lav"
            className="mt-4 w-full !text-base"
            disabled={busy || title.trim().length === 0}
            onClick={submit}
          >
            {busy ? "Creating..." : "Create folder 📁"}
          </ChunkyButton>
        </motion.div>
      )}
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
