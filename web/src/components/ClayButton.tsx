"use client";

import { clsx } from "@/lib/clsx";

/** The handoff's "clay-press" button: gradient fill, inset top highlight,
 * inset bottom shade, tinted drop shadow. Variant picks the gradient family. */
export function ClayButton({
  variant = "accent",
  className,
  children,
  onClick,
  disabled,
}: {
  variant?: "accent" | "mode";
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "w-full rounded-full px-5 py-3.5 text-center font-display text-sm font-extrabold text-white",
        "shadow-clay transition-transform active:translate-y-0.5 active:shadow-none disabled:opacity-50",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-deep",
        variant === "accent"
          ? "bg-[linear-gradient(160deg,var(--accent),var(--accent-deep))]"
          : "bg-[linear-gradient(160deg,var(--mode),var(--mode-deep))]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full rounded-full border border-hairline bg-glass px-5 py-3 text-center font-display text-[13px] font-bold text-ink",
        "transition-transform active:translate-y-0.5",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-deep",
        className,
      )}
    >
      {children}
    </button>
  );
}
