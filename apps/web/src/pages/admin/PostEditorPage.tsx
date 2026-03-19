import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { postsApi, revisionsApi, ApiError } from "../../lib/api.js";
import type { PostStatus, TipTapDoc } from "../../types/index.js";
import type { TranslationPayload } from "../../lib/api.js";
import { RichTextEditor } from "../../components/editor/RichTextEditor.js";
import { PostRenderer } from "../../components/editor/PostRenderer.js";
import { Layout } from "../../components/common/Layout.js";
import { SkeletonEditorForm, SkeletonPageHeader } from "../../components/common/Skeleton.js";
import { readingTimeLabel } from "../../lib/readingTime.js";

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const EMPTY_DOC: TipTapDoc = { type: "doc", content: [{ type: "paragraph" }] };

// common BCP-47 → flag emoji; falls back to 🌐
const KNOWN_FLAGS: Record<string, string> = {
  en: "🇬🇧", "en-us": "🇺🇸", "en-gb": "🇬🇧", "en-au": "🇦🇺", "en-ca": "🇨🇦",
  fr: "🇫🇷", "fr-be": "🇧🇪", "fr-ch": "🇨🇭", "fr-ca": "🇨🇦",
  de: "🇩🇪", "de-at": "🇦🇹", "de-ch": "🇨🇭",
  es: "🇪🇸", "es-mx": "🇲🇽", "es-ar": "🇦🇷", "es-co": "🇨🇴",
  it: "🇮🇹", pt: "🇵🇹", "pt-br": "🇧🇷",
  nl: "🇳🇱", "nl-be": "🇧🇪",
  ru: "🇷🇺", uk: "🇺🇦", pl: "🇵🇱", cs: "🇨🇿", sk: "🇸🇰", ro: "🇷🇴",
  sv: "🇸🇪", no: "🇳🇴", da: "🇩🇰", fi: "🇫🇮", nb: "🇳🇴",
  ja: "🇯🇵", ko: "🇰🇷", zh: "🇨🇳", "zh-tw": "🇹🇼", "zh-hk": "🇭🇰",
  ar: "🇸🇦", he: "🇮🇱", tr: "🇹🇷", fa: "🇮🇷",
  hi: "🇮🇳", bn: "🇧🇩", vi: "🇻🇳", th: "🇹🇭", id: "🇮🇩", ms: "🇲🇾",
  el: "🇬🇷", hu: "🇭🇺", bg: "🇧🇬", hr: "🇭🇷", sr: "🇷🇸",
  ca: "🏳️", eu: "🏳️", gl: "🏳️",
};
const getLocaleFlag = (locale: string) =>
  KNOWN_FLAGS[locale.toLowerCase()] ?? "🌐";

const COMMON_LOCALES = ["es", "de", "it", "pt", "nl", "ru", "ja", "ko", "zh", "ar", "pl", "tr"];

interface LocaleData {
  title:           string;
  slug:            string;
  content:         TipTapDoc;
  excerpt:         string;
  metaTitle:       string;
  metaDescription: string;
  ogImage:         string;
}

const emptyLocale = (): LocaleData => ({
  title: "", slug: "", content: EMPTY_DOC,
  excerpt: "", metaTitle: "", metaDescription: "", ogImage: "",
});

type LocaleMap = Record<string, LocaleData>;

interface RevisionMeta {
  id:        string;
  locale:    string;
  title:     string;
  createdAt: string;
  user:      { id: string; name: string | null; email: string };
}

type ViewMode = "editor" | "preview" | "split";

const Collapsible: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <span className="text-slate-600 text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-800 pt-4">{children}</div>}
    </div>
  );
};

const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, hint, children, className }) => (
  <div className={className}>
    <label className="block mb-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
  </div>
);

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm " +
  "text-slate-100 placeholder-slate-600 " +
  "focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const PostEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate  = useNavigate();
  const { t }     = useTranslation();

  const [activeLocale, setActiveLocale]   = useState<string>("en");
  const [locales, setLocales]             = useState<LocaleMap>({ en: emptyLocale() });
  const [defaultLocale, setDefaultLocale] = useState<string>("en");

  const [addingLocale, setAddingLocale]   = useState(false);
  const [newLocaleInput, setNewLocaleInput] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  const [tags, setTags]                 = useState("");
  const [status, setStatus]             = useState<PostStatus>("DRAFT");
  const [featured, setFeatured]         = useState(false);
  const [scheduledAt, setScheduledAt]   = useState("");
  const [showSchedule, setShowSchedule] = useState(false);

  const [loading, setLoading]   = useState(isEditing);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [saved, setSaved]       = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("split");

  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions]         = useState<RevisionMeta[]>([]);
  const [revLoading, setRevLoading]       = useState(false);
  const [restoring, setRestoring]         = useState(false);

  // Per-locale slug-touched tracking
  const slugTouched = useRef<Record<string, boolean>>({});

  const current = locales[activeLocale] ?? emptyLocale();

  const setCurrentField = <K extends keyof LocaleData>(field: K, value: LocaleData[K]) => {
    setLocales((prev) => ({ ...prev, [activeLocale]: { ...emptyLocale(), ...prev[activeLocale], [field]: value } }));
    setSaved(false);
  };

  useEffect(() => {
    if (!isEditing || !id) return;
    postsApi
      .adminGet(id)
      .then(({ data }) => {
        setStatus(data.status);
        setFeatured(data.featured);
        setTags(data.tags.map(({ tag }) => tag.slug).join(", "));
        if (data.defaultLocale) {
          setDefaultLocale(data.defaultLocale);
          setActiveLocale(data.defaultLocale);
        }
        if (data.scheduledAt) {
          setScheduledAt(data.scheduledAt.slice(0, 16));
          setShowSchedule(true);
        }
        const map: LocaleMap = {};
        for (const tr of data.translations ?? []) {
          map[tr.locale] = {
            title:           tr.title,
            slug:            tr.slug,
            content:         tr.content,
            excerpt:         tr.excerpt         ?? "",
            metaTitle:       tr.metaTitle       ?? "",
            metaDescription: tr.metaDescription ?? "",
            ogImage:         tr.ogImage         ?? "",
          };
          slugTouched.current[tr.locale] = true;
        }
        if (Object.keys(map).length === 0) map["en"] = emptyLocale();
        setLocales(map);
        setSaved(true);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  // Focus the add-locale input when it appears
  useEffect(() => {
    if (addingLocale) addInputRef.current?.focus();
  }, [addingLocale]);

  const handleTitleChange = (value: string) => {
    setLocales((prev) => ({
      ...prev,
      [activeLocale]: {
        ...emptyLocale(), ...prev[activeLocale],
        title: value,
        slug:  slugTouched.current[activeLocale] ? prev[activeLocale]?.slug ?? "" : slugify(value),
      },
    }));
    setSaved(false);
  };

  const handleSlugChange = (value: string) => {
    slugTouched.current[activeLocale] = true;
    setCurrentField("slug", slugify(value));
  };

  const handleContentChange = useCallback((doc: TipTapDoc) => {
    setLocales((prev) => ({ ...prev, [activeLocale]: { ...emptyLocale(), ...prev[activeLocale], content: doc } }));
    setSaved(false);
  }, [activeLocale]);

  const commitAddLocale = (code: string) => {
    const normalized = code.trim().toLowerCase().slice(0, 10);
    if (!normalized || locales[normalized]) {
      setAddingLocale(false);
      setNewLocaleInput("");
      return;
    }
    setLocales((prev) => ({ ...prev, [normalized]: emptyLocale() }));
    setActiveLocale(normalized);
    setAddingLocale(false);
    setNewLocaleInput("");
    setSaved(false);
  };

  const removeLocale = (locale: string) => {
    if (locale === defaultLocale) return;
    if (Object.keys(locales).length <= 1) return;
    setLocales((prev) => {
      const next = { ...prev };
      delete next[locale];
      return next;
    });
    if (activeLocale === locale) setActiveLocale(defaultLocale);
    setSaved(false);
  };

  const save = async (overrideStatus?: PostStatus) => {
    const defaultData = locales[defaultLocale];
    if (!defaultData?.title.trim()) {
      setError(t("editor.titleRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    const translations: Record<string, TranslationPayload> = {};
    for (const loc of Object.keys(locales)) {
      const d = locales[loc];
      if (!d?.title.trim()) continue;
      translations[loc] = {
        title:           d.title.trim(),
        slug:            d.slug || slugify(d.title),
        content:         d.content as unknown as Record<string, unknown>,
        excerpt:         d.excerpt.trim()         || undefined,
        metaTitle:       d.metaTitle.trim()       || undefined,
        metaDescription: d.metaDescription.trim() || undefined,
        ogImage:         d.ogImage.trim()         || undefined,
      };
    }

    const payload = {
      defaultLocale,
      translations,
      status:      overrideStatus ?? status,
      featured,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      tags:        tags.split(",").map((s) => s.trim()).filter(Boolean),
    };

    try {
      if (isEditing && id) {
        await postsApi.update(id, payload);
      } else {
        const { data: created } = await postsApi.create(payload);
        navigate(`/admin/posts/${created.id}/edit`, { replace: true });
      }
      setStatus(overrideStatus ?? status);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("editor.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const openRevisions = async () => {
    if (!id) return;
    setShowRevisions(true);
    setRevLoading(true);
    try {
      const { data } = await revisionsApi.list(id, activeLocale);
      setRevisions(data as RevisionMeta[]);
    } catch { /* ignore */ }
    finally { setRevLoading(false); }
  };

  const handleRestore = async (revId: string) => {
    if (!id) return;
    if (!confirm(t("editor.restoreConfirm"))) return;
    setRestoring(true);
    try {
      const { data: restored } = await revisionsApi.restore(id, revId);
      const restoredTrans = restored.translations?.find((tr) => tr.locale === activeLocale);
      if (restoredTrans) {
        setLocales((prev) => ({
          ...prev,
          [activeLocale]: {
            ...emptyLocale(), ...prev[activeLocale],
            title:   restoredTrans.title,
            content: restoredTrans.content,
          },
        }));
      }
      setSaved(false);
      setShowRevisions(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <Layout admin>
        <SkeletonPageHeader />
        <SkeletonEditorForm />
      </Layout>
    );
  }

  const serpTitle = current.metaTitle.trim() || current.title.trim() || "Post title";
  const serpDesc  = current.metaDescription.trim() || current.excerpt.trim() || "No description.";
  const serpSlug  = current.slug || slugify(current.title) || "post-slug";
  const hasContent = current.title.trim().length > 0;
  const activeLocaleKeys = Object.keys(locales);

  const localeHasContent = (l: string) => (locales[l]?.title ?? "").trim().length > 0;

  // Suggestions = common locales not yet added
  const suggestions = COMMON_LOCALES.filter((l) => !locales[l]);

  return (
    <Layout admin>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-100 mr-auto">
          {isEditing ? t("editor.editPost") : t("editor.newPost")}
        </h1>

        <span className="text-xs text-slate-600 font-medium">
          {readingTimeLabel(current.content)}
        </span>

        {!saved && (
          <span className="text-xs text-amber-500 font-medium">{t("editor.unsavedChanges")}</span>
        )}

        <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
          {(["editor", "split", "preview"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={[
                "px-3 py-1.5 capitalize font-medium transition-colors",
                viewMode === mode ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200",
              ].join(" ")}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {showSchedule && (
            <input
              type="datetime-local"
              value={scheduledAt}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => { setScheduledAt(e.target.value); setSaved(false); }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs
                         text-slate-300 focus:border-brand-500 focus:outline-none"
            />
          )}
          <button
            onClick={() => { setShowSchedule((v) => !v); if (showSchedule) setScheduledAt(""); }}
            className={[
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              showSchedule
                ? "border-brand-500 text-brand-400 hover:border-brand-400"
                : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white",
            ].join(" ")}
          >
            {showSchedule ? t("editor.cancelSchedule") : t("editor.schedule")}
          </button>
        </div>

        {isEditing && (
          <button
            onClick={() => void openRevisions()}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium
                       text-slate-400 hover:border-slate-500 hover:text-white transition-colors"
          >
            {t("editor.history")}
          </button>
        )}

        <button
          onClick={() => save("DRAFT")}
          disabled={saving}
          className="rounded-lg border border-slate-700 px-4 py-1.5 text-sm font-medium
                     text-slate-300 hover:border-slate-500 hover:text-white
                     disabled:opacity-50 transition-colors"
        >
          {saving ? t("editor.saving") : t("editor.saveAsDraft")}
        </button>

        <button
          onClick={() => save("PUBLISHED")}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white
                     hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {status === "PUBLISHED" ? t("editor.update") : t("editor.publish")}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mb-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5
                      md:grid-cols-2 lg:grid-cols-4">
        <Field label={t("editor.tagsLabel")} hint={t("editor.tagsHint")} className="lg:col-span-2">
          <input
            value={tags}
            onChange={(e) => { setTags(e.target.value); setSaved(false); }}
            placeholder={t("editor.tagsPlaceholder")}
            className={inputCls + " text-slate-400"}
          />
        </Field>

        <Field label={t("editor.defaultLocale")}>
          <select
            value={defaultLocale}
            onChange={(e) => { setDefaultLocale(e.target.value); setSaved(false); }}
            className={inputCls}
          >
            {activeLocaleKeys.map((l) => (
              <option key={l} value={l}>
                {getLocaleFlag(l)} {l.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("editor.featuredLabel")}>
          <div className="flex items-center gap-3 h-[38px]">
            <button
              type="button"
              onClick={() => { setFeatured((f) => !f); setSaved(false); }}
              className={[
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
                "transition-colors duration-200 focus:outline-none",
                featured ? "bg-brand-600" : "bg-slate-700",
              ].join(" ")}
              role="switch"
              aria-checked={featured}
            >
              <span className={[
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow",
                "transform transition-transform duration-200",
                featured ? "translate-x-5" : "translate-x-0",
              ].join(" ")} />
            </button>
            <span className="text-sm text-slate-400">
              {featured ? t("editor.featuredOn") : t("editor.featuredOff")}
            </span>
          </div>
        </Field>
      </div>

      <div className="mb-0 flex items-end gap-1 flex-wrap">
        {activeLocaleKeys.map((locale) => {
          const isActive  = activeLocale === locale;
          const hasFilled = localeHasContent(locale);
          const isDefault = defaultLocale === locale;
          const canRemove = !isDefault && activeLocaleKeys.length > 1;
          return (
            <button
              key={locale}
              onClick={() => setActiveLocale(locale)}
              className={[
                "group relative flex items-center gap-1.5 rounded-t-lg border-l border-r border-t px-3 py-2",
                "font-mono text-xs font-bold tracking-wider transition-all duration-200",
                isActive
                  ? [
                      "border-brand-500/60 bg-slate-900/60 text-brand-300",
                      "shadow-[0_-2px_12px_var(--color-primary)_/_0.25]",
                      "after:absolute after:inset-x-0 after:bottom-[-1px] after:h-px after:bg-slate-900",
                    ].join(" ")
                  : "border-slate-700/50 bg-slate-950 text-slate-500 hover:text-slate-300 hover:border-slate-600",
              ].join(" ")}
            >
              <span className="text-[13px] leading-none">{getLocaleFlag(locale)}</span>
              <span>{locale.toUpperCase()}</span>
              {isDefault && (
                <span
                  title="Default locale"
                  className={["text-[9px] leading-none", isActive ? "text-brand-400" : "text-slate-600"].join(" ")}
                >
                  ★
                </span>
              )}
              {!hasFilled && (
                <span
                  title="Translation missing"
                  className={["h-1.5 w-1.5 rounded-full", isActive ? "bg-amber-400" : "bg-amber-600"].join(" ")}
                />
              )}
              {canRemove && (
                <span
                  role="button"
                  title={`Remove ${locale.toUpperCase()} translation`}
                  onClick={(e) => { e.stopPropagation(); removeLocale(locale); }}
                  className={[
                    "ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px]",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    isActive
                      ? "bg-brand-800 text-brand-300 hover:bg-red-800 hover:text-red-300"
                      : "bg-slate-800 text-slate-500 hover:bg-red-900 hover:text-red-400",
                  ].join(" ")}
                >
                  ✕
                </span>
              )}
            </button>
          );
        })}

        {addingLocale ? (
          <div className="relative flex items-end gap-1 rounded-t-lg border-l border-r border-t
                          border-slate-700/50 bg-slate-950 px-3 py-2">
            <input
              ref={addInputRef}
              value={newLocaleInput}
              onChange={(e) => setNewLocaleInput(e.target.value.slice(0, 10))}
              onKeyDown={(e) => {
                if (e.key === "Enter")  commitAddLocale(newLocaleInput);
                if (e.key === "Escape") { setAddingLocale(false); setNewLocaleInput(""); }
              }}
              placeholder="e.g. es"
              className="w-20 bg-transparent font-mono text-xs text-slate-300 placeholder-slate-700
                         focus:outline-none uppercase"
            />
            <button
              onClick={() => commitAddLocale(newLocaleInput)}
              className="text-[10px] text-brand-400 hover:text-brand-300"
            >✓</button>
            <button
              onClick={() => { setAddingLocale(false); setNewLocaleInput(""); }}
              className="text-[10px] text-slate-600 hover:text-slate-400"
            >✕</button>
            {/* Quick suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 top-full z-20 mt-1 flex flex-wrap gap-1
                              rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl min-w-[180px]">
                {suggestions.slice(0, 8).map((s) => (
                  <button
                    key={s}
                    onClick={() => commitAddLocale(s)}
                    className="flex items-center gap-1 rounded-md border border-slate-700
                               bg-slate-800 px-2 py-1 font-mono text-[10px] font-bold text-slate-400
                               hover:border-brand-600 hover:text-brand-300 transition-colors"
                  >
                    <span>{getLocaleFlag(s)}</span>
                    <span>{s.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setAddingLocale(true)}
            title="Add a translation"
            className="flex items-center gap-1 rounded-t-lg border-l border-r border-t
                       border-slate-700/50 bg-slate-950 px-3 py-2 text-xs text-slate-600
                       hover:border-slate-600 hover:text-slate-300 transition-all"
          >
            <span className="text-base leading-none">+</span>
          </button>
        )}
      </div>

      <div className="mb-4 rounded-b-xl rounded-tr-xl border border-slate-800 bg-slate-900/60 p-5">
        {!hasContent && activeLocale !== defaultLocale && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-800/50
                          bg-amber-900/20 px-4 py-2.5 text-xs text-amber-400">
            <span>⚠</span>
            <span>
              {t("editor.translationMissing")}{" "}
              <span className="font-mono font-bold">{defaultLocale.toUpperCase()}</span>.
            </span>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Field label={t("editor.titleLabel")} className="lg:col-span-2">
            <input
              value={current.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={t("editor.titlePlaceholder")}
              className={inputCls}
            />
          </Field>

          <Field label={t("editor.slugLabel")}>
            <input
              value={current.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder={t("editor.slugPlaceholder")}
              className={inputCls + " font-mono text-slate-400"}
            />
          </Field>

          <Field label={t("editor.excerptLabel")} className="lg:col-span-4">
            <textarea
              value={current.excerpt}
              onChange={(e) => setCurrentField("excerpt", e.target.value)}
              rows={2}
              placeholder={t("editor.excerptPlaceholder")}
              className={inputCls + " resize-none text-slate-400"}
            />
          </Field>
        </div>

        <div className="mt-3">
          <Collapsible title={t("editor.seoSection")}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <Field
                  label={t("editor.metaTitleLabel")}
                  hint={`${current.metaTitle.length}/255 — ${t("editor.metaTitleHint")}`}
                >
                  <input
                    value={current.metaTitle}
                    onChange={(e) => setCurrentField("metaTitle", e.target.value.slice(0, 255))}
                    placeholder={current.title || "Post title"}
                    className={inputCls}
                  />
                </Field>

                <Field
                  label={t("editor.metaDescLabel")}
                  hint={`${current.metaDescription.length}/500 — ${t("editor.metaDescHint")}`}
                >
                  <textarea
                    value={current.metaDescription}
                    onChange={(e) => setCurrentField("metaDescription", e.target.value.slice(0, 500))}
                    rows={3}
                    placeholder={current.excerpt || "Brief description for search engines…"}
                    className={inputCls + " resize-none"}
                  />
                </Field>

                <Field label={t("editor.ogImageLabel")} hint={t("editor.ogImageHint")}>
                  <input
                    value={current.ogImage}
                    onChange={(e) => setCurrentField("ogImage", e.target.value)}
                    placeholder="https://…"
                    className={inputCls + " font-mono text-slate-400"}
                  />
                </Field>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                  {t("editor.serpPreview")}
                </p>
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 space-y-1">
                  <div className="text-xs text-green-600 font-mono truncate">
                    chronos-cms.example.com/{activeLocale}/posts/{serpSlug}
                  </div>
                  <div className="text-base text-blue-400 line-clamp-1 font-medium">{serpTitle}</div>
                  <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{serpDesc}</div>
                </div>

                {/* hreflang note */}
                <p className="mt-2 text-[10px] text-slate-600 leading-relaxed">
                  <span className="font-mono text-slate-500">hreflang</span> links will be generated
                  for each filled locale translation.
                </p>

                {current.ogImage && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                      {t("editor.ogPreview")}
                    </p>
                    <img
                      src={current.ogImage}
                      alt="OG preview"
                      className="w-full rounded-lg border border-slate-700 object-cover max-h-40"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
              </div>
            </div>
          </Collapsible>
        </div>
      </div>

      {showRevisions && (
        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/80">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("editor.revisionsTitle")}
              <span className="ml-2 font-mono text-brand-400">[{activeLocale.toUpperCase()}]</span>
            </h2>
            <button onClick={() => setShowRevisions(false)} className="text-slate-600 hover:text-slate-300 text-sm">✕</button>
          </div>
          {revLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : revisions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">{t("editor.noRevisions")}</p>
          ) : (
            <ul className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
              {revisions.map((rev) => (
                <li key={rev.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-900 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{rev.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(rev.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                      {" · "}{rev.user.name ?? rev.user.email}
                    </p>
                  </div>
                  <button
                    onClick={() => void handleRestore(rev.id)}
                    disabled={restoring}
                    className="shrink-0 rounded-md border border-slate-700 px-3 py-1 text-xs
                               text-slate-400 hover:border-slate-500 hover:text-white
                               disabled:opacity-50 transition-colors"
                  >
                    {restoring ? t("editor.restoring") : t("editor.restore")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={["gap-6", viewMode === "split" ? "grid md:grid-cols-2" : "flex flex-col"].join(" ")}>
        {(viewMode === "editor" || viewMode === "split") && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden flex flex-col">
            <RichTextEditor
              key={activeLocale}
              content={current.content}
              onChange={handleContentChange}
              placeholder={t("editor.contentPlaceholder")}
              className="min-h-[60vh]"
            />
          </div>
        )}

        {(viewMode === "preview" || viewMode === "split") && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-600">
              {t("editor.previewLabel")}
            </p>
            {current.title && (
              <h1 className="mb-2 text-3xl font-bold text-slate-50">{current.title}</h1>
            )}
            {featured && (
              <span className="mb-4 inline-block text-xs font-semibold text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full">
                ★ {t("editor.featuredOn")}
              </span>
            )}
            <PostRenderer doc={current.content} />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PostEditorPage;
