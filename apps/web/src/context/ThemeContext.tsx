import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { settingsApi } from "../lib/api.js"
import {
  DEFAULT_THEME_CONFIG,
  DEFAULT_BRAND_CONFIG,
  DEFAULT_SIDEBAR_WIDGETS,
  DEFAULT_NAV_CONFIG,
  FONT_PAIRS,
  type ThemeConfig,
  type BrandConfig,
  type NavConfig,
} from "../types/index.js"

// Fill in missing fields that may be absent in older saved DB records.
const mergeWithDefaults = (raw: ThemeConfig): ThemeConfig => ({
  ...raw,
  layout: {
    ...raw.layout,
    sidebarWidgets: raw.layout.sidebarWidgets ?? DEFAULT_SIDEBAR_WIDGETS,
  },
})

const mergeNavDefaults = (raw: Partial<NavConfig> | null | undefined): NavConfig => ({
  items: raw?.items ?? DEFAULT_NAV_CONFIG.items,
})

// Convert #rrggbb → "r g b" space-separated channels for CSS Level 4 rgb().
export const hexToRgbChannels = (hex: string): string => {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m || !m[1] || !m[2] || !m[3]) return "99 102 241" // fallback: indigo
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`
}

const loadedFontUrls = new Set<string>()

const ensureFontLoaded = (googleUrl: string): void => {
  if (loadedFontUrls.has(googleUrl)) return
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = googleUrl
  document.head.appendChild(link)
  loadedFontUrls.add(googleUrl)
}

export const applyThemeToDom = (theme: ThemeConfig): void => {
  const root = document.documentElement

  root.style.setProperty("--color-primary", theme.colors.primary)
  root.style.setProperty("--color-bg", theme.colors.background)
  root.style.setProperty("--color-surface", theme.colors.surface)
  root.style.setProperty("--color-primary-rgb", hexToRgbChannels(theme.colors.primary))
  root.style.setProperty("--color-bg-rgb", hexToRgbChannels(theme.colors.background))
  root.style.setProperty("--color-surface-rgb", hexToRgbChannels(theme.colors.surface))

  const pair = FONT_PAIRS[theme.typography.fontPair]
  if (pair.googleUrl) ensureFontLoaded(pair.googleUrl)
  root.style.setProperty("--font-main", pair.main)
  root.style.setProperty("--font-mono", pair.mono)

  root.setAttribute("data-card-style", theme.layout.cardStyle)
  root.setAttribute("data-header-style", theme.layout.headerStyle)
}

type ThemeContextValue = {
  savedTheme: ThemeConfig
  draftTheme: ThemeConfig
  setDraftTheme: (theme: ThemeConfig) => void
  saveTheme: () => Promise<void>
  savedBrand: BrandConfig
  draftBrand: BrandConfig
  setDraftBrand: (brand: BrandConfig) => void
  saveBrand: () => Promise<void>
  savedNav: NavConfig
  setNav: (nav: NavConfig) => void
  saveNav: () => Promise<void>
  isSaving: boolean
  isDirty: boolean
  isBrandDirty: boolean
  isNavDirty: boolean
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedTheme, setSavedTheme] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG)
  const [draftTheme, setDraftThemeState] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG)
  const [savedBrand, setSavedBrand] = useState<BrandConfig>(DEFAULT_BRAND_CONFIG)
  const [draftBrand, setDraftBrandState] = useState<BrandConfig>(DEFAULT_BRAND_CONFIG)
  const [savedNav, setSavedNav] = useState<NavConfig>(DEFAULT_NAV_CONFIG)
  const [draftNav, setDraftNavState] = useState<NavConfig>(DEFAULT_NAV_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Apply defaults immediately (no flash of un-themed content)
  const initialised = useRef(false)
  if (!initialised.current) {
    applyThemeToDom(DEFAULT_THEME_CONFIG)
    initialised.current = true
  }

  // Load persisted settings on mount
  useEffect(() => {
    settingsApi
      .get()
      .then(({ data }) => {
        const theme = mergeWithDefaults(data.themeConfig)
        setSavedTheme(theme)
        setDraftThemeState(theme)
        applyThemeToDom(theme)

        const brand = { ...DEFAULT_BRAND_CONFIG, ...data.brandConfig }
        setSavedBrand(brand)
        setDraftBrandState(brand)
        if (brand.seoTitle) document.title = brand.seoTitle

        const nav = mergeNavDefaults(data.navConfig as Partial<NavConfig> | null)
        setSavedNav(nav)
        setDraftNavState(nav)
      })
      .catch(() => {
        // Fall back to defaults — site still works
      })
      .finally(() => setIsLoading(false))
  }, [])

  // Draft changes are preview-only — do NOT touch document.documentElement here.
  // applyThemeToDom is only called on initial load and after a successful save.
  const setDraftTheme = useCallback((theme: ThemeConfig) => {
    setDraftThemeState(theme)
  }, [])

  const setDraftBrand = useCallback((brand: BrandConfig) => {
    setDraftBrandState(brand)
  }, [])

  const setNav = useCallback((nav: NavConfig) => {
    setDraftNavState(nav)
  }, [])

  const saveTheme = useCallback(async () => {
    setIsSaving(true)
    try {
      const { data } = await settingsApi.update({ themeConfig: draftTheme })
      const theme = mergeWithDefaults(data.themeConfig)
      setSavedTheme(theme)
      setDraftThemeState(theme)
      applyThemeToDom(theme)
    } finally {
      setIsSaving(false)
    }
  }, [draftTheme])

  const saveBrand = useCallback(async () => {
    setIsSaving(true)
    try {
      const { data } = await settingsApi.update({ brandConfig: draftBrand })
      const brand = { ...DEFAULT_BRAND_CONFIG, ...data.brandConfig }
      setSavedBrand(brand)
      setDraftBrandState(brand)
      if (brand.seoTitle) document.title = brand.seoTitle
    } finally {
      setIsSaving(false)
    }
  }, [draftBrand])

  const saveNav = useCallback(async () => {
    setIsSaving(true)
    try {
      const { data } = await settingsApi.update({ navConfig: draftNav })
      const nav = mergeNavDefaults(data.navConfig as Partial<NavConfig> | null)
      setSavedNav(nav)
      setDraftNavState(nav)
    } finally {
      setIsSaving(false)
    }
  }, [draftNav])

  const isDirty = JSON.stringify(draftTheme) !== JSON.stringify(savedTheme)
  const isBrandDirty = JSON.stringify(draftBrand) !== JSON.stringify(savedBrand)
  const isNavDirty = JSON.stringify(draftNav) !== JSON.stringify(savedNav)

  return (
    <ThemeContext.Provider
      value={{
        savedTheme,
        draftTheme,
        setDraftTheme,
        saveTheme,
        savedBrand,
        draftBrand,
        setDraftBrand,
        saveBrand,
        savedNav,
        setNav,
        saveNav,
        isSaving,
        isDirty,
        isBrandDirty,
        isNavDirty,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>")
  return ctx
}
