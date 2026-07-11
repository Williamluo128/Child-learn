import type { Config } from "tailwindcss";

// Kid game-path tokens: clay surfaces, coral CTA, no purple defaults.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1a2332",
        muted: "#6b7589",
        canvas: "#e8f0f4",
        surface: "#ffffff",
        line: "#d5e0e8",
        path: "#c5d4de",
        coral: {
          DEFAULT: "#f06a4a",
          soft: "#fff0eb",
          deep: "#d95538",
        },
        brand: {
          DEFAULT: "#f06a4a",
          soft: "#fff0eb",
        },
        mastered: "#1aa87a",
        gap: "#e89a2e",
        locked: "#9aa3b2",
        unlockable: "#3b82f0",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        display: ["var(--font-baloo)", "var(--font-outfit)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.5rem",
        control: "1.25rem",
        level: "9999px",
      },
      fontSize: {
        base: ["1.125rem", { lineHeight: "1.7rem" }],
        lg: ["1.3125rem", { lineHeight: "1.9rem" }],
      },
      boxShadow: {
        card: "0 8px 28px rgba(26, 35, 50, 0.06)",
        lift: "0 14px 36px rgba(26, 35, 50, 0.1)",
        clay:
          "4px 6px 0 rgba(26, 35, 50, 0.12), inset 0 -3px 0 rgba(26, 35, 50, 0.08), inset 0 2px 0 rgba(255, 255, 255, 0.45)",
        "clay-press":
          "2px 3px 0 rgba(26, 35, 50, 0.12), inset 0 -1px 0 rgba(26, 35, 50, 0.08)",
        "clay-soft":
          "0 10px 24px rgba(26, 35, 50, 0.08), inset 0 -2px 0 rgba(26, 35, 50, 0.06)",
      },
      maxWidth: {
        shell: "480px",
      },
      keyframes: {
        "level-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
        },
        "bob": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "level-pulse": "level-pulse 1.8s ease-in-out infinite",
        bob: "bob 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
