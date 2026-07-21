import Link from "next/link";

import { TabBar } from "@/components/TabBar";

export default function ProfileScreen() {
  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Profile</h1>
      <p className="mt-2 text-sm text-ink2">
        Stats, streaks, and settings land here. Tonight&apos;s{" "}
        <Link href="/recap" className="font-bold text-accent-deep">
          recap
        </Link>{" "}
        has the demo of where this is headed.
      </p>
      <TabBar />
    </main>
  );
}
