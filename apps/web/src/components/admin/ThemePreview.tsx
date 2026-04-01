import React, { useEffect, useRef } from "react"
import type { SidebarWidget, ThemeConfig } from "../../types/index.js"
import { FONT_PAIRS } from "../../types/index.js"
import { hexToRgbChannels } from "../../context/ThemeContext.js"

type Props = { theme: ThemeConfig }

const MOCK_POSTS = [
  {
    title: "Getting Started with TypeScript",
    tag: "Dev",
    date: "Mar 10",
    excerpt:
      "A practical guide to setting up a strict TypeScript project from scratch with best-practice tooling.",
  },
  {
    title: "Design Systems at Scale",
    tag: "Design",
    date: "Mar 8",
    excerpt:
      "How to build a token-based design system that adapts to any brand with zero code changes.",
  },
  {
    title: "Deploying with Docker Compose",
    tag: "DevOps",
    date: "Mar 5",
    excerpt:
      "From local development to production in minutes — a step-by-step containerisation walkthrough.",
  },
] as const

const MOCK_TAGS = ["TypeScript", "React", "DevOps", "Design", "CSS"]

const MockHeader: React.FC<{ style: ThemeConfig["layout"]["headerStyle"] }> = ({ style }) => {
  const centered = style === "centered"
  const bold = style === "bold"
  return (
    <header
      style={{
        backgroundColor: bold ? "var(--color-primary)" : "var(--color-surface)",
        borderBottom: `1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)`,
        padding: bold ? "28px 40px" : "20px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: centered ? "center" : "space-between",
        gap: "24px",
        flexDirection: centered ? "column" : "row",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: bold ? "rgba(255,255,255,0.9)" : "var(--color-primary)",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-main)",
            fontWeight: 700,
            fontSize: bold ? 22 : 18,
            color: bold ? "#fff" : "var(--color-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Chronos CMS
        </span>
      </div>
      <nav style={{ display: "flex", gap: 20 }}>
        {["Blog", "Tags", "About"].map((item) => (
          <span
            key={item}
            style={{
              fontFamily: "var(--font-main)",
              fontSize: 13,
              color: bold ? "rgba(255,255,255,0.8)" : "#94a3b8",
              cursor: "default",
            }}
          >
            {item}
          </span>
        ))}
      </nav>
    </header>
  )
}

const MockCard: React.FC<{
  post: (typeof MOCK_POSTS)[number]
  layout: "grid" | "list"
}> = ({ post, layout }) => {
  const isList = layout === "list"
  return (
    <article
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid rgba(148,163,184,0.1)",
        borderRadius: 10,
        padding: isList ? "16px 20px" : 20,
        display: isList ? "flex" : "block",
        alignItems: isList ? "flex-start" : undefined,
        gap: isList ? 20 : undefined,
      }}
    >
      {!isList && (
        <div
          style={{
            height: 100,
            borderRadius: 6,
            marginBottom: 14,
            background: `linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 30%, var(--color-surface)), var(--color-surface))`,
          }}
        />
      )}

      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--color-primary)",
              backgroundColor: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
              padding: "2px 8px",
              borderRadius: 999,
              fontFamily: "var(--font-main)",
            }}
          >
            {post.tag}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "#475569",
              fontFamily: "var(--font-main)",
            }}
          >
            {post.date}
          </span>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-main)",
            fontWeight: 700,
            fontSize: isList ? 15 : 14,
            color: "#f1f5f9",
            margin: "0 0 6px",
            lineHeight: 1.35,
          }}
        >
          {post.title}
        </h3>
        <p
          style={{
            fontFamily: "var(--font-main)",
            fontSize: 12,
            color: "#64748b",
            margin: 0,
            lineHeight: 1.55,
            display: "-webkit-box",
            WebkitLineClamp: isList ? 1 : 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {post.excerpt}
        </p>
        <span
          style={{
            display: "inline-block",
            marginTop: 10,
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-primary)",
            fontFamily: "var(--font-main)",
          }}
        >
          Read more →
        </span>
      </div>
    </article>
  )
}

const widgetCardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid rgba(148,163,184,0.1)",
  borderRadius: 10,
  padding: "14px 16px",
}

const widgetTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-main)",
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#64748b",
  marginBottom: 10,
}

const MockSidebarWidget: React.FC<{ widget: SidebarWidget }> = ({ widget }) => {
  switch (widget.type) {
    case "about":
      return (
        <div style={widgetCardStyle}>
          <p style={widgetTitleStyle}>{widget.title}</p>
          <p
            style={{
              fontFamily: "var(--font-main)",
              fontSize: 11,
              color: "#94a3b8",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {widget.text ?? "A developer-focused blog. Thoughts on software, design, and the web."}
          </p>
        </div>
      )

    case "tags":
      return (
        <div style={widgetCardStyle}>
          <p style={widgetTitleStyle}>{widget.title}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {MOCK_TAGS.map((tag) => (
              <span
                key={tag}
                style={{
                  backgroundColor: "rgba(148,163,184,0.08)",
                  borderRadius: 999,
                  padding: "3px 10px",
                  fontSize: 10,
                  color: "#94a3b8",
                  fontFamily: "var(--font-main)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )

    case "recent_posts": {
      const count = Math.min(widget.count ?? 5, MOCK_POSTS.length)
      return (
        <div style={widgetCardStyle}>
          <p style={widgetTitleStyle}>{widget.title}</p>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {MOCK_POSTS.slice(0, count).map((post) => (
              <li
                key={post.title}
                style={{
                  fontFamily: "var(--font-main)",
                  fontSize: 11,
                  color: "#94a3b8",
                  lineHeight: 1.4,
                }}
              >
                {post.title}
              </li>
            ))}
          </ul>
        </div>
      )
    }

    case "social_links": {
      const links = (widget.links ?? []).filter((l) => l.url)
      if (links.length === 0) {
        // Fallback: show placeholder pills
        return (
          <div style={widgetCardStyle}>
            <p style={widgetTitleStyle}>{widget.title}</p>
            <div style={{ display: "flex", gap: 6 }}>
              {["twitter", "github"].map((p) => (
                <span
                  key={p}
                  style={{
                    border: "1px solid rgba(148,163,184,0.15)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 10,
                    color: "#64748b",
                    fontFamily: "var(--font-main)",
                    textTransform: "capitalize",
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )
      }
      return (
        <div style={widgetCardStyle}>
          <p style={widgetTitleStyle}>{widget.title}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {links.map(({ platform }) => (
              <span
                key={platform}
                style={{
                  border: "1px solid rgba(148,163,184,0.15)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 10,
                  color: "var(--color-primary)",
                  fontFamily: "var(--font-main)",
                  textTransform: "capitalize",
                }}
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      )
    }

    case "custom_text":
      if (!widget.text) return null
      return (
        <div style={widgetCardStyle}>
          <p style={widgetTitleStyle}>{widget.title}</p>
          <p
            style={{
              fontFamily: "var(--font-main)",
              fontSize: 11,
              color: "#94a3b8",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {widget.text}
          </p>
        </div>
      )

    default:
      return null
  }
}

const MockSidebar: React.FC<{ widgets: SidebarWidget[] }> = ({ widgets }) => {
  const enabled = widgets.filter((w) => w.enabled)
  return (
    <div
      style={{
        width: 180,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {enabled.map((widget) => (
        <MockSidebarWidget key={widget.id} widget={widget} />
      ))}
    </div>
  )
}

const INNER_WIDTH = 920
const INNER_HEIGHT = 880

const ThemePreview: React.FC<Props> = ({ theme }) => {
  const pair = FONT_PAIRS[theme.typography.fontPair]
  const isGrid = theme.layout.cardStyle === "grid"
  const showSidebar = theme.layout.showSidebar
  const widgets = theme.layout.sidebarWidgets ?? []
  const rootRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState<number>(0.5)

  // Recompute scale whenever the container resizes so the mock always fills
  // the full panel width — no more fixed 50% shrink.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / INNER_WIDTH)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Apply CSS vars only to this container — never touches document.documentElement,
  // so draft changes stay preview-only until the user hits Save.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    el.style.setProperty("--color-primary", theme.colors.primary)
    el.style.setProperty("--color-bg", theme.colors.background)
    el.style.setProperty("--color-surface", theme.colors.surface)
    el.style.setProperty("--color-primary-rgb", hexToRgbChannels(theme.colors.primary))
    el.style.setProperty("--color-bg-rgb", hexToRgbChannels(theme.colors.background))
    el.style.setProperty("--color-surface-rgb", hexToRgbChannels(theme.colors.surface))
    el.style.setProperty("--font-main", pair.main)
    el.style.setProperty("--font-mono", pair.mono)
  }, [theme, pair])

  return (
    // Outer clip container — width: 100% fills the panel; height tracks scale
    // so the frame is always proportional to the scaled content.
    // ref here means all var() calls inside only see these scoped values.
    <div
      ref={rootRef}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 10,
        width: "100%",
        height: Math.round(INNER_HEIGHT * scale),
      }}
      aria-label="Live theme preview"
    >
      <div
        style={{
          width: INNER_WIDTH,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          backgroundColor: "var(--color-bg)",
          fontFamily: pair.main,
          minHeight: INNER_HEIGHT,
        }}
      >
        <MockHeader style={theme.layout.headerStyle} />

        <div
          style={{
            padding: "32px 40px 24px",
            borderBottom: "1px solid rgba(148,163,184,0.08)",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-main)",
              fontWeight: 800,
              fontSize: 28,
              color: "#f8fafc",
              margin: "0 0 6px",
              letterSpacing: "-0.03em",
            }}
          >
            Latest Posts
          </h1>
          <p
            style={{
              fontFamily: "var(--font-main)",
              fontSize: 14,
              color: "#64748b",
              margin: 0,
            }}
          >
            Thoughts on software, design, and the web.
          </p>
        </div>

        <div
          style={{
            padding: "28px 40px",
            display: "flex",
            gap: 28,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: isGrid ? "grid" : "flex",
              gridTemplateColumns: isGrid
                ? showSidebar
                  ? "repeat(2, 1fr)"
                  : "repeat(3, 1fr)"
                : undefined,
              flexDirection: isGrid ? undefined : "column",
              gap: 16,
            }}
          >
            {MOCK_POSTS.map((post) => (
              <MockCard key={post.title} post={post} layout={theme.layout.cardStyle} />
            ))}
          </div>

          {showSidebar && <MockSidebar widgets={widgets} />}
        </div>
      </div>

      {/* Fade-out overlay at the bottom so it looks clipped intentionally */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background: "linear-gradient(to bottom, transparent, var(--color-surface))",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}

export default ThemePreview
