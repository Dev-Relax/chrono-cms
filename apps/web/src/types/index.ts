export type Role = "ADMIN" | "EDITOR" | "AUTHOR"
export type PostStatus = "DRAFT" | "PUBLISHED"
export type PageStatus = "DRAFT" | "PUBLISHED"
export type CommentStatus = "PENDING" | "APPROVED" | "SPAM" | "REJECTED"

export type Comment = {
  id: string
  content: string
  authorName: string
  authorEmail?: string
  status: CommentStatus
  parentId: string | null
  createdAt: string
  updatedAt: string
  replies?: Comment[]
  post?: { id: string; title: string; slug: string }
}

export type AuthUser = {
  id: string
  email: string
  name: string | null
  role: Role
}

export type Tag = {
  id: string
  name: string
  slug: string
}

export type PostTranslation = {
  id: string
  postId: string
  locale: string
  title: string
  slug: string
  content: TipTapDoc
  excerpt: string | null
  metaTitle: string | null
  metaDescription: string | null
  ogImage: string | null
}

/** Flattened public response — translation fields promoted to top level. */
export type Post = {
  id: string
  defaultLocale: string
  /** Which locale was actually returned (may differ from requested if fallback applied). */
  locale: string
  title: string
  slug: string
  content: TipTapDoc
  excerpt: string | null
  metaTitle: string | null
  metaDescription: string | null
  ogImage: string | null
  status: PostStatus
  featured: boolean
  scheduledAt: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  author: { id: string; name: string | null; email: string }
  tags: Array<{ tag: Tag }>
  /** SEO: all available locale↔slug pairs for hreflang generation. */
  hreflang?: Array<{ locale: string; slug: string }>
  /** Present in admin responses — full list of translations. */
  translations?: PostTranslation[]
}

export type PageLayout = "default" | "wide" | "full-width"

export type PageConfig = {
  layout: PageLayout
  showToc: boolean
  showHero: boolean
}

export const DEFAULT_PAGE_CONFIG: PageConfig = {
  layout: "default",
  showToc: false,
  showHero: false,
}

export type HeroContent = {
  subtitle?: string
  image?: string
  ctaText?: string
  ctaUrl?: string
}

export type PageTranslation = {
  id: string
  pageId: string
  locale: string
  title: string
  slug: string
  content: TipTapDoc
  metaTitle: string | null
  metaDescription: string | null
  ogImage: string | null
  heroContent: HeroContent | null
}

/** Flattened public/admin response — translation fields promoted to top level. */
export type Page = {
  id: string
  defaultLocale: string
  /** Which locale was actually returned (may differ from requested if fallback applied). */
  locale: string
  title: string
  slug: string
  content: TipTapDoc
  metaTitle: string | null
  metaDescription: string | null
  ogImage: string | null
  heroContent: HeroContent | null
  pageConfig: PageConfig
  status: PageStatus
  createdAt: string
  updatedAt: string
  author: { id: string; name: string | null; email: string }
  /** SEO: all available locale↔slug pairs for hreflang generation. */
  hreflang?: Array<{ locale: string; slug: string }>
  /** How many translations exist (lightweight list response). */
  translationCount?: number
  /** Present in admin/editor responses — full list of translations. */
  translations?: PageTranslation[]
}

export type AdminUser = {
  id: string
  email: string
  name: string | null
  role: Role
  createdAt: string
  updatedAt: string
}

export type MediaFile = {
  filename: string
  originalName?: string
  mimeType?: string
  size: number
  uploadedAt: string
  url: string
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type ThemeColorConfig = {
  primary: string
  background: string
  surface: string
}

export type FontPair = "sans-modern" | "serif-editorial" | "mono-technical" | "humanist"

export type HeaderStyle = "minimal" | "bold" | "centered"
export type CardStyle = "grid" | "list"

export type ThemeTypographyConfig = { fontPair: FontPair }

export type SidebarWidgetType = "about" | "tags" | "recent_posts" | "social_links" | "custom_text"

export type SocialPlatform = "twitter" | "github" | "linkedin" | "instagram" | "youtube" | "rss"
export type SocialLink = { platform: SocialPlatform; url: string }

export type SidebarWidget = {
  id: string
  type: SidebarWidgetType
  enabled: boolean
  title: string
  text?: string
  count?: number
  links?: SocialLink[]
}

export const DEFAULT_SIDEBAR_WIDGETS: SidebarWidget[] = [
  {
    id: "about",
    type: "about",
    enabled: true,
    title: "About",
    text: "A developer-focused blog built with Chronos CMS. Thoughts on software, design, and the web.",
  },
  { id: "tags", type: "tags", enabled: true, title: "Topics" },
  {
    id: "recent_posts",
    type: "recent_posts",
    enabled: false,
    title: "Recent Posts",
    count: 5,
  },
  {
    id: "social_links",
    type: "social_links",
    enabled: false,
    title: "Follow",
    links: [],
  },
  {
    id: "custom_text",
    type: "custom_text",
    enabled: false,
    title: "Custom",
    text: "",
  },
]

export type ThemeLayoutConfig = {
  headerStyle: HeaderStyle
  cardStyle: CardStyle
  showSidebar: boolean
  sidebarWidgets: SidebarWidget[]
}

export type ThemeConfig = {
  colors: ThemeColorConfig
  typography: ThemeTypographyConfig
  layout: ThemeLayoutConfig
}

export type BrandConfig = {
  /** Replaces "Chronos CMS" in headers, title, RSS, etc. */
  siteName: string
  /** Short line shown below the blog feed heading */
  tagline: string
  /** HTML <title> value for the site */
  seoTitle: string
  /** Global meta description */
  seoDescription: string
  /** Optional image URL — if set, renders an <img> logo instead of text */
  logoUrl: string
  /** Default Open Graph / social share image URL */
  ogImage: string
}

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  siteName: "Chronos CMS",
  tagline: "",
  seoTitle: "Chronos CMS",
  seoDescription: "",
  logoUrl: "",
  ogImage: "",
}

export type NavItemType = "blog" | "page" | "custom"

export type NavItem = {
  id: string
  type: NavItemType
  label: string
  /** Slug for page links (type === "page") */
  slug?: string
  /** Href for custom links (type === "custom") */
  url?: string
  hidden: boolean
}

export type NavConfig = {
  items: NavItem[]
}

export const DEFAULT_NAV_CONFIG: NavConfig = {
  items: [{ id: "blog", type: "blog", label: "Blog", hidden: false }],
}

export type SiteSettings = {
  id: string
  themeConfig: ThemeConfig
  brandConfig: BrandConfig
  navConfig: NavConfig
  updatedAt: string
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  colors: { primary: "#6366f1", background: "#020617", surface: "#0f172a" },
  typography: { fontPair: "sans-modern" },
  layout: {
    headerStyle: "minimal",
    cardStyle: "grid",
    showSidebar: false,
    sidebarWidgets: DEFAULT_SIDEBAR_WIDGETS,
  },
}

export type FontPairMeta = {
  label: string
  main: string
  mono: string
  googleUrl?: string
}

export const FONT_PAIRS: Record<FontPair, FontPairMeta> = {
  "sans-modern": {
    label: "Sans Modern — Inter",
    main: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  "serif-editorial": {
    label: "Serif Editorial — Merriweather",
    main: "'Merriweather', Georgia, serif",
    mono: "Georgia, serif",
    googleUrl: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
  },
  "mono-technical": {
    label: "Mono Technical — IBM Plex",
    main: "'IBM Plex Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', monospace",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap",
  },
  humanist: {
    label: "Humanist — Lora",
    main: "'Lora', Georgia, serif",
    mono: "'Source Code Pro', monospace",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Source+Code+Pro:wght@400;500&display=swap",
  },
}

export type TipTapMark = {
  type: string
  attrs?: Record<string, unknown>
}

export type TipTapNode = {
  type: string
  attrs?: Record<string, unknown>
  marks?: TipTapMark[]
  content?: TipTapNode[]
  text?: string
}

export type TipTapDoc = {
  type: "doc"
  content: TipTapNode[]
}
