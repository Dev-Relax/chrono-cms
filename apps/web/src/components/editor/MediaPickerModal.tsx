import React, { useEffect, useRef, useState } from "react"
import { mediaApi, resolveMediaUrl } from "../../lib/api.js"
import type { MediaFile } from "../../types/index.js"

export type ImageSelection = {
  kind: "image"
  url: string
  alt: string
  caption: string
}

export type FileSelection = {
  kind: "file"
  url: string
  filename: string
  size: number
  mimeType: string
}

type Props = {
  /** Called when the user confirms an image selection. */
  onSelectImage?: (sel: ImageSelection) => void
  /** Called when the user confirms a file selection. */
  onSelectFile?: (sel: FileSelection) => void
  /** Legacy: called with resolved URL only (image mode) */
  onSelect?: (url: string) => void
  onClose: () => void
  /** If true, only show image tabs (default: both) */
  imagesOnly?: boolean
}

type Tab = "library" | "files" | "url"

const isImage = (f: MediaFile) =>
  f.mimeType?.startsWith("image/") || /\.(webp|jpg|jpeg|png|gif|svg|avif)$/i.test(f.filename)

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const fileIcon = (mimeType = ""): string => {
  if (mimeType.includes("pdf")) return "📄"
  if (mimeType.includes("zip") || mimeType.includes("compress")) return "🗜"
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝"
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊"
  if (mimeType.includes("presentation")) return "📑"
  return "📎"
}

export const MediaPickerModal: React.FC<Props> = ({
  onSelectImage,
  onSelectFile,
  onSelect,
  onClose,
  imagesOnly = false,
}) => {
  const [tab, setTab] = useState<Tab>("library")
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState("https://")
  const [alt, setAlt] = useState("")
  const [caption, setCaption] = useState("")
  const [selected, setSelected] = useState<MediaFile | null>(null)
  const [imageAlt, setImageAlt] = useState("")
  const [imageCap, setImageCap] = useState("")
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    mediaApi
      .list()
      .then(({ data }) => setFiles(data))
      .catch(() => {
        /* show empty state */
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === "url") urlRef.current?.focus()
  }, [tab])

  const confirmImage = (rawUrl: string, altText: string, cap: string) => {
    const resolved = resolveMediaUrl(rawUrl)
    if (onSelectImage)
      onSelectImage({
        kind: "image",
        url: resolved,
        alt: altText,
        caption: cap,
      })
    else if (onSelect) onSelect(resolved)
    onClose()
  }

  const confirmFile = (f: MediaFile) => {
    const resolved = resolveMediaUrl(f.url)
    if (onSelectFile) {
      onSelectFile({
        kind: "file",
        url: resolved,
        filename: f.originalName ?? f.filename,
        size: f.size,
        mimeType: f.mimeType ?? "application/octet-stream",
      })
    }
    onClose()
  }

  const handleUrlSubmit = () => {
    if (url.trim() && url !== "https://") confirmImage(url.trim(), alt, caption)
  }

  const pickImage = (f: MediaFile) => {
    if (onSelectImage) {
      // Show alt/caption form before confirming
      setSelected(f)
      setImageAlt("")
      setImageCap("")
    } else {
      confirmImage(f.url, "", "")
    }
  }

  const confirmSelected = () => {
    if (!selected) return
    confirmImage(selected.url, imageAlt, imageCap)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "library", label: "Images" },
    ...(!imagesOnly ? [{ id: "files" as Tab, label: "Files" }] : []),
    { id: "url", label: "External URL" },
  ]

  const imageFiles = files.filter(isImage)
  const docFiles = files.filter((f) => !isImage(f))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-200">Insert Media</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-slate-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id)
                setSelected(null)
              }}
              className={[
                "px-5 py-2.5 text-xs font-semibold transition-colors",
                tab === t.id
                  ? "border-b-2 border-brand-500 text-brand-400"
                  : "text-slate-500 hover:text-slate-300",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-[240px] max-h-[460px] overflow-y-auto p-5">
          {tab === "library" &&
            (selected ? (
              /* Alt text + caption step */
              <div className="space-y-4 pt-1">
                <div className="flex gap-4">
                  <img
                    src={resolveMediaUrl(selected.url)}
                    alt=""
                    className="h-24 w-24 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                        Alt text{" "}
                        <span className="normal-case text-slate-600">
                          (recommended for SEO & accessibility)
                        </span>
                      </label>
                      <input
                        autoFocus
                        type="text"
                        value={imageAlt}
                        onChange={(e) => setImageAlt(e.target.value)}
                        placeholder="Describe the image…"
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2
                                   text-sm text-slate-100 placeholder-slate-600
                                   focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                        Caption{" "}
                        <span className="normal-case text-slate-600">
                          (optional, shown below image)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={imageCap}
                        onChange={(e) => setImageCap(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmSelected()
                        }}
                        placeholder="Photo by…"
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2
                                   text-sm text-slate-100 placeholder-slate-600
                                   focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={confirmSelected}
                    className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                  >
                    Insert Image
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : imageFiles.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">
                No images uploaded yet. Use the Media Library to upload some.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {imageFiles.map((file) => (
                  <button
                    key={file.filename}
                    type="button"
                    onClick={() => pickImage(file)}
                    className="group relative aspect-square overflow-hidden rounded-lg
                               border border-slate-700 hover:border-brand-500 transition-colors"
                    title={file.originalName ?? file.filename}
                  >
                    <img
                      src={resolveMediaUrl(file.url)}
                      alt={file.filename}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center
                                    bg-brand-600/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="rounded bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                        Select
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ))}

          {tab === "files" &&
            (loading ? (
              <div className="flex justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : docFiles.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">No files uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {docFiles.map((file) => (
                  <button
                    key={file.filename}
                    type="button"
                    onClick={() => confirmFile(file)}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-700
                               bg-slate-800/50 px-4 py-3 text-left hover:border-brand-500 transition-colors"
                  >
                    <span className="text-xl shrink-0">{fileIcon(file.mimeType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {file.originalName ?? file.filename}
                      </p>
                      <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                    </div>
                    <span className="text-xs text-brand-400 shrink-0">Insert →</span>
                  </button>
                ))}
              </div>
            ))}

          {tab === "url" && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Image URL
                </label>
                <input
                  ref={urlRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUrlSubmit()
                    if (e.key === "Escape") onClose()
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2
                             text-sm text-slate-100 placeholder-slate-600
                             focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Alt text <span className="normal-case text-slate-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="Describe the image…"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2
                             text-sm text-slate-100 placeholder-slate-600
                             focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Caption <span className="normal-case text-slate-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUrlSubmit()
                  }}
                  placeholder="Photo by…"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2
                             text-sm text-slate-100 placeholder-slate-600
                             focus:border-brand-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleUrlSubmit}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white
                           hover:bg-brand-700 transition-colors"
              >
                Insert
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
