import { Extension } from "@tiptap/core"
import Suggestion from "@tiptap/suggestion"
import type { SuggestionOptions } from "@tiptap/suggestion"
import { ReactRenderer } from "@tiptap/react"
import { SlashCommandList, buildCommands } from "../SlashCommandList.js"
import type { SlashCommandListHandle, SlashCommand } from "../SlashCommandList.js"

let rendererRef: ReactRenderer<SlashCommandListHandle> | null = null
let popupEl: HTMLDivElement | null = null

const removePopup = () => {
  popupEl?.remove()
  popupEl = null
  rendererRef?.destroy()
  rendererRef = null
}

const positionPopup = (referenceEl: Element) => {
  if (!popupEl) return
  const rect = referenceEl.getBoundingClientRect()
  const viewportH = window.innerHeight
  const popupH = popupEl.offsetHeight || 320

  // Show above if not enough room below
  const spaceBelow = viewportH - rect.bottom
  const top =
    spaceBelow > popupH + 8
      ? rect.bottom + window.scrollY + 4
      : rect.top + window.scrollY - popupH - 4

  popupEl.style.top = `${top}px`
  popupEl.style.left = `${rect.left + window.scrollX}px`
}

const suggestionConfig: Partial<SuggestionOptions<SlashCommand>> = {
  char: "/",
  allowSpaces: false,
  startOfLine: true,

  items: ({ query, editor }) => {
    const all = buildCommands(editor)
    if (!query) return all
    const q = query.toLowerCase()
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.shortcut.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q),
    )
  },

  render: () => ({
    onStart: ({ items, command, clientRect, editor }) => {
      removePopup()

      rendererRef = new ReactRenderer(SlashCommandList, {
        props: {
          items,
          command: (item: SlashCommand) => {
            command(item)
          },
        },
        editor,
      })

      popupEl = document.createElement("div")
      popupEl.style.position = "absolute"
      popupEl.style.zIndex = "9999"
      popupEl.appendChild(rendererRef.element)
      document.body.appendChild(popupEl)

      const ref = clientRect?.()
      if (ref) {
        positionPopup(ref as unknown as Element)
      }
    },

    onUpdate: ({ items, command, clientRect, editor }) => {
      rendererRef?.updateProps({
        items,
        command: (item: SlashCommand) => {
          command(item)
        },
        editor,
      })

      const ref = clientRect?.()
      if (ref) positionPopup(ref as unknown as Element)
    },

    onKeyDown: ({ event }) => {
      if (event.key === "Escape") {
        removePopup()
        return true
      }
      return rendererRef?.ref?.onKeyDown(event) ?? false
    },

    onExit: () => removePopup(),
  }),

  command: ({ editor, range, props }) => {
    editor.chain().focus().deleteRange(range).run()
    ;(props as SlashCommand).command(editor)
  },
}

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...suggestionConfig,
      }),
    ]
  },
})
