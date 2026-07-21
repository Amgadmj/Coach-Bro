import type { Config } from "tailwindcss";

// All color values live as CSS custom properties in globals.css (light + dark),
// so Tailwind classes stay theme-agnostic - see docs/design/design.md for the token table.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        ground2: "var(--ground2)",
        ink: "var(--ink)",
        ink2: "var(--ink2)",
        ink3: "var(--ink3)",
        hairline: "var(--hairline)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-deep": "var(--accent-deep)",
        hype: "var(--hype)",
        "hype-soft": "var(--hype-soft)",
        "hype-deep": "var(--hype-deep)",
        chill: "var(--chill)",
        "chill-soft": "var(--chill-soft)",
        "chill-deep": "var(--chill-deep)",
        romantic: "var(--romantic)",
        "romantic-soft": "var(--romantic-soft)",
        "romantic-deep": "var(--romantic-deep)",
        direct: "var(--direct)",
        "direct-soft": "var(--direct-soft)",
        "direct-deep": "var(--direct-deep)",
        arthur: "var(--arthur)",
        clara: "var(--clara)",
        leo: "var(--leo)",
        glass: "var(--glass)",
        "glass-strong": "var(--glass-strong)",
        "glass-line": "var(--glass-line)",
        mode: "var(--mode)",
        "mode-soft": "var(--mode-soft)",
        "mode-deep": "var(--mode-deep)",
      },
      fontFamily: {
        display: [
          "ui-rounded",
          "SF Pro Rounded",
          "Segoe UI Variable Display",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        sans: ["-apple-system", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["SF Mono", "ui-monospace", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "var(--card-shadow)",
        clay: "0 8px 18px var(--shadow-tint), inset 0 -3px 0 rgba(0,0,0,.22), inset 0 1.5px 0 rgba(255,255,255,.35)",
        tab: "0 8px 22px var(--shadow-tint)",
      },
      borderRadius: {
        card: "22px",
        "card-lg": "26px",
      },
      keyframes: {
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite linear",
      },
    },
  },
  plugins: [],
};

export default config;
