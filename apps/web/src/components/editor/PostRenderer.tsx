// PostRenderer — TipTap JSON → React (no dangerouslySetInnerHTML)

import React from "react";
import type { TipTapDoc, TipTapNode, TipTapMark } from "../../types/index.js";
import { toEmbedUrl } from "./extensions/VideoEmbedExtension.js";

// Strip javascript:/data: to prevent XSS from stored content
const safeHref = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  const lower = href.trimStart().toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
  return href;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (mimeType = ""): string => {
  if (mimeType.includes("pdf"))                                   return "📄";
  if (mimeType.includes("zip") || mimeType.includes("compress"))  return "🗜";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel"))   return "📊";
  if (mimeType.includes("presentation"))                          return "📑";
  return "📎";
};

const applyMarks = (text: string, marks: TipTapMark[] = []): React.ReactNode => {
  return marks.reduce<React.ReactNode>((node, mark) => {
    switch (mark.type) {
      case "bold":      return <strong>{node}</strong>;
      case "italic":    return <em>{node}</em>;
      case "strike":    return <s>{node}</s>;
      case "code":      return <code>{node}</code>;
      case "underline": return <u>{node}</u>;
      case "textStyle": {
        const color = mark.attrs?.["color"] as string | undefined;
        return color ? <span style={{ color }}>{node}</span> : node;
      }
      case "link": {
        const href   = mark.attrs?.["href"]   as string | undefined;
        const target = mark.attrs?.["target"] as string | undefined;
        return (
          <a href={safeHref(href)} target={target} rel={target === "_blank" ? "noopener noreferrer" : undefined}>
            {node}
          </a>
        );
      }
      default: return node;
    }
  }, text);
};

type CalloutType = "info" | "warning" | "danger" | "tip";

const CALLOUT_STYLES: Record<CalloutType, { container: string; icon: string; iconColor: string }> = {
  info:    { container: "border-blue-500 bg-blue-950/30",     icon: "ℹ", iconColor: "#60a5fa" },
  warning: { container: "border-yellow-500 bg-yellow-950/30", icon: "⚠", iconColor: "#fbbf24" },
  danger:  { container: "border-red-500 bg-red-950/30",       icon: "✕", iconColor: "#f87171" },
  tip:     { container: "border-emerald-500 bg-emerald-950/30",icon: "✓",iconColor: "#34d399" },
};

const renderNode = (node: TipTapNode, index: number): React.ReactNode => {
  const key = index;

  switch (node.type) {

    case "doc":
      return (
        <React.Fragment key={key}>
          {node.content?.map((child, i) => renderNode(child, i))}
        </React.Fragment>
      );

    case "paragraph":
      return (
        <p key={key}>
          {node.content?.map((child, i) => renderNode(child, i)) ?? <br />}
        </p>
      );

    case "text":
      return (
        <React.Fragment key={key}>
          {applyMarks(node.text ?? "", node.marks)}
        </React.Fragment>
      );

    case "heading": {
      const level    = (node.attrs?.["level"] as number | undefined) ?? 2;
      const children = node.content?.map((child, i) => renderNode(child, i));
      const Tag      = `h${Math.min(level, 4)}` as "h1" | "h2" | "h3" | "h4";
      return <Tag key={key}>{children}</Tag>;
    }

    case "bulletList":
      return <ul key={key}>{node.content?.map((child, i) => renderNode(child, i))}</ul>;

    case "orderedList":
      return <ol key={key}>{node.content?.map((child, i) => renderNode(child, i))}</ol>;

    case "listItem":
      return <li key={key}>{node.content?.map((child, i) => renderNode(child, i))}</li>;

    case "codeBlock": {
      const language = (node.attrs?.["language"] as string | undefined) ?? "";
      return (
        <pre key={key} data-language={language}>
          <code>{node.content?.map((child, i) => renderNode(child, i))}</code>
        </pre>
      );
    }

    case "blockquote":
      return (
        <blockquote key={key}>
          {node.content?.map((child, i) => renderNode(child, i))}
        </blockquote>
      );

    case "image": {
      const src     = node.attrs?.["src"]      as string | undefined;
      const alt     = node.attrs?.["alt"]      as string | undefined;
      const title   = node.attrs?.["title"]    as string | undefined;
      const w       = node.attrs?.["width"]    as number | null | undefined;
      const align   = (node.attrs?.["align"]   as string | undefined) ?? "none";
      const caption = (node.attrs?.["caption"] as string | undefined) ?? "";

      const imgStyle: React.CSSProperties = (() => {
        const width = w ? `${w}px` : undefined;
        switch (align) {
          case "left":   return { float: "left",  width: width ?? "auto", maxWidth: "60%", marginRight: "1.5rem", marginBottom: "0.5rem" };
          case "right":  return { float: "right", width: width ?? "auto", maxWidth: "60%", marginLeft:  "1.5rem", marginBottom: "0.5rem" };
          case "center": return { display: "block", width: width ?? "auto", maxWidth: "100%", marginLeft: "auto", marginRight: "auto" };
          default:       return { display: "block", width: width ?? "100%", maxWidth: "100%" };
        }
      })();

      const img = (
        <img src={src} alt={alt ?? ""} title={title} style={imgStyle} loading="lazy" />
      );

      if (caption) {
        return (
          <figure key={key} style={{ margin: 0 }}>
            {img}
            <figcaption style={{ textAlign: "center", fontSize: "0.8rem", color: "#64748b", marginTop: "0.5rem", fontStyle: "italic" }}>
              {caption}
            </figcaption>
          </figure>
        );
      }
      return <React.Fragment key={key}>{img}</React.Fragment>;
    }

    case "horizontalRule":
      return <hr key={key} className="my-8 border-slate-700" />;

    case "hardBreak":
      return <br key={key} />;

    case "table":
      return (
        <div key={key} className="overflow-x-auto my-6">
          <table className="w-full border-collapse text-sm">
            <tbody>{node.content?.map((child, i) => renderNode(child, i))}</tbody>
          </table>
        </div>
      );

    case "tableRow":
      return <tr key={key}>{node.content?.map((child, i) => renderNode(child, i))}</tr>;

    case "tableHeader":
      return (
        <th key={key}
          className="border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs font-semibold text-slate-200"
          colSpan={(node.attrs?.["colspan"] as number | undefined) ?? 1}
          rowSpan={(node.attrs?.["rowspan"] as number | undefined) ?? 1}
        >
          {node.content?.map((child, i) => renderNode(child, i))}
        </th>
      );

    case "tableCell":
      return (
        <td key={key}
          className="border border-slate-700 px-3 py-2 text-slate-300"
          colSpan={(node.attrs?.["colspan"] as number | undefined) ?? 1}
          rowSpan={(node.attrs?.["rowspan"] as number | undefined) ?? 1}
        >
          {node.content?.map((child, i) => renderNode(child, i))}
        </td>
      );

    case "callout": {
      const calloutType = ((node.attrs?.["calloutType"] as string | undefined) ?? "info") as CalloutType;
      const styles      = CALLOUT_STYLES[calloutType] ?? CALLOUT_STYLES.info;
      return (
        <div key={key} className={`flex gap-2.5 rounded-lg border-l-4 px-4 py-3 my-4 ${styles.container}`}>
          <span style={{ color: styles.iconColor }} className="text-base shrink-0 mt-0.5 select-none">
            {styles.icon}
          </span>
          <div className="flex-1 min-w-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {node.content?.map((child, i) => renderNode(child, i))}
          </div>
        </div>
      );
    }

    case "videoEmbed": {
      const src      = (node.attrs?.["src"] as string | undefined) ?? "";
      const embedUrl = toEmbedUrl(src);
      if (!embedUrl) return null;
      return (
        <div key={key} className="my-6 aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            src={embedUrl}
            title="Embedded video"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    case "fileAttachment": {
      const { href = "", filename = "file", size = 0, mimeType = "" } = (node.attrs ?? {}) as {
        href: string; filename: string; size: number; mimeType: string;
      };
      return (
        <a key={key} href={href} download={filename} target="_blank" rel="noreferrer"
          className="flex items-center gap-3 my-3 rounded-lg border border-slate-700
                     bg-slate-800/50 px-4 py-3 no-underline hover:border-slate-500 transition-colors"
        >
          <span className="text-2xl shrink-0">{fileIcon(mimeType)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{filename}</p>
            <p className="text-xs text-slate-500 mt-0.5">{formatBytes(size)}</p>
          </div>
          <span className="text-xs font-medium text-brand-400 shrink-0">↓ Download</span>
        </a>
      );
    }

    default:
      return node.text ? (
        <React.Fragment key={key}>{node.text}</React.Fragment>
      ) : null;
  }
};

type Props = {
  doc: TipTapDoc;
  className?: string;
};

export const PostRenderer: React.FC<Props> = ({ doc, className = "" }) => (
  <div
    className={[
      "prose prose-invert prose-slate max-w-none",
      "prose-headings:font-semibold prose-headings:text-slate-50",
      "prose-p:text-slate-300 prose-p:leading-7",
      "prose-a:text-brand-400 prose-a:no-underline hover:prose-a:underline",
      "prose-code:text-brand-400 prose-code:bg-slate-800",
      "prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700",
      "prose-blockquote:border-l-brand-500 prose-blockquote:text-slate-400",
      className,
    ].join(" ")}
  >
    {renderNode(doc, 0)}
  </div>
);
