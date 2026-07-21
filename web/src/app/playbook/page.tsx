import Link from "next/link";

import { TabBar } from "@/components/TabBar";

export default function PlaybookScreen() {
  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Playbook</h1>
      <p className="mt-2 text-sm text-ink2">
        Mission library coming soon. For now, start from a mission on{" "}
        <Link href="/" className="font-bold text-accent-deep">
          Home
        </Link>{" "}
        or jump into a live read.
      </p>
      <TabBar />
    </main>
  );
}
