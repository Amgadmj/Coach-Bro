import type { MetadataRoute } from "next";

// Next.js App Router convention: this file auto-serves at /manifest.webmanifest.
// display: "standalone" is what makes "Add to Home Screen" open full-screen
// without browser chrome - the core of the "feels like a native app" ask.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bro Coach",
    short_name: "Bro Coach",
    description: "Your digital wingman - three AI takes, one calibrated answer.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF3EC",
    theme_color: "#FBF3EC",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
