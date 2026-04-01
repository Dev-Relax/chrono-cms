import React, { useCallback, useEffect, useRef, useState } from "react"
import { mediaApi, resolveMediaUrl } from "../../lib/api.js"
import type { MediaFile } from "../../types/index.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonImageGrid } from "../../components/common/Skeleton.js"

const fmt = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const isImage = (f: MediaFile): boolean => {
  const mime = f.mimeType ?? ""
  if (mime.startsWith("image/")) return true
  // Fall back to extension check when mimeType is absent
  return /\.(webp|png|jpe?g|gif|svg|avif)$/i.test(f.filename)
}

const fileIcon = (mime = ""): string => {
  if (mime.includes("pdf")) return "📄"
  if (mime.includes("zip") || mime.includes("compress")) return "🗜"
  if (mime.includes("word") || mime.includes("document")) return "📝"
  if (mime.includes("sheet") || mime.includes("excel")) return "📊"
  if (mime.includes("presentation")) return "📑"
  if (mime.includes("text/")) return "📃"
  return "📎"
}

const extLabel = (f: MediaFile): string => {
  const mime = f.mimeType ?? ""
  if (mime) {
    const sub = mime.split("/")[1] ?? ""
    const clean =
      sub
        .replace(/^vnd\.[^.]+\./, "")
        .replace(/^x-/, "")
        .split(".")
        .pop() ?? sub
    if (clean.length <= 10) return clean.toUpperCase()
  }
  const ext = f.filename.split(".").pop() ?? ""
  return ext.toUpperCase()
}

type Tab = "all" | "images" | "files"

const MediaLibrary: React.FC = () => {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [tab, setTab] = useState<Tab>("all")
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = useCallback(() => {
    setLoading(true)
    mediaApi
      .list()
      .then(({ data }) => setFiles(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const upload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      await mediaApi.upload(file)
      fetchFiles()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return
    for (const file of Array.from(fileList)) void upload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return
    try {
      await mediaApi.delete(filename)
      setFiles((prev) => prev.filter((f) => f.filename !== filename))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const copyUrl = (url: string) => {
    void navigator.clipboard.writeText(resolveMediaUrl(url)).then(() => {
      setCopied(url)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const images = files.filter(isImage)
  const docs = files.filter((f) => !isImage(f))

  const tabFiles: MediaFile[] = tab === "images" ? images : tab === "files" ? docs : files

  const tabImages = tabFiles.filter(isImage)
  const tabDocs = tabFiles.filter((f) => !isImage(f))

  return (
    <Layout admin>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-50">Media Library</h1>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white
                     hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? "Uploading…" : "Upload file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "mb-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors",
          dragging ? "border-brand-500 bg-brand-900/20" : "border-slate-700 hover:border-slate-600",
        ].join(" ")}
      >
        <span className="text-2xl text-slate-600">↑</span>
        <p className="text-sm text-slate-500">
          Drag & drop files here, or <span className="text-brand-400">click to browse</span>
        </p>
        <p className="text-xs text-slate-600">
          Images (PNG, JPG, WebP, SVG) · Documents (PDF, DOCX, XLSX, ZIP…)
        </p>
      </div>

      <div className="mb-5 flex items-center gap-1 border-b border-slate-800 pb-0">
        {(["all", "images", "files"] as Tab[]).map((t) => {
          const count = t === "all" ? files.length : t === "images" ? images.length : docs.length
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "relative -mb-px px-4 py-2 text-sm font-medium transition-colors capitalize",
                tab === t
                  ? "border-b-2 border-brand-500 text-brand-400"
                  : "text-slate-500 hover:text-slate-300",
              ].join(" ")}
            >
              {t}
              <span className="ml-1.5 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {loading && <SkeletonImageGrid count={10} />}

      {!loading && tabFiles.length === 0 && (
        <p className="text-center text-slate-500 py-10">No files yet.</p>
      )}

      {tabImages.length > 0 && (
        <div className="mb-8">
          {tab === "all" && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-600">
              Images
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tabImages.map((file) => (
              <ImageCard
                key={file.filename}
                file={file}
                copied={copied}
                onCopy={copyUrl}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {tabDocs.length > 0 && (
        <div>
          {tab === "all" && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-600">
              Files
            </p>
          )}
          <div className="flex flex-col gap-2">
            {tabDocs.map((file) => (
              <FileRow
                key={file.filename}
                file={file}
                copied={copied}
                onCopy={copyUrl}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}
    </Layout>
  )
}

type CardProps = {
  file: MediaFile
  copied: string | null
  onCopy: (url: string) => void
  onDelete: (name: string) => void
}

const ImageCard: React.FC<CardProps> = ({ file, copied, onCopy, onDelete }) => {
  const url = resolveMediaUrl(file.url)
  const isCopied = copied === file.url

  return (
    <div className="group relative rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
      <img
        src={url}
        alt={file.originalName ?? file.filename}
        className="h-32 w-full object-cover"
        loading="lazy"
      />
      <div
        className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-slate-950/90
                      to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 gap-1"
      >
        <p className="text-xs text-slate-300 truncate" title={file.originalName ?? file.filename}>
          {file.originalName ?? file.filename}
        </p>
        {file.size > 0 && <p className="text-xs text-slate-500">{fmt(file.size)}</p>}
        <div className="flex gap-1.5 mt-1">
          <button
            onClick={() => onCopy(file.url)}
            className="flex-1 rounded-md bg-slate-700 px-2 py-1 text-xs font-medium
                       text-slate-200 hover:bg-slate-600 transition-colors"
          >
            {isCopied ? "Copied!" : "Copy URL"}
          </button>
          <button
            onClick={() => onDelete(file.filename)}
            className="rounded-md bg-red-900/40 px-2 py-1 text-xs font-medium
                       text-red-400 hover:bg-red-900/70 transition-colors"
          >
            Del
          </button>
        </div>
      </div>
    </div>
  )
}

const FileRow: React.FC<CardProps> = ({ file, copied, onCopy, onDelete }) => {
  const isCopied = copied === file.url
  const mime = file.mimeType ?? ""
  const date = file.uploadedAt
    ? new Date(file.uploadedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : ""

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3
                    hover:border-slate-700 transition-colors"
    >
      <span className="text-2xl shrink-0">{fileIcon(mime)}</span>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium text-slate-200 truncate"
          title={file.originalName ?? file.filename}
        >
          {file.originalName ?? file.filename}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            {extLabel(file)}
          </span>
          {file.size > 0 && <span className="text-xs text-slate-600">{fmt(file.size)}</span>}
          {date && <span className="text-xs text-slate-600">{date}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={resolveMediaUrl(file.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium
                     text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-colors"
        >
          ↓ Open
        </a>
        <button
          onClick={() => onCopy(file.url)}
          className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium
                     text-slate-400 hover:border-brand-500 hover:text-brand-400 transition-colors"
        >
          {isCopied ? "Copied!" : "Copy URL"}
        </button>
        <button
          onClick={() => onDelete(file.filename)}
          className="rounded-md bg-red-900/30 px-2.5 py-1 text-xs font-medium
                     text-red-500 hover:bg-red-900/60 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default MediaLibrary
