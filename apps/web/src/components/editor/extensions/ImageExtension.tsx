import React, { useRef, useState, useCallback } from "react"
import Image from "@tiptap/extension-image"
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"

type Align = "none" | "left" | "right" | "center"

const Btn: React.FC<{
  active?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}> = ({ active, title, onClick, children }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => {
      e.preventDefault()
      onClick()
    }}
    style={{
      padding: "2px 6px",
      fontSize: 12,
      fontWeight: active ? 700 : 400,
      color: active ? "#a5b4fc" : "#94a3b8",
      background: active ? "rgba(99,102,241,0.15)" : "transparent",
      border: "none",
      borderRadius: 4,
      cursor: "pointer",
      lineHeight: 1.4,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </button>
)

const ResizeHandle: React.FC<{
  cursor: string
  style: React.CSSProperties
  onResizeStart: (e: React.MouseEvent, dir: "e" | "se") => void
  dir: "e" | "se"
}> = ({ cursor, style, onResizeStart, dir }) => (
  <div
    onMouseDown={(e) => onResizeStart(e, dir)}
    style={{
      position: "absolute",
      width: dir === "se" ? 12 : 8,
      height: dir === "se" ? 12 : 24,
      background: "#6366f1",
      borderRadius: dir === "se" ? "2px 0 4px 0" : 4,
      cursor,
      zIndex: 10,
      ...style,
    }}
  />
)

const ResizableImageView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  deleteNode,
}) => {
  const attrs = node.attrs as {
    src: string
    alt?: string
    title?: string
    width?: number | null
    align?: Align
    caption?: string
  }
  const { src, alt = "", title, width = null, align = "none", caption = "" } = attrs

  const imgRef = useRef<HTMLImageElement>(null)
  const [resizing, setResizing] = useState(false)
  const [editCaption, setEditCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(caption)

  const wrapperStyle: React.CSSProperties = (() => {
    const w = width ? `${width}px` : undefined
    switch (align) {
      case "left":
        return {
          float: "left",
          display: "inline-block",
          width: w ?? "auto",
          maxWidth: "60%",
          marginRight: "1rem",
          marginBottom: "0.5rem",
        }
      case "right":
        return {
          float: "right",
          display: "inline-block",
          width: w ?? "auto",
          maxWidth: "60%",
          marginLeft: "1rem",
          marginBottom: "0.5rem",
        }
      case "center":
        return {
          display: "block",
          width: w ?? "auto",
          maxWidth: "100%",
          marginLeft: "auto",
          marginRight: "auto",
        }
      default:
        return { display: "block", width: w ?? "100%" }
    }
  })()

  const startResize = useCallback(
    (e: React.MouseEvent, _dir: "e" | "se") => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startWidth = imgRef.current?.offsetWidth ?? width ?? 200
      setResizing(true)

      const onMove = (ev: MouseEvent) => {
        const newWidth = Math.max(48, Math.round(startWidth + (ev.clientX - startX)))
        updateAttributes({ width: newWidth })
      }
      const onUp = () => {
        setResizing(false)
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [width, updateAttributes],
  )

  const setWidthPct = useCallback(
    (pct: number) => {
      const container = imgRef.current?.closest("[data-node-view-wrapper]")?.parentElement
      const containerW = container?.offsetWidth ?? 600
      updateAttributes({ width: Math.round((containerW * pct) / 100) })
    },
    [updateAttributes],
  )

  const Toolbar = (
    <div
      contentEditable={false}
      style={{
        position: "absolute",
        top: -42,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 2,
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 6,
        padding: "3px 5px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        whiteSpace: "nowrap",
      }}
    >
      {/* Alignment */}
      <Btn
        active={align === "left"}
        title="Float left"
        onClick={() => updateAttributes({ align: "left" })}
      >
        ⇤ Left
      </Btn>
      <Btn
        active={align === "center"}
        title="Center"
        onClick={() => updateAttributes({ align: "center" })}
      >
        ⇔ Center
      </Btn>
      <Btn
        active={align === "right"}
        title="Float right"
        onClick={() => updateAttributes({ align: "right" })}
      >
        Right ⇥
      </Btn>
      <Btn
        active={align === "none"}
        title="Block (full)"
        onClick={() => updateAttributes({ align: "none" })}
      >
        ⊡ Block
      </Btn>

      <div style={{ width: 1, height: 16, background: "#334155", margin: "0 4px" }} />

      {/* Width presets */}
      {([25, 33, 50, 75, 100] as const).map((p) => (
        <Btn key={p} title={`Set width to ${p}%`} onClick={() => setWidthPct(p)}>
          {p}%
        </Btn>
      ))}
      {width && (
        <Btn title="Reset to natural size" onClick={() => updateAttributes({ width: null })}>
          ↺
        </Btn>
      )}

      <div style={{ width: 1, height: 16, background: "#334155", margin: "0 4px" }} />

      {/* Caption toggle */}
      <Btn
        active={!!caption}
        title={caption ? "Edit caption" : "Add caption"}
        onClick={() => {
          setCaptionDraft(caption)
          setEditCaption(true)
        }}
      >
        🖊 Caption
      </Btn>

      <div style={{ width: 1, height: 16, background: "#334155", margin: "0 4px" }} />

      {/* Delete */}
      <Btn title="Remove image" onClick={() => deleteNode()}>
        <span style={{ color: "#f87171" }}>✕</span>
      </Btn>
    </div>
  )

  const CaptionEditor = editCaption && (
    <div
      contentEditable={false}
      style={{
        position: "absolute",
        bottom: caption ? -68 : -58,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 8,
        padding: "8px 10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        display: "flex",
        gap: 6,
        minWidth: 280,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        type="text"
        value={captionDraft}
        onChange={(e) => setCaptionDraft(e.target.value)}
        placeholder="Image caption…"
        style={{
          flex: 1,
          background: "#1e293b",
          border: "1px solid #475569",
          borderRadius: 4,
          padding: "4px 8px",
          fontSize: 12,
          color: "#e2e8f0",
          outline: "none",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            updateAttributes({ caption: captionDraft })
            setEditCaption(false)
          }
          if (e.key === "Escape") setEditCaption(false)
        }}
      />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault()
          updateAttributes({ caption: captionDraft })
          setEditCaption(false)
        }}
        style={{
          background: "#6366f1",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "4px 10px",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Save
      </button>
      {caption && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            updateAttributes({ caption: "" })
            setEditCaption(false)
          }}
          style={{
            background: "transparent",
            color: "#94a3b8",
            border: "none",
            borderRadius: 4,
            padding: "4px 8px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Remove
        </button>
      )}
    </div>
  )

  return (
    <NodeViewWrapper style={wrapperStyle} as="figure" data-image-align={align}>
      <div
        style={{
          position: "relative",
          display: "inline-block",
          width: "100%",
          lineHeight: 0,
          userSelect: "none",
        }}
      >
        {selected && !resizing && Toolbar}
        {CaptionEditor}

        <img
          ref={imgRef}
          src={src}
          alt={alt}
          title={title ?? undefined}
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            borderRadius: 4,
            outline: selected ? "2px solid #6366f1" : "2px solid transparent",
            outlineOffset: 2,
            transition: "outline 0.1s",
            cursor: "default",
          }}
        />

        {/* Resize handles */}
        {selected && (
          <>
            <ResizeHandle
              dir="se"
              cursor="se-resize"
              style={{ bottom: 0, right: 0 }}
              onResizeStart={startResize}
            />
            <ResizeHandle
              dir="e"
              cursor="e-resize"
              style={{ right: 0, top: "50%", transform: "translateY(-50%)" }}
              onResizeStart={startResize}
            />
          </>
        )}

        {/* Width label while resizing */}
        {resizing && width && (
          <div
            contentEditable={false}
            style={{
              position: "absolute",
              bottom: 4,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.7)",
              color: "#e2e8f0",
              fontSize: 11,
              padding: "1px 6px",
              borderRadius: 4,
              pointerEvents: "none",
            }}
          >
            {width}px
          </div>
        )}
      </div>

      {/* Caption */}
      {caption && (
        <figcaption
          contentEditable={false}
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#64748b",
            marginTop: 6,
            lineHeight: 1.4,
            fontStyle: "italic",
          }}
        >
          {caption}
        </figcaption>
      )}
    </NodeViewWrapper>
  )
}

export const ImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "none",
        parseHTML: (el) => (el.getAttribute("data-align") ?? "none") as Align,
        renderHTML: (attrs) =>
          attrs["align"] && attrs["align"] !== "none" ? { "data-align": attrs["align"] } : {},
      },
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute("width") ?? el.style.width
          const n = parseInt(w ?? "", 10)
          return isNaN(n) ? null : n
        },
        renderHTML: (attrs) => (attrs["width"] ? { width: String(attrs["width"]) } : {}),
      },
      caption: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-caption") ?? "",
        renderHTML: (attrs) =>
          attrs["caption"] ? { "data-caption": attrs["caption"] as string } : {},
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
