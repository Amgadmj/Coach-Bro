import type { Metadata, Viewport } from "next";

import { ModeSync } from "@/components/ModeSync";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bro Coach",
  description: "Your digital wingman - three AI takes, one calibrated answer.",
};

export const viewport: Viewport = {
  themeColor: "#FBF3EC",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans text-ink">
        <ModeSync />
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-28 pt-4">
          {children}
        </div>
      </body>
    </html>
  );
}
