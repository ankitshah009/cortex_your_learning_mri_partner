import type { Diagnosis, ReasoningStep } from "../../scenarios/types";
import type { LiveDiagnosis } from "../../backend/live";
import { useJudgeCapture, type JudgeCapture } from "./judgeStore";
import { useJudgeToggle } from "./useJudgeToggle";

/**
 * Judge mode: the same diagnostic data the kids UI renders as bubbles and
 * mascots, shown as the raw reasoning-engine output. Dark, technical,
 * deliberately the opposite aesthetic — same data, different lens.
 *
 * Toggle with 'J' (or the corner button). ESC closes.
 */
export function JudgeMode() {
  const { open, setOpen } = useJudgeToggle();
  const capture = useJudgeCapture();

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        title="Judge mode: view the live diagnostic engine output (J)"
        style={{
          position: "fixed",
          bottom: 12,
          right: 12,
          zIndex: 90,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid rgba(63,46,86,0.25)",
          background: open ? "#16121f" : "rgba(255,255,255,0.75)",
          color: open ? "#8be9a8" : "rgba(63,46,86,0.55)",
          cursor: "pointer",
        }}
      >
        {"</> judge"}
      </button>
      {open && <JudgePanel capture={capture} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ---------- panel ---------- */

const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const palette = {
  bg: "#12101a",
  panel: "#1a1725",
  border: "#2e2940",
  text: "#d6d2e4",
  dim: "#8a83a3",
  green: "#5fd68b",
  red: "#ff6b6b",
  amber: "#ffc94d",
  cyan: "#6fd9e8",
  violet: "#a99cf5",
};

function JudgePanel({
  capture,
  onClose,
}: {
  capture: JudgeCapture | null;
  onClose: () => void;
}) {
  return (
    <aside
      role="dialog"
      aria-label="Judge mode: diagnostic engine output"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(480px, 100vw)",
        zIndex: 80,
        background: palette.bg,
        color: palette.text,
        borderLeft: `1px solid ${palette.border}`,
        boxShadow: "-12px 0 40px rgba(0,0,0,0.45)",
        display: "flex",
        flexDirection: "column",
        fontFamily: mono,
        fontSize: 12.5,
        lineHeight: 1.55,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${palette.border}`,
          background: palette.panel,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: palette.cyan,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            CORTEX // DIAGNOSTIC ENGINE
            {capture && (
              <SourceBadge
                source={(capture.diagnosis as LiveDiagnosis).source}
              />
            )}
          </div>
          <div style={{ color: palette.dim, fontSize: 11 }}>
            live Diagnosis object — same data as the kids UI
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close judge mode"
          style={{
            background: "transparent",
            border: `1px solid ${palette.border}`,
            color: palette.dim,
            borderRadius: 4,
            padding: "2px 8px",
            fontFamily: mono,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          ESC
        </button>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {capture ? <Diagnostics capture={capture} /> : <Empty />}
      </div>

      <footer
        style={{
          padding: "8px 16px",
          borderTop: `1px solid ${palette.border}`,
          color: palette.dim,
          fontSize: 11,
        }}
      >
        [J] toggle · [ESC] close
      </footer>
    </aside>
  );
}

/**
 * Provenance badge: is this diagnosis real live engine output, a seeded
 * fallback after a live failure, or seeded-only (no endpoint configured)?
 */
function SourceBadge({ source }: { source: LiveDiagnosis["source"] }) {
  const s =
    source === "live"
      ? { text: "LIVE", color: palette.green }
      : source === "seeded-fallback"
        ? { text: "SEEDED FALLBACK", color: palette.amber }
        : { text: "SEEDED (no live endpoint)", color: palette.dim };
  return (
    <span
      style={{
        padding: "1px 7px",
        borderRadius: 4,
        border: `1px solid ${s.color}`,
        color: s.color,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
      }}
    >
      {s.text}
    </span>
  );
}

function Empty() {
  return (
    <div style={{ color: palette.dim, paddingTop: 40, textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>∅</div>
      <div>No session analyzed yet — run a scenario.</div>
      <div style={{ marginTop: 8, fontSize: 11 }}>
        Open a problem, submit reasoning, and the live diagnosis
        <br />
        will stream into this panel.
      </div>
    </div>
  );
}

/* ---------- diagnostics ---------- */

function Diagnostics({ capture }: { capture: JudgeCapture }) {
  const d = capture.diagnosis;
  const status = d.mixup ? "MISCONCEPTION_DETECTED" : "REASONING_SOLID";
  return (
    <>
      <StatusRow
        label="status"
        value={status}
        color={d.mixup ? palette.red : palette.green}
      />
      <StatusRow label="problem" value={d.problemId} color={palette.text} />
      <StatusRow
        label="analyzed"
        value={new Date(capture.capturedAt).toLocaleTimeString()}
        color={palette.dim}
      />

      <Section title="Reasoning Trace">
        <Trace diagnosis={d} />
      </Section>

      {d.mixup ? (
        <>
          <Section title="Hypothesis">
            <div style={{ color: palette.amber, fontWeight: 700 }}>
              {d.mixup.hypothesis.name}
            </div>
            <div style={{ color: palette.text, marginTop: 4 }}>
              {d.mixup.hypothesis.kidExplanation}
            </div>
            <div style={{ marginTop: 10 }}>
              <ConfidenceBar
                label="prior"
                value={d.mixup.hypothesis.confidenceBefore}
              />
              <ConfidenceBar
                label="post-probe"
                value={d.mixup.hypothesis.confidenceAfter}
              />
              <ConfidenceBar
                label="if-correct"
                value={d.mixup.hypothesis.confidenceIfCorrect}
              />
            </div>
            <div style={{ marginTop: 10, color: palette.dim, fontSize: 11 }}>
              memory evidence (EverOS):
            </div>
            <div style={{ color: palette.violet }}>{d.mixup.memoryEvidence}</div>
          </Section>

          <Section title="Probe">
            <div style={{ color: palette.text }}>{d.mixup.probe.question}</div>
            <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
              {d.mixup.probe.options.map((o) => (
                <li key={o.id} style={{ marginBottom: 4 }}>
                  <span
                    style={{
                      color:
                        o.kind === "mixup"
                          ? palette.red
                          : o.kind === "correct"
                            ? palette.green
                            : palette.dim,
                      marginRight: 8,
                    }}
                  >
                    [{o.kind}]
                  </span>
                  {o.label}
                </li>
              ))}
            </ul>
          </Section>
        </>
      ) : (
        <Section title="Hypothesis">
          <div style={{ color: palette.green }}>
            null — no first divergence found. All steps consistent with a
            correct model.
          </div>
        </Section>
      )}

      <Section title="Student Input">
        <div style={{ color: palette.dim, whiteSpace: "pre-wrap" }}>
          {capture.reasoning}
        </div>
      </Section>

      <details style={{ marginTop: 16 }}>
        <summary
          style={{
            cursor: "pointer",
            color: palette.cyan,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Raw JSON
        </summary>
        <pre
          style={{
            marginTop: 8,
            padding: 12,
            background: palette.panel,
            border: `1px solid ${palette.border}`,
            borderRadius: 6,
            overflowX: "auto",
            fontSize: 11,
            color: palette.text,
          }}
        >
          {JSON.stringify(d, null, 2)}
        </pre>
      </details>
    </>
  );
}

function StatusRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 2 }}>
      <span style={{ color: palette.dim, width: 72, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 20 }}>
      <div
        style={{
          color: palette.cyan,
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          borderBottom: `1px solid ${palette.border}`,
          paddingBottom: 4,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

/* ---------- reasoning trace ---------- */

type StepStatus = "ok" | "divergence" | "contaminated";

function stepStatus(step: ReasoningStep, d: Diagnosis): StepStatus {
  if (!d.mixup) return "ok";
  if (step.id === d.mixup.stepId) return "divergence";
  if (d.mixup.downstreamIds.includes(step.id)) return "contaminated";
  return "ok";
}

const statusGlyph: Record<StepStatus, { icon: string; color: string; tag: string }> = {
  ok: { icon: "✓", color: palette.green, tag: "verified" },
  divergence: { icon: "✗", color: palette.red, tag: "FIRST DIVERGENCE" },
  contaminated: { icon: "⚠", color: palette.amber, tag: "downstream of divergence" },
};

function Trace({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {diagnosis.steps.map((step, i) => {
        const status = stepStatus(step, diagnosis);
        const g = statusGlyph[status];
        const isDiv = status === "divergence";
        const fixed = diagnosis.mixup?.fixedLabels[step.id];
        return (
          <li
            key={step.id}
            style={{
              display: "flex",
              gap: 10,
              padding: "6px 8px",
              marginBottom: 2,
              borderRadius: 4,
              background: isDiv ? "rgba(255,107,107,0.12)" : "transparent",
              border: isDiv
                ? `1px solid rgba(255,107,107,0.45)`
                : "1px solid transparent",
            }}
          >
            <span style={{ color: g.color, width: 14, flexShrink: 0 }}>
              {g.icon}
            </span>
            <span style={{ color: palette.dim, width: 22, flexShrink: 0 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: palette.text }}>
                {step.label}
                {step.inferred && (
                  <span
                    style={{
                      color: palette.violet,
                      fontSize: 10,
                      marginLeft: 8,
                    }}
                  >
                    [inferred — not in student text]
                  </span>
                )}
              </div>
              <div style={{ color: palette.dim, fontSize: 10.5 }}>
                kind={step.kind} · id={step.id} · {step.caption}
              </div>
              <div style={{ color: g.color, fontSize: 10.5 }}>{g.tag}</div>
              {fixed && (
                <div style={{ color: palette.green, fontSize: 10.5 }}>
                  repair → {fixed}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ConfidenceBar({ label, value }: { label: string; value: number }) {
  // Confidence values are already on a 0-100 scale (e.g. 68 -> "68%").
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span style={{ color: palette.dim, width: 76, fontSize: 11, flexShrink: 0 }}>
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 8,
          background: palette.panel,
          border: `1px solid ${palette.border}`,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: pct >= 75 ? palette.green : pct >= 40 ? palette.amber : palette.red,
          }}
        />
      </div>
      <span style={{ color: palette.text, width: 36, textAlign: "right", fontSize: 11 }}>
        {pct}%
      </span>
    </div>
  );
}
