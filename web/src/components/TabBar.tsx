"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { clsx } from "@/lib/clsx";

const TABS = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" className="mx-auto mb-0.5 block">
        <rect x="3" y="3" width="12" height="12" rx="4.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/playbook",
    label: "Playbook",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" className="mx-auto mb-0.5 block">
        <rect x="3" y="3" width="12" height="5" rx="2.5" fill="currentColor" />
        <rect x="3" y="10" width="12" height="5" rx="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/live",
    label: "Live",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" className="mx-auto mb-0.5 block">
        <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="9" cy="9" r="2.4" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" className="mx-auto mb-0.5 block">
        <circle cx="9" cy="6" r="3.4" fill="currentColor" />
        <rect x="3" y="11" width="12" height="5" rx="2.5" fill="currentColor" />
      </svg>
    ),
  },
];

/** The glass pill tab bar - shown on root screens only, per the handoff. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-5 z-40 mx-auto flex w-[min(92%,26rem)] justify-around rounded-full border border-glass-line bg-glass-strong px-2 py-2.5 shadow-tab backdrop-blur-xl">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "px-3 text-center font-display text-[10px] font-bold",
              active ? "text-accent-deep" : "text-ink3",
            )}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
