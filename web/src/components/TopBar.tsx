"use client";

import { useRouter } from "next/navigation";

import { useT } from "@/lib/i18n";

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
  const t = useT();
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        aria-label={t("common.back")}
        onClick={() => router.back()}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-glass-line bg-glass text-lg font-bold text-ink2 rtl:rotate-180"
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
