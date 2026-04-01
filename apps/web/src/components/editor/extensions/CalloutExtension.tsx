import React from "react"
import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"

export type CalloutType = "info" | "warning" | "danger" | "tip"

const STYLES: Record<
  CalloutType,
  { bg: string; border: string; icon: string; label: string; iconColor: string }
> = {
  info: {
    bg: "bg-blue-950/40",
    border: "border-blue-500",
    icon: "ℹ",
    iconColor: "text-blue-400",
    label: "Info",
  },
  warning: {
    bg: "bg-yellow-950/40",
    border: "border-yellow-500",
    icon: "⚠",
    iconColor: "text-yellow-400",
    label: "Warning",
  },
  danger: {
    bg: "bg-red-950/40",
    border: "border-red-500",
    icon: "✕",
    iconColor: "text-red-400",
    label: "Danger",
  },
  tip: {
    bg: "bg-emerald-950/40",
    border: "border-emerald-500",
    icon: "✓",
    iconColor: "text-emerald-400",
    label: "Tip",
  },
}

const CalloutView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
  const calloutType = (node.attrs["calloutType"] as CalloutType) ?? "info"
  const { bg, border, icon, iconColor } = STYLES[calloutType]

  return (
    <NodeViewWrapper>
      <div className={`relative rounded-lg border-l-4 px-4 pt-3 pb-3 my-4 ${bg} ${border}`}>
        {/* Type switcher — only when the node is selected */}
        {selected && (
          <div contentEditable={false} className="absolute -top-3 right-2 flex gap-1 z-10">
            {(Object.keys(STYLES) as CalloutType[]).map((t) => (
              <button
                key={t}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  updateAttributes({ calloutType: t })
                }}
                className={[
                  "px-2 py-0.5 text-xs rounded font-semibold transition-colors",
                  calloutType === t
                    ? "bg-brand-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600",
                ].join(" ")}
              >
                {STYLES[t].label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2.5">
          <span
            contentEditable={false}
            className={`text-base shrink-0 mt-0.5 select-none ${iconColor}`}
          >
            {icon}
          </span>
          <NodeViewContent className="flex-1 min-w-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const CalloutExtension = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      calloutType: {
        default: "info",
        parseHTML: (el) => (el.getAttribute("data-callout-type") ?? "info") as CalloutType,
        renderHTML: (attrs) => ({
          "data-callout-type": attrs["calloutType"] as string,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-callout-type]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "callout" }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView)
  },

  addCommands() {
    return {
      insertCallout:
        (calloutType: CalloutType = "info") =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: any) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (commands as any).insertContent({
            type: "callout",
            attrs: { calloutType },
            content: [{ type: "paragraph" }],
          }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  },
})
