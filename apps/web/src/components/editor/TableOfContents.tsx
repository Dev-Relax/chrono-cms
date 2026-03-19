import React from "react";
import type { TipTapDoc, TipTapNode } from "../../types/index.js";

type TocEntry = {
  level:  number;
  text:   string;
  id:     string;
};

/** Extract plain text from a TipTap node tree. */
const nodeText = (node: TipTapNode): string => {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(nodeText).join("");
};

/** Convert a heading text to a URL-safe id (mirrors what @tiptap/extension-heading generates). */
const toId = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/** Walk the doc and collect all heading nodes. */
const extractHeadings = (doc: TipTapDoc): TocEntry[] => {
  const entries: TocEntry[] = [];
  const walk = (nodes: TipTapNode[] = []) => {
    for (const node of nodes) {
      if (node.type === "heading") {
        const level = (node.attrs?.["level"] as number | undefined) ?? 2;
        const text  = nodeText(node);
        if (text) entries.push({ level, text, id: toId(text) });
      }
      if (node.content) walk(node.content);
    }
  };
  walk(doc.content ?? []);
  return entries;
};

type Props = {
  doc:       TipTapDoc;
  /** Extra className on the outer nav element. */
  className?: string;
  /** Maximum heading depth to include (default: 3, i.e. h1–h3). */
  maxLevel?: number;
};

export const TableOfContents: React.FC<Props> = ({ doc, className = "", maxLevel = 3 }) => {
  const entries = extractHeadings(doc).filter((e) => e.level <= maxLevel);

  if (entries.length < 2) return null; // not worth showing for 0-1 headings

  return (
    <nav
      aria-label="Table of contents"
      className={[
        "rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-4 text-sm",
        className,
      ].join(" ")}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Contents
      </p>
      <ol className="space-y-1.5">
        {entries.map((entry, i) => (
          <li
            key={i}
            style={{ paddingLeft: `${(entry.level - 1) * 0.875}rem` }}
          >
            <a
              href={`#${entry.id}`}
              className="block text-slate-400 hover:text-brand-400 transition-colors leading-snug"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};
