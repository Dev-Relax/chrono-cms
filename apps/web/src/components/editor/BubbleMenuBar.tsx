import React from "react"
import type { Editor } from "@tiptap/react"

type Props = { editor: Editor }

type ButtonProps = {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}

const MenuButton: React.FC<ButtonProps> = ({ active, onClick, title, children }) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault() // prevent editor losing focus
      onClick()
    }}
    title={title}
    className={[
      "px-2 py-1 rounded text-xs font-medium transition-colors",
      active ? "bg-brand-500 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white",
    ].join(" ")}
  >
    {children}
  </button>
)

export const BubbleMenuBar: React.FC<Props> = ({ editor }) => (
  <>
    <MenuButton
      active={editor.isActive("bold")}
      onClick={() => editor.chain().focus().toggleBold().run()}
      title="Bold (Ctrl+B)"
    >
      <strong>B</strong>
    </MenuButton>

    <MenuButton
      active={editor.isActive("italic")}
      onClick={() => editor.chain().focus().toggleItalic().run()}
      title="Italic (Ctrl+I)"
    >
      <em>I</em>
    </MenuButton>

    <MenuButton
      active={editor.isActive("strike")}
      onClick={() => editor.chain().focus().toggleStrike().run()}
      title="Strikethrough"
    >
      <s>S</s>
    </MenuButton>

    <div className="w-px h-4 bg-slate-600 mx-0.5" />

    <MenuButton
      active={editor.isActive("code")}
      onClick={() => editor.chain().focus().toggleCode().run()}
      title="Inline code"
    >
      <span className="font-mono">{"<>"}</span>
    </MenuButton>

    <MenuButton
      active={editor.isActive("blockquote")}
      onClick={() => editor.chain().focus().toggleBlockquote().run()}
      title="Blockquote"
    >
      ❝
    </MenuButton>

    <div className="w-px h-4 bg-slate-600 mx-0.5" />

    <MenuButton
      active={editor.isActive("heading", { level: 2 })}
      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      title="Heading 2"
    >
      H2
    </MenuButton>

    <MenuButton
      active={editor.isActive("heading", { level: 3 })}
      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      title="Heading 3"
    >
      H3
    </MenuButton>
  </>
)
