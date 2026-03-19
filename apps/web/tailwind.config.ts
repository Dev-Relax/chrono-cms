import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  // Enable class-based dark mode (toggled by adding "dark" to <html>)
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        // Brand palette — driven by --color-primary-rgb CSS variable so the
        // ThemeContext can swap the entire palette at runtime without rebuilding.
        // The `<alpha-value>` placeholder is replaced by Tailwind when opacity
        // modifiers are used, e.g. bg-brand-500/30 → rgb(var(…) / 0.3).
        brand: {
          50:  "rgb(var(--color-primary-rgb) / 0.08)",
          100: "rgb(var(--color-primary-rgb) / 0.15)",
          400: "rgb(var(--color-primary-rgb) / <alpha-value>)",
          500: "rgb(var(--color-primary-rgb) / <alpha-value>)",
          600: "rgb(var(--color-primary-rgb) / <alpha-value>)",
          700: "rgb(var(--color-primary-rgb) / <alpha-value>)",
          900: "rgb(var(--color-primary-rgb) / 0.30)",
        },
      },
      typography: (theme: (path: string) => string) => ({
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: theme("colors.slate.700"),
            // Use CSS var directly so prose links/code honour the active theme
            a: { color: "var(--color-primary)" },
            code: {
              color: "var(--color-primary)",
              backgroundColor: theme("colors.slate.100"),
              borderRadius: theme("borderRadius.sm"),
              padding: "0.1em 0.3em",
            },
          },
        },
        invert: {
          css: {
            color: theme("colors.slate.300"),
            a: { color: "var(--color-primary)" },
            code: {
              color: "var(--color-primary)",
              backgroundColor: theme("colors.slate.800"),
            },
          },
        },
      }),
    },
  },
  plugins: [typography],
};

export default config;
