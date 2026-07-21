import { clsx } from "@/lib/clsx";

export function GlassCard({
  className,
  strong = false,
  children,
}: {
  className?: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-card border border-glass-line shadow-card backdrop-blur-xl",
        strong ? "bg-glass-strong" : "bg-glass",
        className,
      )}
    >
      {children}
    </div>
  );
}
