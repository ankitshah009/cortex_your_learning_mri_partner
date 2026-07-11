import { Link } from "react-router-dom";

type BrandLogoSize = "sm" | "md" | "lg";

const sizes: Record<BrandLogoSize, { frame: string; image: string }> = {
  sm: {
    frame: "h-9 w-[112px]",
    image: "-left-[25px] -top-[33px] w-[163px]",
  },
  md: {
    frame: "h-12 w-[148px]",
    image: "-left-[33px] -top-11 w-[218px]",
  },
  lg: {
    frame: "h-[58px] w-[178px]",
    image: "-left-10 -top-[53px] w-[263px]",
  },
};

/**
 * Canonical Cortex lockup. The transparent source artwork includes generous
 * presentation padding, so the frame crops only that empty canvas while
 * preserving the supplied logo exactly.
 */
export function BrandLogo({
  size = "md",
  linked = false,
  className = "",
}: {
  size?: BrandLogoSize;
  linked?: boolean;
  className?: string;
}) {
  const logo = (
    <span
      className={`relative block shrink-0 overflow-hidden ${sizes[size].frame} ${className}`}
    >
      <img
        src="/brand/cortex-logo-transparent.png"
        alt="Cortex"
        className={`pointer-events-none absolute max-w-none select-none ${sizes[size].image}`}
      />
    </span>
  );

  if (!linked) return logo;
  return (
    <Link
      to="/"
      aria-label="Cortex home"
      className="rounded-xl outline-none transition-transform hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-lav/40 active:translate-y-px"
    >
      {logo}
    </Link>
  );
}
