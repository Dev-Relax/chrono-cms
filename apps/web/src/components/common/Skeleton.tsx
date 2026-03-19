import React from "react";

export const Sk: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-slate-800 ${className}`} />
);

export const SkeletonPageHeader: React.FC<{ withButton?: boolean }> = ({ withButton = true }) => (
  <div className="mb-6 flex items-center justify-between">
    <div className="space-y-2">
      <Sk className="h-7 w-40" />
      <Sk className="h-4 w-24" />
    </div>
    {withButton && <Sk className="h-9 w-28 rounded-lg" />}
  </div>
);

export const SkeletonTableRows: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 6,
  cols = 4,
}) => (
  <div className="rounded-xl border border-slate-800 overflow-hidden">
    <div className="flex gap-4 border-b border-slate-800 bg-slate-900/60 px-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Sk key={i} className={`h-3.5 rounded ${i === 0 ? "w-1/3" : "w-1/6"}`} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div
        key={r}
        className="flex items-center gap-4 border-b border-slate-800/60 last:border-0 px-4 py-3.5"
      >
        <Sk className="h-4 w-1/3" />
        {Array.from({ length: cols - 1 }).map((_, c) => (
          <Sk key={c} className={`h-4 ${c === cols - 2 ? "w-16 ml-auto" : "w-1/6"}`} />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonStatCards: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <Sk className="h-3 w-16" />
        <Sk className="h-8 w-20" />
        <Sk className="h-3 w-24" />
      </div>
    ))}
  </div>
);

export const SkeletonImageGrid: React.FC<{ count?: number }> = ({ count = 10 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Sk key={i} className="h-32 rounded-xl" />
    ))}
  </div>
);

export const SkeletonCardList: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Sk className="h-4 w-48" />
            <Sk className="h-3 w-64" />
            <div className="mt-2 flex gap-1.5">
              <Sk className="h-5 w-20 rounded-full" />
              <Sk className="h-5 w-24 rounded-full" />
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Sk className="h-7 w-12 rounded-md" />
            <Sk className="h-7 w-12 rounded-md" />
            <Sk className="h-7 w-14 rounded-md" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonEditorForm: React.FC = () => (
  <div className="space-y-5">
    <Sk className="h-10 w-full rounded-lg" />
    <div className="flex gap-2">
      <Sk className="h-6 w-20 rounded-full" />
      <Sk className="h-6 w-28 rounded-full" />
    </div>
    <Sk className="h-80 w-full rounded-xl" />
    <div className="flex gap-3">
      <Sk className="h-9 w-28 rounded-lg" />
      <Sk className="h-9 w-20 rounded-lg" />
    </div>
  </div>
);

// Static replica of the admin shell used as Suspense fallback — keeps the
// sidebar visible during route transitions instead of flashing a blank page.
const SIDEBAR_SECTIONS = [
  {
    title: "Content",
    items: [
      { icon: "▤", label: "Overview"  },
      { icon: "✍", label: "Posts"     },
      { icon: "☰", label: "Pages"     },
      { icon: "💬", label: "Comments" },
    ],
  },
  {
    title: "Assets",
    items: [
      { icon: "🖼", label: "Media"  },
      { icon: "🎨", label: "Design" },
    ],
  },
  {
    title: "Settings",
    items: [
      { icon: "✦", label: "Branding" },
      { icon: "👥", label: "Users"   },
      { icon: "⚡", label: "Webhooks"},
      { icon: "🔑", label: "API Keys"},
    ],
  },
];

export const AdminPageSkeleton: React.FC = () => (
  <div className="flex h-screen overflow-hidden bg-slate-950">
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="flex h-14 items-center border-b border-slate-800 px-4">
        <div className="flex items-center gap-2 font-semibold">
          <span className="text-lg" style={{ color: "var(--color-primary)" }}>⏱</span>
          <span className="text-slate-100">
            Chronos<span style={{ color: "var(--color-primary)" }}>CMS</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.label}>
                  <span className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400">
                    <span className="text-base leading-none">{item.icon}</span>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-3 py-3">
        <div className="mb-2 flex items-center gap-2 px-3">
          <Sk className="h-7 w-7 rounded-full" />
          <div className="space-y-1.5">
            <Sk className="h-3 w-20" />
            <Sk className="h-2.5 w-10" />
          </div>
        </div>
      </div>
    </aside>

    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SkeletonPageHeader />
        <SkeletonTableRows rows={7} cols={4} />
      </div>
    </main>
  </div>
);
