import { useEffect, useRef } from "react"

const CMS_URL = (import.meta.env["VITE_API_URL"] as string | undefined) ?? ""

// Anonymous session ID — tab-scoped, no cookies, no PII stored anywhere.
const getSessionId = (): string => {
  let id = sessionStorage.getItem("_cid")
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem("_cid", id)
  }
  return id
}

// sendBeacon is fire-and-forget and survives page unloads.
// Falls back to fetch(keepalive) if the browser rejects the beacon.
const beacon = (path: string, body: object): void => {
  const url = `${CMS_URL}${path}`
  try {
    if (!navigator.sendBeacon(url, new Blob([JSON.stringify(body)], { type: "application/json" }))) {
      throw new Error("rejected")
    }
  } catch {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {})
  }
}

export const trackPageView = (
  pagePath: string,
  opts: { postId?: string | null; projectId?: string | null } = {},
): void => {
  beacon("/analytics/pageview", {
    path: pagePath,
    referrer: document.referrer || null,
    locale: navigator.language,
    sessionId: getSessionId(),
    postId: opts.postId ?? null,
    projectId: opts.projectId ?? null,
  })
}

export type AnalyticsEventType =
  | "outbound_click"
  | "read_complete"
  | "project_click"
  | "contact_open"

export const trackEvent = (
  type: AnalyticsEventType,
  opts: { path?: string; target?: string } = {},
): void => {
  beacon("/analytics/event", {
    type,
    path: opts.path ?? window.location.pathname,
    target: opts.target ?? null,
    sessionId: getSessionId(),
  })
}

// Attach the returned ref to a sentinel <div> at the bottom of article content.
// Fires "read_complete" once when the sentinel enters the viewport.
export const useReadCompletion = (slug: string | undefined, enabled: boolean) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const firedRef = useRef(false)

  // Reset on slug change so navigating between posts doesn't skip tracking.
  useEffect(() => {
    firedRef.current = false
  }, [slug])

  useEffect(() => {
    if (!enabled || !slug || !sentinelRef.current || firedRef.current) return

    const el = sentinelRef.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !firedRef.current) {
          firedRef.current = true
          trackEvent("read_complete", { target: slug })
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [slug, enabled])

  return sentinelRef
}
