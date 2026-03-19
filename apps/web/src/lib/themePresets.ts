// All backgrounds stay dark — "Light" uses slate-700 tones, not white.
// A full light-mode migration would require touching every component.

import type { ThemeConfig } from "../types/index.js";
import { DEFAULT_SIDEBAR_WIDGETS } from "../types/index.js";

export type ThemePreset = {
  id:     string;
  name:   string;
  emoji:  string;
  config: ThemeConfig;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "dark",
    name: "Dark",
    emoji: "🌑",
    config: {
      colors:     { primary: "#6366f1", background: "#020617", surface: "#0f172a" },
      typography: { fontPair: "sans-modern" },
      layout:     { headerStyle: "minimal", cardStyle: "grid", showSidebar: false, sidebarWidgets: DEFAULT_SIDEBAR_WIDGETS },
    },
  },

  {
    id: "light",
    name: "Light",
    emoji: "☀️",
    config: {
      colors:     { primary: "#4f46e5", background: "#1e293b", surface: "#334155" },
      typography: { fontPair: "sans-modern" },
      layout:     { headerStyle: "minimal", cardStyle: "list", showSidebar: false, sidebarWidgets: DEFAULT_SIDEBAR_WIDGETS },
    },
  },

  {
    id: "synthwave",
    name: "Synthwave",
    emoji: "🌆",
    config: {
      colors:     { primary: "#e879f9", background: "#0d0a1f", surface: "#1a0d35" },
      typography: { fontPair: "mono-technical" },
      layout:     { headerStyle: "bold", cardStyle: "grid", showSidebar: false, sidebarWidgets: DEFAULT_SIDEBAR_WIDGETS },
    },
  },

  {
    id: "medieval",
    name: "Medieval",
    emoji: "⚔️",
    config: {
      colors:     { primary: "#d97706", background: "#1c1008", surface: "#2c1a0a" },
      typography: { fontPair: "serif-editorial" },
      layout:     { headerStyle: "minimal", cardStyle: "list", showSidebar: true, sidebarWidgets: DEFAULT_SIDEBAR_WIDGETS },
    },
  },

  {
    id: "modern",
    name: "Modern",
    emoji: "✦",
    config: {
      colors:     { primary: "#06b6d4", background: "#0c1015", surface: "#131c24" },
      typography: { fontPair: "sans-modern" },
      layout:     { headerStyle: "centered", cardStyle: "grid", showSidebar: false, sidebarWidgets: DEFAULT_SIDEBAR_WIDGETS },
    },
  },

  {
    id: "romance",
    name: "Romance",
    emoji: "🌹",
    config: {
      colors:     { primary: "#f43f5e", background: "#1a0a0e", surface: "#2d1018" },
      typography: { fontPair: "humanist" },
      layout:     { headerStyle: "centered", cardStyle: "list", showSidebar: true, sidebarWidgets: DEFAULT_SIDEBAR_WIDGETS },
    },
  },

  {
    id: "forest",
    name: "Forest",
    emoji: "🌲",
    config: {
      colors:     { primary: "#22c55e", background: "#061209", surface: "#0d2418" },
      typography: { fontPair: "humanist" },
      layout:     { headerStyle: "bold", cardStyle: "grid", showSidebar: false, sidebarWidgets: DEFAULT_SIDEBAR_WIDGETS },
    },
  },
];
