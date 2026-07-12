import type { Config } from "tailwindcss";

// Sticker-book tokens: paper canvas, flat fills, 2px borders, hard bottom edges.
// Coral = brand/CTA, violet = secondary interactive, teal = mastered, amber = gap.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#443d4d",
        muted: "#7d7787",
        faded: "#b9b3c0",
        canvas: "#f7f5f9",
        surface: "#ffffff",
        line: "#e7e3ea",
        path: "#ddd7e5",
        coral: {
          DEFAULT: "#f45b39",
          soft: "#ffe9e2",
          deep: "#d64322",
        },
        brand: {
          DEFAULT: "#f45b39",
          soft: "#ffe9e2",
          deep: "#d64322",
        },
        violet: {
          DEFAULT: "#7c5cf4",
          soft: "#f0ebff",
          deep: "#5f41d6",
        },
        mastered: {
          DEFAULT: "#12b284",
          soft: "#dcf7ee",
          deep: "#0a9169",
        },
        gap: {
          DEFAULT: "#efa11c",
          soft: "#fcf0d8",
          deep: "#c9820b",
        },
        locked: "#b9b3c0",
        unlockable: {
          DEFAULT: "#7c5cf4",
          soft: "#f0ebff",
          deep: "#5f41d6",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        display: ["var(--font-baloo)", "var(--font-outfit)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1rem",
        control: "0.75rem",
        level: "9999px",
      },
      fontSize: {
        base: ["1.0625rem", { lineHeight: "1.6rem" }],
        lg: ["1.25rem", { lineHeight: "1.8rem" }],
      },
      boxShadow: {
        // Hard bottom edges — the only "shadows" in this language.
        edge: "0 4px 0 0 #e7e3ea",
        "edge-sm": "0 3px 0 0 #e7e3ea",
        "edge-brand": "0 4px 0 0 #d64322",
        "edge-violet": "0 4px 0 0 #5f41d6",
        "edge-teal": "0 4px 0 0 #0a9169",
        "edge-amber": "0 4px 0 0 #c9820b",
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
