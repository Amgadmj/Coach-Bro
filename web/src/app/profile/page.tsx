"use client";

import Link from "next/link";

import { LanguagePicker } from "@/components/LanguagePicker";
import { TabBar } from "@/components/TabBar";
import { useT } from "@/lib/i18n";

export default function ProfileScreen() {
  const t = useT();
  return (
    <main className="pb-24">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">{t("tabs.profile")}</h1>
      <p className="mt-2 text-sm text-ink2">
        {t("profile.before")}
        <Link href="/recap" className="font-bold text-accent-deep">
          {t("profile.recapLink")}
        </Link>
        {t("profile.after")}
      </p>

      <div className="mt-5">
        <LanguagePicker />
      </div>

      <TabBar />
    </main>
  );
}
