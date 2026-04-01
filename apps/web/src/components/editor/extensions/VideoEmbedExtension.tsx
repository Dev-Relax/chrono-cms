import React, { useState } from "react"
import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"

/** Convert a public watch/share URL to an embeddable URL. Returns null if unrecognised. */
export const toEmbedUrl = (url: string): string | null => {
  if (!url) return null

  // youtube.com/watch?v=ID or youtu.be/ID
  const ytFull = url.match(/youtube\.com\/watch\?.*v=([A-Za-z0-9_-]{11})/)
  const ytShort = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
  const ytId = ytFull?.[1] ?? ytShort?.[1]
  if (ytId) return `https://www.youtube.com/embed/${ytId}`

  // vimeo.com/ID
  const vmMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`

  // Already an embed URL — accept as-is
  if (url.includes("youtube.com/embed/") || url.includes("player.vimeo.com/video/")) return url

  return null
}

const VideoEmbedView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const src = (node.attrs["src"] as string | undefined) ?? ""
  const embedUrl = toEmbedUrl(src)
  const [editing, setEditing] = useState(!embedUrl)
  const [input, setInput] = useState(src)

  const commit = () => {
    const trimmed = input.trim()
    if (trimmed) {
      updateAttributes({ src: trimmed })
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <NodeViewWrapper>
        <div className="my-4 rounded-lg border border-slate-600 bg-slate-800/70 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            YouTube or Vimeo URL
          </p>
          <div className="flex gap-2">
            <input
              autoFocus
              type="url"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  commit()
                }
                if (e.key === "Escape") {
                  if (src) setEditing(false)
                  else deleteNode()
                }
              }}
              placeholder="https://www.youtube.com/watch?v=…"
              className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm
                         text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                commit()
              }}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Embed
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                if (src) setEditing(false)
                else deleteNode()
              }}
              className="rounded-lg px-2 py-2 text-sm text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper>
      <div
        className={[
          "relative my-4 rounded-lg overflow-hidden",
          selected ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-slate-900" : "",
        ].join(" ")}
      >
        {/* 16:9 aspect ratio wrapper */}
        <div className="aspect-video w-full" contentEditable={false}>
          <iframe
            src={embedUrl ?? ""}
            title="Embedded video"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Controls shown when selected */}
        {selected && (
          <div contentEditable={false} className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                setInput(src)
                setEditing(true)
              }}
              className="rounded bg-black/60 px-2 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm hover:text-white"
            >
              Edit URL
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                deleteNode()
              }}
              className="rounded bg-black/60 px-2 py-1 text-xs font-medium text-red-400 backdrop-blur-sm hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const VideoEmbedExtension = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: "" },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-video-embed]" }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-video-embed": node.attrs["src"] as string,
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoEmbedView)
  },
})
