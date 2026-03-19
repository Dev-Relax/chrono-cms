import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HexColorPicker } from "react-colorful";
import { useTheme } from "../../context/ThemeContext.js";
import {
  FONT_PAIRS,
  DEFAULT_THEME_CONFIG,
  DEFAULT_SIDEBAR_WIDGETS,
  type CardStyle,
  type FontPair,
  type HeaderStyle,
  type SidebarWidget,
  type SidebarWidgetType,
  type SocialPlatform,
  type ThemeColorConfig,
  type ThemeConfig,
} from "../../types/index.js";
import { Layout } from "../../components/common/Layout.js";
import { Sk } from "../../components/common/Skeleton.js";
import ThemePreview from "../../components/admin/ThemePreview.js";
import { THEME_PRESETS } from "../../lib/themePresets.js";
import type { ThemePreset } from "../../lib/themePresets.js";

const PresetCard: React.FC<{
  preset:   ThemePreset;
  isActive: boolean;
  onSelect: () => void;
}> = ({ preset, isActive, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    title={preset.name}
    className={[
      "group w-full overflow-hidden rounded-xl border transition-all",
      isActive
        ? "border-brand-500 ring-1 ring-brand-500/50"
        : "border-slate-700 hover:border-slate-500",
    ].join(" ")}
  >
    {/* Colour preview area */}
    <div
      className="relative h-14"
      style={{ backgroundColor: preset.config.colors.background }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: preset.config.colors.primary }}
      />
      <div
        className="absolute bottom-2 left-2 right-2 h-5 rounded-md"
        style={{ backgroundColor: preset.config.colors.surface }}
      >
        <div
          className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: preset.config.colors.primary }}
        />
      </div>
    </div>

    <div className="bg-slate-900 px-2 py-1.5 text-left group-hover:bg-slate-800 transition-colors">
      <span className="text-xs font-medium text-slate-300">
        {preset.emoji} {preset.name}
      </span>
    </div>
  </button>
);

type ColorPickerProps = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
};

const ColorSwatch: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="flex items-center justify-between" ref={ref}>
      <label className="text-sm text-slate-300">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-900
                     px-3 py-2 text-sm text-slate-200 transition-colors hover:border-slate-500"
          aria-label={`Pick ${label} colour`}
        >
          <span
            className="inline-block h-4 w-4 rounded-sm border border-slate-600 shadow-inner"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-xs uppercase tracking-wider">{value}</span>
        </button>

        {open && (
          <div
            className="absolute right-0 top-10 z-50 rounded-xl border border-slate-700
                       bg-slate-900 p-3 shadow-2xl"
          >
            <HexColorPicker color={value} onChange={onChange} />
            <input
              type="text"
              value={value}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
              }}
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1
                         text-center font-mono text-xs text-slate-200 outline-none
                         focus:border-brand-500"
              maxLength={7}
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
    <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
      {title}
    </h3>
    <div className="space-y-4">{children}</div>
  </div>
);

type ToggleGroupProps<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: string }[];
  onChange: (v: T) => void;
};

const ToggleGroup = <T extends string>({
  label,
  value,
  options,
  onChange,
}: ToggleGroupProps<T>) => (
  <div>
    <p className="mb-2 text-sm text-slate-300">{label}</p>
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
            value === opt.value
              ? "border-brand-500 bg-brand-500/10 text-brand-400"
              : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-300",
          ].join(" ")}
        >
          {opt.icon && <span className="mr-1.5">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const WIDGET_META: Record<SidebarWidgetType, { icon: string; label: string }> = {
  about:        { icon: "👤", label: "About" },
  tags:         { icon: "🏷️", label: "Topics / Tags" },
  recent_posts: { icon: "📄", label: "Recent Posts" },
  social_links: { icon: "🔗", label: "Social Links" },
  custom_text:  { icon: "✏️", label: "Custom Text" },
};

const SOCIAL_PLATFORMS: SocialPlatform[] = ["twitter", "github", "linkedin", "instagram", "youtube", "rss"];

const SOCIAL_ICONS: Record<SocialPlatform, string> = {
  twitter:   "𝕏",
  github:    "⌥",
  linkedin:  "in",
  instagram: "◎",
  youtube:   "▶",
  rss:       "◉",
};

const WidgetRow: React.FC<{
  widget:   SidebarWidget;
  index:    number;
  total:    number;
  onChange: (w: SidebarWidget) => void;
  onMove:   (index: number, dir: "up" | "down") => void;
}> = ({ widget, index, total, onChange, onMove }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = WIDGET_META[widget.type];

  return (
    <div className={[
      "rounded-lg border transition-colors",
      widget.enabled ? "border-slate-700 bg-slate-800/60" : "border-slate-800 bg-slate-900/40",
    ].join(" ")}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onMove(index, "up")}
            disabled={index === 0}
            className="rounded p-0.5 text-slate-600 transition-colors hover:text-slate-300
                       disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="Move up"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => onMove(index, "down")}
            disabled={index === total - 1}
            className="rounded p-0.5 text-slate-600 transition-colors hover:text-slate-300
                       disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="Move down"
          >
            ▼
          </button>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={widget.enabled}
          onClick={() => onChange({ ...widget, enabled: !widget.enabled })}
          className={[
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
            widget.enabled ? "bg-brand-600" : "bg-slate-700",
          ].join(" ")}
        >
          <span className={[
            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform",
            widget.enabled ? "translate-x-5" : "translate-x-0.5",
          ].join(" ")} />
        </button>

        <span className="text-base leading-none">{meta.icon}</span>
        <span className={[
          "flex-1 text-sm font-medium",
          widget.enabled ? "text-slate-200" : "text-slate-500",
        ].join(" ")}>
          {widget.title}
        </span>
        <span className="text-xs text-slate-600">{meta.label}</span>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded p-1 text-slate-500 transition-colors hover:text-slate-300"
          aria-label={expanded ? "Collapse" : "Expand settings"}
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/60 px-3 pb-3 pt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Widget title</label>
            <input
              type="text"
              value={widget.title}
              onChange={(e) => onChange({ ...widget, title: e.target.value })}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5
                         text-sm text-slate-200 outline-none focus:border-brand-500"
            />
          </div>

          {(widget.type === "about" || widget.type === "custom_text") && (
            <div>
              <label className="mb-1 block text-xs text-slate-500">Text</label>
              <textarea
                value={widget.text ?? ""}
                onChange={(e) => onChange({ ...widget, text: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5
                           text-sm text-slate-200 outline-none focus:border-brand-500 resize-none"
              />
            </div>
          )}

          {widget.type === "recent_posts" && (
            <div>
              <label className="mb-1 block text-xs text-slate-500">Number of posts to show</label>
              <input
                type="number"
                min={1}
                max={10}
                value={widget.count ?? 5}
                onChange={(e) => onChange({ ...widget, count: Math.max(1, Math.min(10, Number(e.target.value))) })}
                className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5
                           text-sm text-slate-200 outline-none focus:border-brand-500"
              />
            </div>
          )}

          {widget.type === "social_links" && (
            <div className="space-y-2">
              <label className="block text-xs text-slate-500">Social links</label>
              {SOCIAL_PLATFORMS.map((platform) => {
                const existing = (widget.links ?? []).find((l) => l.platform === platform);
                return (
                  <div key={platform} className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs font-bold text-slate-400">
                      {SOCIAL_ICONS[platform]}
                    </span>
                    <span className="w-16 text-xs capitalize text-slate-500">{platform}</span>
                    <input
                      type="url"
                      placeholder={`https://${platform}.com/…`}
                      value={existing?.url ?? ""}
                      onChange={(e) => {
                        const url = e.target.value.trim();
                        const links = (widget.links ?? []).filter((l) => l.platform !== platform);
                        if (url) links.push({ platform, url });
                        onChange({ ...widget, links });
                      }}
                      className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1
                                 text-xs text-slate-300 outline-none focus:border-brand-500"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DesignCustomizer: React.FC = () => {
  const { draftTheme, setDraftTheme, saveTheme, isSaving, isDirty, isLoading } = useTheme();

  const patchColors = useCallback(
    (patch: Partial<ThemeColorConfig>) =>
      setDraftTheme({ ...draftTheme, colors: { ...draftTheme.colors, ...patch } }),
    [draftTheme, setDraftTheme]
  );

  const patchLayout = useCallback(
    (patch: Partial<ThemeConfig["layout"]>) =>
      setDraftTheme({ ...draftTheme, layout: { ...draftTheme.layout, ...patch } }),
    [draftTheme, setDraftTheme]
  );

  const patchTypography = useCallback(
    (fontPair: FontPair) =>
      setDraftTheme({ ...draftTheme, typography: { fontPair } }),
    [draftTheme, setDraftTheme]
  );

  const handleReset = useCallback(
    () => setDraftTheme(DEFAULT_THEME_CONFIG),
    [setDraftTheme]
  );

  const widgets = draftTheme.layout.sidebarWidgets ?? DEFAULT_SIDEBAR_WIDGETS;

  const updateWidget = useCallback((index: number, updated: SidebarWidget) => {
    const next = widgets.map((w, i) => (i === index ? updated : w));
    patchLayout({ sidebarWidgets: next });
  }, [widgets, patchLayout]);

  const moveWidget = useCallback((index: number, dir: "up" | "down") => {
    const next = [...widgets];
    const swap = dir === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap]!, next[index]!];
    patchLayout({ sidebarWidgets: next });
  }, [widgets, patchLayout]);

  // A preset is "active" when the draft exactly matches it
  const activePresetId =
    THEME_PRESETS.find(
      (p) => JSON.stringify(p.config) === JSON.stringify(draftTheme)
    )?.id ?? null;

  const handleSave = useCallback(async () => {
    try {
      await saveTheme();
    } catch {
      alert("Failed to save — please try again.");
    }
  }, [saveTheme]);

  return (
    <Layout admin>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Dashboard
          </Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-xl font-bold text-slate-50">Design Customizer</h1>
          {isDirty && (
            <span className="rounded-full bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium
                         text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-colors"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white
                       transition-all hover:bg-brand-700 disabled:cursor-not-allowed
                       disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Sk key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Sk className="h-[480px] rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">

          <div className="space-y-4">

            <Section title="Presets">
              <div className="grid grid-cols-4 gap-2">
                {THEME_PRESETS.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    isActive={activePresetId === preset.id}
                    onSelect={() => setDraftTheme(preset.config)}
                  />
                ))}
              </div>
              {activePresetId && (
                <p className="text-xs text-slate-500">
                  Based on <span className="text-slate-400">{THEME_PRESETS.find(p => p.id === activePresetId)?.name}</span> — tweak below to customise.
                </p>
              )}
            </Section>

            <Section title="Colors">
              <ColorSwatch
                label="Primary / Brand"
                value={draftTheme.colors.primary}
                onChange={(v) => patchColors({ primary: v })}
              />
              <ColorSwatch
                label="Background"
                value={draftTheme.colors.background}
                onChange={(v) => patchColors({ background: v })}
              />
              <ColorSwatch
                label="Surface / Card"
                value={draftTheme.colors.surface}
                onChange={(v) => patchColors({ surface: v })}
              />
            </Section>

            <Section title="Typography">
              <div>
                <label
                  htmlFor="font-pair-select"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Font pairing
                </label>
                <select
                  id="font-pair-select"
                  value={draftTheme.typography.fontPair}
                  onChange={(e) => patchTypography(e.target.value as FontPair)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2
                             text-sm text-slate-200 outline-none transition-colors
                             focus:border-brand-500"
                >
                  {(Object.keys(FONT_PAIRS) as FontPair[]).map((key) => (
                    <option key={key} value={key}>
                      {FONT_PAIRS[key].label}
                    </option>
                  ))}
                </select>
                <p
                  className="mt-2 text-sm text-slate-500"
                  style={{ fontFamily: FONT_PAIRS[draftTheme.typography.fontPair].main }}
                >
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            </Section>

            <Section title="Layout">
              <ToggleGroup<CardStyle>
                label="Post feed style"
                value={draftTheme.layout.cardStyle}
                options={[
                  { value: "grid", label: "Grid", icon: "⊞" },
                  { value: "list", label: "List", icon: "☰" },
                ]}
                onChange={(v) => patchLayout({ cardStyle: v })}
              />

              <ToggleGroup<HeaderStyle>
                label="Header style"
                value={draftTheme.layout.headerStyle}
                options={[
                  { value: "minimal",  label: "Minimal"  },
                  { value: "bold",     label: "Bold"     },
                  { value: "centered", label: "Centered" },
                ]}
                onChange={(v) => patchLayout({ headerStyle: v })}
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Show sidebar</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draftTheme.layout.showSidebar}
                  onClick={() => patchLayout({ showSidebar: !draftTheme.layout.showSidebar })}
                  className={[
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    draftTheme.layout.showSidebar ? "bg-brand-600" : "bg-slate-700",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                      draftTheme.layout.showSidebar ? "translate-x-6" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </div>
            </Section>

            {draftTheme.layout.showSidebar && (
              <Section title="Sidebar Content">
                <p className="text-xs text-slate-500">
                  Drag to reorder. Toggle to show or hide each widget on the live blog.
                </p>
                <div className="space-y-2">
                  {widgets.map((widget, i) => (
                    <WidgetRow
                      key={widget.id}
                      widget={widget}
                      index={i}
                      total={widgets.length}
                      onChange={(updated) => updateWidget(i, updated)}
                      onMove={moveWidget}
                    />
                  ))}
                </div>
              </Section>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-slate-600">
              Live Preview
            </p>
            <ThemePreview theme={draftTheme} />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default DesignCustomizer;
