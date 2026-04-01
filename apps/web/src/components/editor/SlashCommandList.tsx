import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import type { Editor } from "@tiptap/react"

export type SlashCommand = {
  title: string
  group: string
  icon: string
  shortcut: string
  command: (editor: Editor) => void
}

export const buildCommands = (editor: Editor): SlashCommand[] => [
  {
    title: "Paragraph",
    group: "Text",
    icon: "¶",
    shortcut: "p",
    command: (e) => e.chain().focus().clearNodes().setParagraph().run(),
  },
  {
    title: "Heading 1",
    group: "Text",
    icon: "H1",
    shortcut: "h1",
    command: (e) => e.chain().focus().clearNodes().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    group: "Text",
    icon: "H2",
    shortcut: "h2",
    command: (e) => e.chain().focus().clearNodes().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    group: "Text",
    icon: "H3",
    shortcut: "h3",
    command: (e) => e.chain().focus().clearNodes().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    group: "Text",
    icon: "•",
    shortcut: "ul",
    command: (e) => e.chain().focus().clearNodes().toggleBulletList().run(),
  },
  {
    title: "Ordered List",
    group: "Text",
    icon: "1.",
    shortcut: "ol",
    command: (e) => e.chain().focus().clearNodes().toggleOrderedList().run(),
  },
  {
    title: "Blockquote",
    group: "Text",
    icon: "❝",
    shortcut: "quote",
    command: (e) => e.chain().focus().clearNodes().toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    group: "Text",
    icon: "</>",
    shortcut: "code",
    command: (e) => e.chain().focus().clearNodes().toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    group: "Text",
    icon: "—",
    shortcut: "hr",
    command: (e) => e.chain().focus().setHorizontalRule().run(),
  },

  {
    title: "Info callout",
    group: "Callout",
    icon: "ℹ",
    shortcut: "info",
    command: (e) =>
      e
        .chain()
        .focus()
        .clearNodes()
        .insertContent({
          type: "callout",
          attrs: { calloutType: "info" },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    title: "Warning callout",
    group: "Callout",
    icon: "⚠",
    shortcut: "warn",
    command: (e) =>
      e
        .chain()
        .focus()
        .clearNodes()
        .insertContent({
          type: "callout",
          attrs: { calloutType: "warning" },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    title: "Danger callout",
    group: "Callout",
    icon: "✕",
    shortcut: "danger",
    command: (e) =>
      e
        .chain()
        .focus()
        .clearNodes()
        .insertContent({
          type: "callout",
          attrs: { calloutType: "danger" },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    title: "Tip callout",
    group: "Callout",
    icon: "✓",
    shortcut: "tip",
    command: (e) =>
      e
        .chain()
        .focus()
        .clearNodes()
        .insertContent({
          type: "callout",
          attrs: { calloutType: "tip" },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },

  {
    title: "Table",
    group: "Insert",
    icon: "⊞",
    shortcut: "table",
    command: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "Image",
    group: "Insert",
    icon: "🖼",
    shortcut: "img",
    command: (e) => e.chain().focus().insertContent({ type: "paragraph" }).run(), // overridden in toolbar
  },
  {
    title: "Video embed",
    group: "Insert",
    icon: "▶",
    shortcut: "video",
    command: (e) =>
      e
        .chain()
        .focus()
        .insertContent({ type: "videoEmbed", attrs: { src: "" } })
        .run(),
  },
]

export type SlashCommandListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean
}

type Props = {
  items: SlashCommand[]
  command: (item: SlashCommand) => void
}

export const SlashCommandList = forwardRef<SlashCommandListHandle, Props>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => setSelectedIndex(0), [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length)
          return true
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length)
          return true
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex]
          if (item) command(item)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) return null

    // Group items
    const groups = items.reduce<Record<string, SlashCommand[]>>((acc, item) => {
      ;(acc[item.group] ??= []).push(item)
      return acc
    }, {})

    let absoluteIndex = 0

    return (
      <div
        className="slash-command-menu z-50 w-56 overflow-hidden rounded-xl border border-slate-700
                   bg-slate-900 shadow-2xl shadow-black/60"
      >
        {Object.entries(groups).map(([group, groupItems]) => (
          <div key={group}>
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {group}
            </p>
            {groupItems.map((item) => {
              const idx = absoluteIndex++
              const isSelected = idx === selectedIndex
              return (
                <button
                  key={item.title}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    command(item)
                  }}
                  className={[
                    "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-brand-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  ].join(" ")}
                >
                  <span className="w-5 text-center shrink-0 font-mono text-xs opacity-80">
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.title}</span>
                  <kbd
                    className={`text-[10px] rounded px-1 py-0.5 font-mono ${isSelected ? "bg-white/20" : "bg-slate-800 text-slate-500"}`}
                  >
                    /{item.shortcut}
                  </kbd>
                </button>
              )
            })}
          </div>
        ))}
        <div className="px-3 py-2 border-t border-slate-800">
          <p className="text-[10px] text-slate-600">↑↓ navigate · Enter select · Esc dismiss</p>
        </div>
      </div>
    )
  },
)
SlashCommandList.displayName = "SlashCommandList"
