"use client";

import { GlassCard } from "@/components/GlassCard";
import { LanguagePicker } from "@/components/LanguagePicker";
import { TabBar } from "@/components/TabBar";
import { useT } from "@/lib/i18n";

export default function ProfileScreen() {
  const t = useT();
  return (
    <main className="pb-24">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">{t("tabs.profile")}</h1>

      <GlassCard className="mt-3.5 p-4 text-center">
        <div className="font-display text-[15px] font-extrabold">{t("profile.emptyTitle")}</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">{t("profile.emptyBody")}</p>
      </GlassCard>

      <div className="mt-5">
        <LanguagePicker />
      </div>

      <TabBar />
    </main>
  );
}
