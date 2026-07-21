"use client";

import Link from "next/link";

import { TabBar } from "@/components/TabBar";
import { useT } from "@/lib/i18n";

export default function PlaybookScreen() {
  const t = useT();
  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">
        {t("tabs.playbook")}
      </h1>
      <p className="mt-2 text-sm text-ink2">
        {t("playbook.before")}
        <Link href="/" className="font-bold text-accent-deep">
          {t("playbook.homeLink")}
        </Link>
        {t("playbook.after")}
      </p>
      <TabBar />
    </main>
  );
}
