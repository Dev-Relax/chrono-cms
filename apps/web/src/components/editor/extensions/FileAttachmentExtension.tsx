import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (mimeType: string): string => {
  if (mimeType.includes("pdf"))                              return "📄";
  if (mimeType.includes("zip") || mimeType.includes("compressed") || mimeType.includes("tar")) return "🗜";
  if (mimeType.includes("word") || mimeType.includes("document"))                              return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("sheet")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))                    return "📑";
  if (mimeType.includes("audio"))                           return "🎵";
  if (mimeType.includes("video"))                           return "🎬";
  return "📎";
};

const FileAttachmentView: React.FC<NodeViewProps> = ({ node, deleteNode, selected }) => {
  const { href, filename, size, mimeType } = node.attrs as {
    href: string;
    filename: string;
    size: number;
    mimeType: string;
  };

  return (
    <NodeViewWrapper>
      <div
        className={[
          "group flex items-center gap-3 my-3 rounded-lg border px-4 py-3",
          "bg-slate-800/50 transition-colors select-none",
          selected
            ? "border-brand-500"
            : "border-slate-700 hover:border-slate-600",
        ].join(" ")}
      >
        <span className="text-2xl shrink-0">{fileIcon(mimeType)}</span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{filename}</p>
          <p className="text-xs text-slate-500 mt-0.5">{formatBytes(size)}</p>
        </div>

        <div contentEditable={false} className="flex items-center gap-2 shrink-0">
          <a
            href={href}
            download={filename}
            target="_blank"
            rel="noreferrer"
            onMouseDown={(e) => e.stopPropagation()}
            className="rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300
                       hover:bg-slate-600 hover:text-white transition-colors"
          >
            ↓ Download
          </a>
          {selected && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); deleteNode(); }}
              className="rounded px-1.5 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const FileAttachmentExtension = Node.create({
  name: "fileAttachment",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      href:     { default: "" },
      filename: { default: "file" },
      size:     { default: 0 },
      mimeType: { default: "application/octet-stream" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-file-attachment]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-file-attachment": node.attrs["href"] as string }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentView);
  },
});
