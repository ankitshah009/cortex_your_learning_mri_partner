import type { ButtonHTMLAttributes } from "react";

type Variant = "coral" | "teal" | "lav" | "ghost";

const variants: Record<Variant, string> = {
  coral:
    "bg-coral text-white border-coral-dark shadow-[0_5px_0_var(--color-coral-dark)]",
  teal: "bg-teal text-white border-teal-dark shadow-[0_5px_0_var(--color-teal-dark)]",
  lav: "bg-lav text-white border-lav-dark shadow-[0_5px_0_var(--color-lav-dark)]",
  ghost:
    "bg-white text-ink border-cloud shadow-[0_5px_0_var(--color-cloud)]",
};

export function ChunkyButton({
  variant = "coral",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-2xl border-[3px] px-6 py-3 font-display text-lg font-extrabold transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
