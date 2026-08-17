import type { Config } from "tailwindcss";

// Palette finalized from the BPHXF logo (see
// claude/decisions-log.md in the project: "Visual identity — Option C").
// Green is reserved for action/emphasis only; "complete" state uses
// charcoal + a checkmark rather than a second color.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C1E1D",
        chalk: "#F7F5F0",
        card: "#FFFFFF",
        primary: "#149A48",
        complete: "#353535",
        border: "#E7E4DC",
        slate: "#6B7280",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
