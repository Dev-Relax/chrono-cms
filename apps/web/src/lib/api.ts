import type {
  AuthUser,
  AdminUser,
  MediaFile,
  Page,
  PageTranslation,
  Project,
  ProjectTranslation,
  Post,
  PostTranslation,
  Comment,
  PaginatedResponse,
  SiteSettings,
  ThemeConfig,
  BrandConfig,
  NavConfig,
  CommentStatus,
  Skill,
  SkillLevel,
  Experience,
  Education,
  Testimonial,
  ContactSubmission,
  SubmissionStatus,
  Certification,
} from "../types/index.js"

const BASE_URL = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "/api"

const TOKEN_KEY = "chronos_token"

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY)

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown }

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const token = getToken()

  const headers: Record<string, string> = {
    ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const error = (await res.json().catch(() => ({ error: res.statusText }))) as { error: string }
    throw new ApiError(res.status, error.error ?? "Unknown error")
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  me: () => request<{ user: AuthUser }>("/auth/me"),
}

export type PostsQueryParams = {
  page?: number
  limit?: number
  tag?: string
  status?: "DRAFT" | "PUBLISHED"
  lang?: string
  /** When true, only return posts that have an exact translation for `lang`. */
  strict?: boolean
}

/** Per-locale translatable fields used inside PostPayload.translations. */
export type TranslationPayload = {
  title: string
  slug?: string
  content: Record<string, unknown>
  excerpt?: string
  metaTitle?: string
  metaDescription?: string
  ogImage?: string
}

export type PostPayload = {
  defaultLocale?: string
  /** Multi-locale payload: keyed by locale ("en", "fr", …) */
  translations?: Record<string, TranslationPayload>
  status?: "DRAFT" | "PUBLISHED"
  featured?: boolean
  scheduledAt?: string | null
  tags?: string[]
  // Legacy single-locale fields (kept for backward compat)
  title?: string
  slug?: string
  content?: Record<string, unknown>
  excerpt?: string
  metaTitle?: string
  metaDescription?: string
  ogImage?: string
}

/** Shape returned by GET /admin/posts/:id */
export type AdminPost = Post & {
  translations: PostTranslation[]
}

const buildQuery = (params: Record<string, string | number | undefined>): string => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&")
  return qs ? `?${qs}` : ""
}

const postsQueryToRecord = ({
  strict,
  ...rest
}: PostsQueryParams): Record<string, string | number | undefined> => ({
  ...rest,
  ...(strict ? { strict: "1" } : {}),
})

export const postsApi = {
  list: (params: PostsQueryParams = {}) =>
    request<PaginatedResponse<Post>>(`/posts${buildQuery(postsQueryToRecord(params))}`),

  search: (q: string, lang?: string) =>
    request<{ data: Post[] }>(
      `/posts/search?q=${encodeURIComponent(q)}${lang ? `&lang=${lang}` : ""}`,
    ),

  getBySlug: (slug: string, lang?: string) =>
    request<{ data: Post }>(`/posts/${slug}${lang ? `?lang=${lang}` : ""}`),

  adminList: (params: PostsQueryParams = {}) =>
    request<PaginatedResponse<Post>>(`/admin/posts${buildQuery(postsQueryToRecord(params))}`),

  /** Fetch a single post with all translations (for the editor). */
  adminGet: (id: string) => request<{ data: AdminPost }>(`/admin/posts/${id}`),

  create: (payload: PostPayload) =>
    request<{ data: AdminPost }>("/admin/posts", {
      method: "POST",
      body: payload,
    }),

  update: (id: string, payload: Partial<PostPayload>) =>
    request<{ data: AdminPost }>(`/admin/posts/${id}`, {
      method: "PUT",
      body: payload,
    }),

  delete: (id: string) => request<void>(`/admin/posts/${id}`, { method: "DELETE" }),
}

export type PageTranslationPayload = TranslationPayload & {
  heroContent?: {
    subtitle?: string
    image?: string
    ctaText?: string
    ctaUrl?: string
  } | null
}

export type PagePayload = {
  defaultLocale?: string
  /** Multi-locale payload: keyed by locale ("en", "fr", …) */
  translations?: Record<string, PageTranslationPayload>
  status?: "DRAFT" | "PUBLISHED"
  pageConfig?: { layout?: string; showToc?: boolean; showHero?: boolean }
}

/** Shape returned by GET /admin/pages/:id */
export type AdminPage = Page & {
  translations: PageTranslation[]
}

export type PagesQueryParams = {
  lang?: string
  /** When true, only return pages that have an exact translation for `lang`. */
  strict?: boolean
}

export const pagesApi = {
  /** Public: list all published pages. Pass `lang` to localise, `strict` to filter. */
  list: (params: PagesQueryParams = {}) => {
    const qs = Object.entries({
      ...(params.lang ? { lang: params.lang } : {}),
      ...(params.strict ? { strict: "1" } : {}),
    })
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&")
    return request<{ data: Page[] }>(`/pages${qs ? `?${qs}` : ""}`)
  },

  getBySlug: (slug: string, lang?: string) =>
    request<{ data: Page }>(`/pages/${slug}${lang ? `?lang=${lang}` : ""}`),

  adminList: () => request<{ data: Page[] }>("/admin/pages"),

  adminGet: (id: string) => request<{ data: AdminPage }>(`/admin/pages/${id}`),

  create: (payload: PagePayload) =>
    request<{ data: AdminPage }>("/admin/pages", {
      method: "POST",
      body: payload,
    }),

  update: (id: string, payload: Partial<PagePayload>) =>
    request<{ data: AdminPage }>(`/admin/pages/${id}`, {
      method: "PUT",
      body: payload,
    }),

  delete: (id: string) => request<void>(`/admin/pages/${id}`, { method: "DELETE" }),
}

/** Per-locale translatable fields used inside ProjectPayload.translations. */
export type ProjectTranslationPayload = {
  title: string
  slug?: string
  summary?: string
  content: Record<string, unknown>
  metaTitle?: string
  metaDescription?: string
}

export type ProjectPayload = {
  defaultLocale?: string
  /** Multi-locale payload: keyed by locale ("en", "fr", …) */
  translations?: Record<string, ProjectTranslationPayload>
  status?: "DRAFT" | "PUBLISHED"
  featured?: boolean
  order?: number
  coverImage?: string
  techStack?: string[]
  githubUrl?: string
  liveUrl?: string
  blogUrl?: string
  /** Internal post link. Send `null` to clear. Wins over `blogUrl` when set. */
  postId?: string | null
}

/** Shape returned by GET /admin/projects/:id */
export type AdminProject = Project & {
  translations: ProjectTranslation[]
}

export type ProjectsQueryParams = {
  lang?: string
  /** When true, only return projects that have an exact translation for `lang`. */
  strict?: boolean
}

export const projectsApi = {
  /** Public: list all published projects. Pass `lang` to localise, `strict` to filter. */
  list: (params: ProjectsQueryParams = {}) => {
    const qs = Object.entries({
      ...(params.lang ? { lang: params.lang } : {}),
      ...(params.strict ? { strict: "1" } : {}),
    })
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&")
    return request<{ data: Project[] }>(`/projects${qs ? `?${qs}` : ""}`)
  },

  getBySlug: (slug: string, lang?: string) =>
    request<{ data: Project }>(`/projects/${slug}${lang ? `?lang=${lang}` : ""}`),

  adminList: () => request<{ data: Project[] }>("/admin/projects"),

  adminGet: (id: string) => request<{ data: AdminProject }>(`/admin/projects/${id}`),

  create: (payload: ProjectPayload) =>
    request<{ data: AdminProject }>("/admin/projects", {
      method: "POST",
      body: payload,
    }),

  update: (id: string, payload: Partial<ProjectPayload>) =>
    request<{ data: AdminProject }>(`/admin/projects/${id}`, {
      method: "PUT",
      body: payload,
    }),

  delete: (id: string) => request<void>(`/admin/projects/${id}`, { method: "DELETE" }),

  /** Persist a new manual ordering. `ids` are written as `order` = array index. */
  reorder: (ids: string[]) =>
    request<{ data: { reordered: number } }>("/admin/projects/reorder", {
      method: "PUT",
      body: { ids },
    }),
}

export type UserPayload = {
  email: string
  password: string
  name?: string
  role?: "ADMIN" | "EDITOR" | "AUTHOR"
}

export type UserUpdatePayload = {
  name?: string
  role?: "ADMIN" | "EDITOR" | "AUTHOR"
  password?: string
}

export const usersApi = {
  list: () => request<{ data: AdminUser[] }>("/admin/users"),

  create: (payload: UserPayload) =>
    request<{ data: AdminUser }>("/admin/users", {
      method: "POST",
      body: payload,
    }),

  update: (id: string, payload: UserUpdatePayload) =>
    request<{ data: AdminUser }>(`/admin/users/${id}`, {
      method: "PUT",
      body: payload,
    }),

  delete: (id: string) => request<void>(`/admin/users/${id}`, { method: "DELETE" }),
}

export const settingsApi = {
  get: () => request<{ data: SiteSettings }>("/settings"),

  update: (payload: {
    themeConfig?: ThemeConfig
    brandConfig?: BrandConfig
    navConfig?: NavConfig
  }) =>
    request<{ data: SiteSettings }>("/admin/settings", {
      method: "PUT",
      body: payload,
    }),
}

/** Resolve a relative /uploads/… path to an absolute URL.
 *  - When VITE_API_URL is set (e.g. http://localhost:4000/api) the API origin is used.
 *  - Otherwise (proxy mode) window.location.origin is used so the copied URL is absolute. */
export const resolveMediaUrl = (path: string): string => {
  if (path.startsWith("http")) return path
  const explicitApi = import.meta.env["VITE_API_URL"] as string | undefined
  const origin = explicitApi ? explicitApi.replace(/\/api\/?$/, "") : window.location.origin
  return `${origin}${path}`
}

export const mediaApi = {
  list: () => request<{ data: MediaFile[] }>("/admin/media"),

  upload: async (file: File) => {
    const form = new FormData()
    form.append("file", file)
    const token = getToken()
    const res = await fetch(`${BASE_URL}/admin/media`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error: string }
      throw new ApiError(res.status, err.error ?? "Upload failed")
    }
    return res.json() as Promise<{ data: MediaFile }>
  },

  delete: (filename: string) =>
    request<void>(`/admin/media/${encodeURIComponent(filename)}`, {
      method: "DELETE",
    }),
}

export type WebhookPayload = {
  name: string
  url: string
  secret?: string | null
  events: string[]
  active: boolean
}

export const webhooksApi = {
  list: () => request<{ data: unknown[] }>("/admin/webhooks"),

  create: (payload: WebhookPayload) =>
    request<{ data: unknown }>("/admin/webhooks", {
      method: "POST",
      body: payload,
    }),

  update: (id: string, payload: Partial<WebhookPayload>) =>
    request<{ data: unknown }>(`/admin/webhooks/${id}`, {
      method: "PUT",
      body: payload,
    }),

  delete: (id: string) => request<void>(`/admin/webhooks/${id}`, { method: "DELETE" }),

  test: (id: string) =>
    request<{ ok: boolean; status: number }>(`/admin/webhooks/${id}/test`, {
      method: "POST",
    }),
}

export const apiKeysApi = {
  list: () => request<{ data: unknown[] }>("/admin/apikeys"),

  create: (name: string) =>
    request<{
      data: {
        id: string
        name: string
        prefix: string
        createdAt: string
        key: string
      }
    }>("/admin/apikeys", { method: "POST", body: { name } }),

  delete: (id: string) => request<void>(`/admin/apikeys/${id}`, { method: "DELETE" }),
}

export const bulkApi = {
  posts: (action: "publish" | "unpublish" | "delete", ids: string[]) =>
    request<{ affected: number }>("/admin/posts/bulk", {
      method: "POST",
      body: { action, ids },
    }),
}

export const activityApi = {
  list: () => request<{ data: unknown[] }>("/admin/activity"),
}

export interface CmsStats {
  posts: { total: number; published: number; draft: number }
  pages: { total: number; published: number; draft: number }
  projects: { total: number; published: number; draft: number }
  media: { total: number }
  users: { total: number | null }
  recentPosts: {
    id: string
    title: string
    slug: string
    status: string
    featured: boolean
    publishedAt: string | null
    updatedAt: string
    author: { name: string | null; email: string }
  }[]
  recentPages: {
    id: string
    title: string
    slug: string
    status: string
    updatedAt: string
  }[]
  recentProjects: {
    id: string
    title: string
    slug: string
    status: string
    featured: boolean
    updatedAt: string
  }[]
}

export const statsApi = {
  get: () => request<{ data: CmsStats }>("/admin/stats"),
}

export type CommentPayload = {
  content: string
  authorName: string
  authorEmail: string
  parentId?: string
}

export type CommentsQueryParams = {
  status?: CommentStatus
  postId?: string
  page?: number
  limit?: number
}

export const commentsApi = {
  /** Public: get approved comments tree for a post */
  listForPost: (postId: string) => request<{ data: Comment[] }>(`/posts/${postId}/comments`),

  /** Public: submit a new comment */
  submit: (postId: string, payload: CommentPayload) =>
    request<{ data: Comment; message: string }>(`/posts/${postId}/comments`, {
      method: "POST",
      body: payload,
    }),

  /** Admin: list all comments with optional filters */
  adminList: (params: CommentsQueryParams = {}) =>
    request<PaginatedResponse<Comment>>(`/admin/comments${buildQuery({ ...params })}`),

  /** Admin: pending badge count */
  pendingCount: () => request<{ count: number }>("/admin/comments/pending-count"),

  /** Admin: update a comment's status */
  moderate: (id: string, status: CommentStatus) =>
    request<{ data: Comment }>(`/admin/comments/${id}`, {
      method: "PATCH",
      body: { status },
    }),

  /** Admin: delete a comment (cascades to replies) */
  delete: (id: string) => request<void>(`/admin/comments/${id}`, { method: "DELETE" }),

  /** Admin: bulk action */
  bulk: (action: "approve" | "reject" | "spam" | "delete", ids: string[]) =>
    request<{ affected: number }>("/admin/comments/bulk", {
      method: "POST",
      body: { action, ids },
    }),
}

export const previewApi = {
  /** Generate a 1-hour preview token for any post (draft or published). */
  create: (postId: string) =>
    request<{ data: { token: string; expiresIn: number } }>(`/admin/posts/${postId}/preview`, {
      method: "POST",
    }),

  /** Fetch a post via its preview token (public, no auth needed). */
  get: (token: string, lang?: string) =>
    request<{ data: Post; preview: boolean }>(`/preview/${token}${lang ? `?lang=${lang}` : ""}`),
}

export type TestimonialPayload = {
  author: string
  role?: string
  company?: string
  avatarUrl?: string
  content: string
  rating?: number
  featured?: boolean
  visible?: boolean
  order?: number
}

export const testimonialsApi = {
  list: (featured?: boolean) =>
    request<{ data: Testimonial[] }>(`/testimonials${featured ? "?featured=true" : ""}`),

  adminList: () => request<{ data: Testimonial[] }>("/admin/testimonials"),

  create: (payload: TestimonialPayload) =>
    request<{ data: Testimonial }>("/admin/testimonials", { method: "POST", body: payload }),

  update: (id: string, payload: Partial<TestimonialPayload>) =>
    request<{ data: Testimonial }>(`/admin/testimonials/${id}`, { method: "PUT", body: payload }),

  delete: (id: string) => request<void>(`/admin/testimonials/${id}`, { method: "DELETE" }),

  reorder: (ids: string[]) =>
    request<void>("/admin/testimonials/reorder", { method: "PUT", body: { ids } }),
}

export type EducationTranslationPayload = {
  degree: string
  description: Record<string, unknown>
}

export type EducationPayload = {
  institution: string
  field?: string
  startDate: string
  endDate?: string | null
  url?: string
  logoUrl?: string
  order?: number
  translations?: Record<string, EducationTranslationPayload>
}

export const educationApi = {
  list: (lang?: string) =>
    request<{ data: Education[] }>(`/education${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`),

  adminList: () => request<{ data: Education[] }>("/admin/education"),

  adminGet: (id: string) => request<{ data: Education }>(`/admin/education/${id}`),

  create: (payload: EducationPayload) =>
    request<{ data: Education }>("/admin/education", { method: "POST", body: payload }),

  update: (id: string, payload: Partial<EducationPayload>) =>
    request<{ data: Education }>(`/admin/education/${id}`, { method: "PUT", body: payload }),

  delete: (id: string) => request<void>(`/admin/education/${id}`, { method: "DELETE" }),

  reorder: (ids: string[]) =>
    request<void>("/admin/education/reorder", { method: "PUT", body: { ids } }),
}

export type ExperienceTranslationPayload = {
  role: string
  description: Record<string, unknown>
}

export type ExperiencePayload = {
  company: string
  location?: string
  startDate: string
  endDate?: string | null
  url?: string
  logoUrl?: string
  order?: number
  translations?: Record<string, ExperienceTranslationPayload>
}

export const experiencesApi = {
  list: (lang?: string) =>
    request<{ data: Experience[] }>(`/experiences${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`),

  adminList: () => request<{ data: Experience[] }>("/admin/experiences"),

  adminGet: (id: string) => request<{ data: Experience }>(`/admin/experiences/${id}`),

  create: (payload: ExperiencePayload) =>
    request<{ data: Experience }>("/admin/experiences", { method: "POST", body: payload }),

  update: (id: string, payload: Partial<ExperiencePayload>) =>
    request<{ data: Experience }>(`/admin/experiences/${id}`, { method: "PUT", body: payload }),

  delete: (id: string) => request<void>(`/admin/experiences/${id}`, { method: "DELETE" }),

  reorder: (ids: string[]) =>
    request<void>("/admin/experiences/reorder", { method: "PUT", body: { ids } }),
}

export type SkillPayload = {
  name: string
  slug?: string
  category: string
  level?: SkillLevel
  icon?: string
  order?: number
  visible?: boolean
}

export const skillsApi = {
  list: (category?: string) =>
    request<{ data: Skill[] }>(`/skills${category ? `?category=${encodeURIComponent(category)}` : ""}`),

  adminList: () => request<{ data: Skill[] }>("/admin/skills"),

  create: (payload: SkillPayload) =>
    request<{ data: Skill }>("/admin/skills", { method: "POST", body: payload }),

  update: (id: string, payload: Partial<SkillPayload>) =>
    request<{ data: Skill }>(`/admin/skills/${id}`, { method: "PUT", body: payload }),

  delete: (id: string) => request<void>(`/admin/skills/${id}`, { method: "DELETE" }),

  reorder: (ids: string[]) =>
    request<void>("/admin/skills/reorder", { method: "PUT", body: { ids } }),
}

export type ContactSubmitPayload = {
  name: string
  email: string
  subject?: string
  message: string
}

export const contactApi = {
  /** Public: submit a contact form */
  submit: (payload: ContactSubmitPayload) =>
    request<{ data: ContactSubmission; message: string }>("/contact", {
      method: "POST",
      body: payload,
    }),

  /** Admin: new-submission badge count */
  newCount: () => request<{ count: number }>("/admin/contact/new-count"),

  /** Admin: list submissions */
  adminList: (status?: SubmissionStatus, page?: number, limit?: number) =>
    request<PaginatedResponse<ContactSubmission>>(
      `/admin/contact${buildQuery({ status, page, limit })}`,
    ),

  /** Admin: change status */
  moderate: (id: string, status: SubmissionStatus) =>
    request<{ data: ContactSubmission }>(`/admin/contact/${id}`, {
      method: "PATCH",
      body: { status },
    }),

  /** Admin: delete */
  delete: (id: string) => request<void>(`/admin/contact/${id}`, { method: "DELETE" }),
}

export type CertificationTranslationPayload = {
  title: string
  description?: Record<string, unknown>
}

export type CertificationPayload = {
  issuer: string
  issuedAt: string
  expiresAt?: string | null
  credentialUrl?: string | null
  logoUrl?: string | null
  order?: number
  translations: Record<string, CertificationTranslationPayload>
}

export const certificationsApi = {
  list: (lang?: string) =>
    request<{ data: Certification[] }>(`/certifications${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`),

  adminList: () => request<{ data: Certification[] }>("/admin/certifications"),

  create: (payload: CertificationPayload) =>
    request<{ data: Certification }>("/admin/certifications", { method: "POST", body: payload }),

  update: (id: string, payload: Partial<CertificationPayload>) =>
    request<{ data: Certification }>(`/admin/certifications/${id}`, {
      method: "PUT",
      body: payload,
    }),

  delete: (id: string) => request<void>(`/admin/certifications/${id}`, { method: "DELETE" }),

  reorder: (ids: string[]) =>
    request<void>("/admin/certifications/reorder", { method: "PUT", body: { ids } }),
}


export type AnalyticsPeriod = "7d" | "30d" | "90d" | "all"

export interface AnalyticsOverview {
  summary: { uniqueVisitors: number; totalPageViews: number; totalEvents: number }
  timeSeries: { date: string; visitors: number; pageViews: number }[]
  topPages: { path: string; views: number }[]
  referrers: { referrer: string | null; count: number }[]
  devices: { device: string; count: number }[]
}

export interface AnalyticsContent {
  posts: {
    postId: string | null
    title: string
    slug: string
    views: number
    readCompletions: number
    completionRate: number
  }[]
  projects: {
    projectId: string | null
    title: string
    slug: string
    views: number
    outboundClicks: number
  }[]
}

export interface AnalyticsEvents {
  byType: { type: string; count: number }[]
  topTargets: { target: string | null; count: number }[]
}

export const analyticsApi = {
  overview: (period: AnalyticsPeriod = "30d") =>
    request<{ data: AnalyticsOverview }>(`/insights/overview?period=${period}`),
  content: (period: AnalyticsPeriod = "30d") =>
    request<{ data: AnalyticsContent }>(`/insights/content?period=${period}`),
  events: (period: AnalyticsPeriod = "30d") =>
    request<{ data: AnalyticsEvents }>(`/insights/events?period=${period}`),
}

export const revisionsApi = {
  list: (postId: string, lang?: string) =>
    request<{ data: unknown[] }>(`/admin/posts/${postId}/revisions${lang ? `?lang=${lang}` : ""}`),

  get: (postId: string, revId: string) =>
    request<{ data: unknown }>(`/admin/posts/${postId}/revisions/${revId}`),

  restore: (postId: string, revId: string) =>
    request<{ data: AdminPost }>(`/admin/posts/${postId}/revisions/${revId}/restore`, {
      method: "POST",
    }),
}
