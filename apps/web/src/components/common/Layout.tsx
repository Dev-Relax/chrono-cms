import React, { useContext, useEffect, useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"

// Sidebar nav clicks go through startTransition so route changes are non-blocking.
export const NavTransitionContext = React.createContext<React.TransitionStartFunction>((fn) => fn())
import { useTranslation } from "react-i18next"
import { useAuth } from "../../context/AuthContext.js"
import { useTheme } from "../../context/ThemeContext.js"
import { commentsApi, contactApi } from "../../lib/api.js"
import { LanguageSwitcher } from "./LanguageSwitcher.js"
import type { HeaderStyle } from "../../types/index.js"

type Props = {
  children: React.ReactNode
  /** Render the admin sidebar shell instead of the public header */
  admin?: boolean
}

// Set to true by AdminShell — Layout admin branch becomes a transparent passthrough.
export const AdminShellContext = React.createContext(false)

interface NavItem {
  to: string
  label: string
  icon: string
  end?: boolean // exact match for NavLink
  admin?: boolean // only show when role === "ADMIN"
}

const NAV_SECTIONS: { titleKey: string; items: NavItem[] }[] = [
  {
    titleKey: "nav.content",
    items: [
      { to: "/admin", label: "nav.overview", icon: "▤", end: true },
      { to: "/admin/posts", label: "nav.posts", icon: "✍" },
      { to: "/admin/pages", label: "nav.pages", icon: "☰" },
      { to: "/admin/projects", label: "nav.projects", icon: "🗂" },
      { to: "/admin/comments", label: "nav.comments", icon: "💬" },
      { to: "/admin/skills", label: "nav.skills", icon: "⚙" },
      { to: "/admin/experiences", label: "nav.experiences", icon: "🏢" },
      { to: "/admin/education", label: "nav.education", icon: "🎓" },
      { to: "/admin/testimonials", label: "nav.testimonials", icon: "★" },
      { to: "/admin/contact", label: "nav.contact", icon: "✉" },
      { to: "/admin/certifications", label: "nav.certifications", icon: "🏅" },
    ],
  },
  {
    titleKey: "nav.assets",
    items: [
      { to: "/admin/media", label: "nav.media", icon: "🖼" },
      { to: "/admin/design", label: "nav.design", icon: "🎨" },
      { to: "/admin/navigation", label: "nav.navigation", icon: "☰" },
    ],
  },
  {
    titleKey: "nav.settings",
    items: [
      { to: "/admin/branding", label: "nav.branding", icon: "✦", admin: true },
      { to: "/admin/users", label: "nav.users", icon: "👥", admin: true },
      { to: "/admin/webhooks", label: "nav.webhooks", icon: "⚡", admin: true },
      { to: "/admin/apikeys", label: "nav.apiKeys", icon: "🔑", admin: true },
    ],
  },
]

export const AdminSidebar: React.FC = () => {
  const { state, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const startTransition = useContext(NavTransitionContext)
  const role = state.status === "authenticated" ? state.user.role : null
  const user = state.status === "authenticated" ? state.user : null

  const [pendingCount, setPendingCount] = useState(0)
  const [newContactCount, setNewContactCount] = useState(0)

  useEffect(() => {
    if (state.status !== "authenticated") return
    const fetchCounts = () => {
      commentsApi
        .pendingCount()
        .then(({ count }) => setPendingCount(count))
        .catch(() => { /* ignore */ })
      contactApi
        .newCount()
        .then(({ count }) => setNewContactCount(count))
        .catch(() => { /* ignore */ })
    }
    fetchCounts()
    const id = setInterval(fetchCounts, 60_000)
    return () => clearInterval(id)
  }, [state.status])

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-brand-600/20 text-brand-300 font-medium"
        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
    ].join(" ")

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="flex h-14 items-center border-b border-slate-800 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold hover:opacity-90 transition-opacity"
        >
          <span className="text-lg" style={{ color: "var(--color-primary)" }}>
            ⏱
          </span>
          <span className="text-slate-100">
            Chronos<span style={{ color: "var(--color-primary)" }}>CMS</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => !item.admin || role === "ADMIN")
          if (visibleItems.length === 0) return null
          return (
            <div key={section.titleKey}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                {t(section.titleKey)}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end ?? false}
                      className={linkCls}
                      onClick={(e) => {
                        e.preventDefault()
                        startTransition(() => navigate(item.to))
                      }}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      {t(item.label)}
                      {item.to === "/admin/comments" && pendingCount > 0 && (
                        <span
                          className="ml-auto rounded-full bg-yellow-500 px-1.5 py-0.5
                                         text-[10px] font-bold leading-none text-black"
                        >
                          {pendingCount > 99 ? "99+" : pendingCount}
                        </span>
                      )}
                      {item.to === "/admin/contact" && newContactCount > 0 && (
                        <span
                          className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5
                                         text-[10px] font-bold leading-none text-white"
                        >
                          {newContactCount > 99 ? "99+" : newContactCount}
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}

        <div>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            {t("nav.site")}
          </p>
          <ul className="space-y-0.5">
            <li>
              <Link
                to="/"
                target="_blank"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                <span className="text-base leading-none">↗</span>
                {t("nav.viewSite")}
              </Link>
            </li>
            <li>
              <a
                href="/api/rss.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                <span className="text-base leading-none">◎</span>
                {t("nav.rssFeed")}
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div className="border-t border-slate-800 pt-3">
        <LanguageSwitcher />
      </div>
      <div className="px-3 pb-3">
        {user && (
          <div className="mb-2 flex items-center gap-2 px-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-300">
                {user.name ?? user.email}
              </p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide">{role}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => {
            logout()
            navigate("/login")
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <span className="text-base leading-none">⎋</span>
          {t("auth.logout")}
        </button>
      </div>
    </aside>
  )
}

export const Layout: React.FC<Props> = ({ children, admin = false }) => {
  const { state, logout } = useAuth()
  const { savedTheme, savedBrand, savedNav } = useTheme()
  const navigate = useNavigate()
  const insideShell = useContext(AdminShellContext)

  if (admin) {
    // When rendered inside AdminShell the sidebar is already mounted — just
    // pass children through so the sidebar never unmounts on navigation.
    if (insideShell) return <>{children}</>

    return (
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </main>
      </div>
    )
  }

  const headerStyle: HeaderStyle = savedTheme.layout.headerStyle
  const isBold = headerStyle === "bold"
  const isCentered = headerStyle === "centered"

  const logoColor = isBold ? "rgba(255,255,255,0.95)" : "var(--color-primary)"
  const textColor = isBold
    ? "text-white/90 hover:text-white"
    : "text-slate-400 hover:text-slate-100"

  const isDefaultBrand = savedBrand.siteName === "Chronos CMS" || !savedBrand.siteName

  const logo = (
    <Link
      to="/"
      className="flex items-center gap-2 font-semibold hover:opacity-90 transition-opacity"
    >
      {savedBrand.logoUrl ? (
        <img
          src={savedBrand.logoUrl}
          alt={savedBrand.siteName}
          className="h-8 w-auto object-contain"
        />
      ) : (
        <>
          {isDefaultBrand && (
            <span style={{ color: logoColor }} className="text-lg">
              ⏱
            </span>
          )}
          <span className="text-slate-100" style={{ color: logoColor }}>
            {savedBrand.siteName}
          </span>
        </>
      )}
    </Link>
  )

  const navLink = (to: string, label: React.ReactNode, key: string) => (
    <Link
      key={key}
      to={to}
      onClick={(e) => {
        e.preventDefault()
        React.startTransition(() => navigate(to))
      }}
      className={`transition-colors ${textColor}`}
    >
      {label}
    </Link>
  )

  const nav = (
    <nav className="flex items-center gap-4 text-sm">
      {savedNav.items
        .filter((item) => !item.hidden)
        .map((item) => {
          if (item.type === "blog") {
            return navLink("/", item.label, item.id)
          }
          if (item.type === "projects") {
            return navLink("/projects", item.label, item.id)
          }
          if (item.type === "page" && item.slug) {
            return navLink(`/${item.slug}`, item.label, item.id)
          }
          if (item.type === "custom" && item.url) {
            return (
              <a
                key={item.id}
                href={item.url}
                target={item.url.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className={`transition-colors ${textColor}`}
              >
                {item.label}
              </a>
            )
          }
          return null
        })}
      {state.status === "authenticated" ? (
        <>
          {navLink("/admin", "Admin", "admin")}
          <button
            onClick={() => {
              logout()
              navigate("/login")
            }}
            className={`transition-colors ${textColor}`}
          >
            Logout
          </button>
        </>
      ) : (
        navLink("/login", "Login", "login")
      )}
    </nav>
  )

  const headerStyleObj = isBold
    ? { backgroundColor: "var(--color-primary)" }
    : { backgroundColor: "rgb(var(--color-bg-rgb) / 0.8)" }

  const headerClass = [
    "sticky top-0 z-50 border-b",
    isBold ? "border-white/10" : "border-slate-800 backdrop-blur",
  ].join(" ")

  const innerClass = isCentered
    ? "mx-auto max-w-5xl px-4 flex flex-col items-center gap-2 py-5"
    : "mx-auto max-w-5xl px-4 flex items-center justify-between py-3"

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--color-bg)" }}>
      <header className={headerClass} style={headerStyleObj}>
        <div className={innerClass}>
          {logo}
          {nav}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-600">
        {savedBrand.siteName && savedBrand.siteName !== "Chronos CMS" ? (
          <>
            {savedBrand.siteName} · Powered by <span className="text-slate-500">Chronos-CMS</span>
          </>
        ) : (
          "Chronos-CMS — open-source, self-hostable headless CMS"
        )}
      </footer>
    </div>
  )
}
