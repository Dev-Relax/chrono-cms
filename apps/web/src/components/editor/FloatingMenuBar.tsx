import React from "react";
import type { Editor } from "@tiptap/react";

type Props = { editor: Editor };

type BlockButtonProps = {
  icon: string;
  label: string;
  onClick: () => void;
};

const BlockButton: React.FC<BlockButtonProps> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    title={label}
    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-300
               hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap"
  >
    <span className="text-base leading-none">{icon}</span>
    <span>{label}</span>
  </button>
);

export const FloatingMenuBar: React.FC<Props> = ({ editor }) => (
  <>
    <BlockButton
      icon="H1"
      label="Heading 1"
      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
    />
    <BlockButton
      icon="H2"
      label="Heading 2"
      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
    />
    <BlockButton
      icon="•"
      label="Bullet list"
      onClick={() => editor.chain().focus().toggleBulletList().run()}
    />
    <BlockButton
      icon="1."
      label="Ordered list"
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
    />
    <BlockButton
      icon="</>"
      label="Code block"
      onClick={() => editor.chain().focus().toggleCodeBlock().run()}
    />
    <BlockButton
      icon="❝"
      label="Blockquote"
      onClick={() => editor.chain().focus().toggleBlockquote().run()}
    />
  </>
);
