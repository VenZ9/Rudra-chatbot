import type { Config } from "tailwindcss";

/**
 * Every colour maps to a CSS custom property defined in app/globals.css.
 * The reference design switches themes by flipping `data-theme` on <html>,
 * so the tokens must stay as live `var()` references rather than baked hex.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        line: "var(--border)",
        ink: "var(--text)",
        muted: "var(--text-muted)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        "accent-soft": "var(--accent-soft)",
        "code-bg": "var(--code-bg)",
      },
      fontFamily: {
        sans: ["var(--sans)"],
        mono: ["var(--mono)"],
      },
      maxWidth: {
        chat: "780px",
        suggestions: "580px",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        bounceDot: {
          "0%, 70%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "35%": { transform: "translateY(-5px)", opacity: "1" },
        },
        blink: {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fadeUp .28s ease both",
        "bounce-dot": "bounceDot 1.25s infinite ease-in-out",
        blink: "blink .9s steps(2) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
