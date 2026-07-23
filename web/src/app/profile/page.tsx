"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Coachmark, type CoachmarkStep } from "@/components/Coachmark";
import { GlassCard } from "@/components/GlassCard";
import { InstallSheet } from "@/components/InstallSheet";
import { LanguagePicker } from "@/components/LanguagePicker";
import { hasDeferredInstallPrompt, triggerInstallPrompt } from "@/components/ServiceWorkerRegister";
import { TabBar } from "@/components/TabBar";
import { useT } from "@/lib/i18n";
import { isIosDevice, isStandaloneDisplay } from "@/lib/platform";
import { useTutorial } from "@/lib/tutorial";

const PROFILE_STEPS: CoachmarkStep[] = [
  { target: "profile-language", titleKey: "tutorial.profile.languageTitle", bodyKey: "tutorial.profile.languageBody" },
];

export default function ProfileScreen() {
  const t = useT();
  const router = useRouter();
  const welcomeSeen = useTutorial((s) => s.welcomeSeen);
  const startPage = useTutorial((s) => s.startPage);
  const replayAll = useTutorial((s) => s.replayAll);
  const [showInstallRow, setShowInstallRow] = useState(false);
  const [installSheetOpen, setInstallSheetOpen] = useState(false);

  useEffect(() => {
    startPage("profile", PROFILE_STEPS.length);
  }, [welcomeSeen, startPage]);

  // Client-only check (standalone display mode isn't knowable at SSR time) -
  // manual fallback for anyone who dismissed InstallMoment on /result, or
  // whose first read hasn't happened yet.
  useEffect(() => {
    setShowInstallRow(!isStandaloneDisplay());
  }, []);

  async function handleInstall() {
    setInstallSheetOpen(false);
    await triggerInstallPrompt();
  }

  return (
    <main className="pb-24">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">{t("tabs.profile")}</h1>

      <GlassCard className="mt-3.5 p-4 text-center">
        <div className="font-display text-[15px] font-extrabold">{t("profile.emptyTitle")}</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">{t("profile.emptyBody")}</p>
      </GlassCard>

      <div data-tutorial="profile-language" className="mt-5">
        <LanguagePicker />
      </div>

      {showInstallRow && (
        <button
          type="button"
          onClick={() => setInstallSheetOpen(true)}
          className="interactive tap-expand mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-hairline bg-glass px-5 py-3 text-center font-display text-[12.5px] font-bold text-ink2"
        >
          <span aria-hidden>⬇️</span>
          {t("profile.installApp")}
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          replayAll();
          router.push("/");
        }}
        className="interactive tap-expand mt-2.5 w-full rounded-full border border-hairline bg-glass px-5 py-3 text-center font-display text-[12.5px] font-bold text-ink2"
      >
        {t("tutorial.replay")}
      </button>

      <Coachmark page="profile" steps={PROFILE_STEPS} />
      {installSheetOpen && (
        <InstallSheet
          platform={isIosDevice() && !hasDeferredInstallPrompt() ? "ios" : "android"}
          onInstall={handleInstall}
          onDismiss={() => setInstallSheetOpen(false)}
        />
      )}
      <TabBar />
    </main>
  );
}
