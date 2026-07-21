"use client";

import { useRouter } from "next/navigation";

/** The handoff's one top-bar pattern for non-root screens: back / title / action. */
export function TopBar({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: React.ReactNode;
  onAction?: () => void;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        aria-label="Back"
        onClick={() => router.back()}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-glass-line bg-glass text-lg font-bold text-ink2"
      >
        ‹
      </button>
      <h1 className="font-display text-base font-extrabold">{title}</h1>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-glass-line bg-glass text-sm font-extrabold text-ink2"
        >
          {action}
        </button>
      ) : (
        <div className="w-9" />
      )}
    </div>
  );
}
