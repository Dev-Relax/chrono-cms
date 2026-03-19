import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import FontFamily from "@tiptap/extension-font-family";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { ImageExtension } from "./extensions/ImageExtension.js";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { createLowlight } from "lowlight";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import css from "highlight.js/lib/languages/css";
import type { TipTapDoc } from "../../types/index.js";
import { EditorToolbar } from "./EditorToolbar.js";
import { FontSize } from "./extensions/FontSize.js";
import { CalloutExtension } from "./extensions/CalloutExtension.js";
import { VideoEmbedExtension } from "./extensions/VideoEmbedExtension.js";
import { FileAttachmentExtension } from "./extensions/FileAttachmentExtension.js";
import { SlashCommandExtension } from "./extensions/SlashCommandExtension.js";

// Register languages for syntax highlighting
const lowlight = createLowlight();
lowlight.register("typescript", typescript);
lowlight.register("javascript", javascript);
lowlight.register("bash", bash);
lowlight.register("json", json);
lowlight.register("css", css);

type Props = {
  /** Current document JSON. Pass null/undefined on initial empty doc. */
  content?: TipTapDoc | null;
  /** Called every time the document changes with the new JSON. */
  onChange?: (doc: TipTapDoc) => void;
  /** Placeholder text shown in the empty editor */
  placeholder?: string;
  /** When true the editor is read-only (no toolbar rendered) */
  readOnly?: boolean;
  /** Optional extra className on the wrapper div */
  className?: string;
};

export const RichTextEditor: React.FC<Props> = ({
  content,
  onChange,
  placeholder = "Start writing… or type / for commands",
  readOnly = false,
  className = "",
}) => {
  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      ImageExtension,
      FontFamily,
      FontSize,
      Subscript,
      Superscript,
      Placeholder.configure({ placeholder }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CalloutExtension,
      VideoEmbedExtension,
      FileAttachmentExtension,
      ...(!readOnly ? [SlashCommandExtension] : []),
    ],
    content: content ?? undefined,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as TipTapDoc);
    },
  });

  // Sync external content changes (e.g. when loading a saved post)
  useEffect(() => {
    if (!editor || !content) return;
    const current  = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(content);
    if (current !== incoming) {
      editor.commands.setContent(content as Parameters<typeof editor.commands.setContent>[0]);
    }
  }, [editor, content]);

  if (!editor) return null;

  return (
    <div className={`flex flex-col ${className}`}>
      {!readOnly && <EditorToolbar editor={editor} />}

      <EditorContent
        editor={editor}
        className="flex-1 focus:outline-none px-1 pt-4
                   [&_.tableWrapper]:overflow-x-auto
                   [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
                   [&_td]:border [&_td]:border-slate-700 [&_td]:p-2 [&_td]:text-sm
                   [&_th]:border [&_th]:border-slate-700 [&_th]:p-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:bg-slate-800
                   [&_.selectedCell]:bg-brand-900/30"
      />
    </div>
  );
};
