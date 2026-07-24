import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import { IdentitySheet } from "@/components/IdentitySheet";
import { ModeSync } from "@/components/ModeSync";
import { NameSheet } from "@/components/NameSheet";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { WelcomeModal } from "@/components/WelcomeModal";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bro Code",
  description: "Your digital wingman - three AI takes, one calibrated answer.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bro Code",
  },
};

export const viewport: Viewport = {
  themeColor: "#FBF3EC",
  width: "device-width",
  initialScale: 1,
  // Locks pinch-zoom off in standalone/installed mode so it reads as an app,
  // not a webpage - browser-tab visits are unaffected until installed.
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans text-ink">
        <ModeSync />
        <ServiceWorkerRegister />
        <WelcomeModal />
        <IdentitySheet />
        <NameSheet />
        <div className="app-shell mx-auto flex min-h-dvh w-full max-w-md flex-col px-5">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
