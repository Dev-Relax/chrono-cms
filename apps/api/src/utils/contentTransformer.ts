export type ContentFormat = "json" | "html" | "markdown";

interface PmMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface PmNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  marks?: PmMark[];
  text?: string;
}

const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const serializeMarksOpen = (marks: PmMark[]): string =>
  marks.map((m) => {
    switch (m.type) {
      case "bold":      return "<strong>";
      case "italic":    return "<em>";
      case "code":      return "<code>";
      case "strike":    return "<s>";
      case "underline": return "<u>";
      case "link": {
        const href = m.attrs?.["href"] as string ?? "#";
        const target = m.attrs?.["target"] as string | undefined;
        return `<a href="${escHtml(href)}"${target ? ` target="${target}"` : ""}>`;
      }
      default: return "";
    }
  }).join("");

const serializeMarksClose = (marks: PmMark[]): string =>
  [...marks].reverse().map((m) => {
    switch (m.type) {
      case "bold":      return "</strong>";
      case "italic":    return "</em>";
      case "code":      return "</code>";
      case "strike":    return "</s>";
      case "underline": return "</u>";
      case "link":      return "</a>";
      default:          return "";
    }
  }).join("");

const nodeToHtml = (node: PmNode): string => {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(nodeToHtml).join("\n");

    case "paragraph": {
      const inner = (node.content ?? []).map(nodeToHtml).join("");
      return `<p>${inner}</p>`;
    }

    case "heading": {
      const level = (node.attrs?.["level"] as number) ?? 1;
      const inner = (node.content ?? []).map(nodeToHtml).join("");
      return `<h${level}>${inner}</h${level}>`;
    }

    case "blockquote":
      return `<blockquote>${(node.content ?? []).map(nodeToHtml).join("\n")}</blockquote>`;

    case "codeBlock": {
      const lang = node.attrs?.["language"] as string | undefined;
      const text = (node.content ?? []).map(nodeToHtml).join("");
      return `<pre><code${lang ? ` class="language-${escHtml(lang)}"` : ""}>${text}</code></pre>`;
    }

    case "bulletList":
      return `<ul>\n${(node.content ?? []).map(nodeToHtml).join("\n")}\n</ul>`;

    case "orderedList": {
      const start = (node.attrs?.["start"] as number | undefined) ?? 1;
      return `<ol${start !== 1 ? ` start="${start}"` : ""}>\n${(node.content ?? []).map(nodeToHtml).join("\n")}\n</ol>`;
    }

    case "listItem":
      return `<li>${(node.content ?? []).map(nodeToHtml).join("")}</li>`;

    case "image": {
      const src   = escHtml((node.attrs?.["src"]   as string) ?? "");
      const alt   = escHtml((node.attrs?.["alt"]   as string) ?? "");
      const title = node.attrs?.["title"] as string | undefined;
      const width = node.attrs?.["width"] as number | null | undefined;
      const align = (node.attrs?.["align"] as string | undefined) ?? "none";

      const style = (() => {
        const w = width ? `${width}px` : undefined;
        switch (align) {
          case "left":   return `float:left;width:${w ?? "auto"};max-width:60%;margin-right:1.5rem;margin-bottom:0.5rem`;
          case "right":  return `float:right;width:${w ?? "auto"};max-width:60%;margin-left:1.5rem;margin-bottom:0.5rem`;
          case "center": return `display:block;width:${w ?? "auto"};max-width:100%;margin-left:auto;margin-right:auto`;
          default:       return `display:block;width:${w ?? "100%"};max-width:100%`;
        }
      })();

      return `<img src="${src}" alt="${alt}"${title ? ` title="${escHtml(title)}"` : ""} style="${style}" />`;
    }

    case "horizontalRule":
      return "<hr />";

    case "hardBreak":
      return "<br />";

    case "text": {
      const marks = node.marks ?? [];
      const safe  = escHtml(node.text ?? "");
      return `${serializeMarksOpen(marks)}${safe}${serializeMarksClose(marks)}`;
    }

    default:
      return (node.content ?? []).map(nodeToHtml).join("");
  }
};

const nodeToMd = (node: PmNode, listDepth = 0, ordered = false, index = 0): string => {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map((n) => nodeToMd(n)).join("\n\n").trimEnd() + "\n";

    case "paragraph":
      return (node.content ?? []).map((n) => nodeToMd(n)).join("");

    case "heading": {
      const level = (node.attrs?.["level"] as number) ?? 1;
      const inner = (node.content ?? []).map((n) => nodeToMd(n)).join("");
      return `${"#".repeat(level)} ${inner}`;
    }

    case "blockquote": {
      const inner = (node.content ?? []).map((n) => nodeToMd(n)).join("\n\n");
      return inner.split("\n").map((l) => `> ${l}`).join("\n");
    }

    case "codeBlock": {
      const lang = (node.attrs?.["language"] as string) ?? "";
      const text = (node.content ?? []).map((n) => n.text ?? "").join("");
      return `\`\`\`${lang}\n${text}\n\`\`\``;
    }

    case "bulletList":
      return (node.content ?? [])
        .map((n) => nodeToMd(n, listDepth + 1, false))
        .join("\n");

    case "orderedList":
      return (node.content ?? [])
        .map((n, i) => nodeToMd(n, listDepth + 1, true, i + 1))
        .join("\n");

    case "listItem": {
      const indent = "  ".repeat(listDepth - 1);
      const bullet = ordered ? `${index}.` : "-";
      const inner  = (node.content ?? []).map((n) => nodeToMd(n, listDepth, ordered, index)).join("\n");
      const lines  = inner.split("\n");
      return `${indent}${bullet} ${lines[0] ?? ""}${lines.slice(1).length ? "\n" + lines.slice(1).join("\n") : ""}`;
    }

    case "image": {
      const src   = (node.attrs?.["src"]   as string) ?? "";
      const alt   = (node.attrs?.["alt"]   as string) ?? "";
      const title = node.attrs?.["title"] as string | undefined;
      return `![${alt}](${src}${title ? ` "${title}"` : ""})`;
    }

    case "horizontalRule":
      return "---";

    case "hardBreak":
      return "  \n";

    case "text": {
      let s = node.text ?? "";
      const marks = node.marks ?? [];
      const hasCode      = marks.some((m) => m.type === "code");
      const hasBold      = marks.some((m) => m.type === "bold");
      const hasItalic    = marks.some((m) => m.type === "italic");
      const hasStrike    = marks.some((m) => m.type === "strike");
      const linkMark     = marks.find((m)  => m.type === "link");

      if (hasCode)   s = `\`${s}\``;
      if (hasBold)   s = `**${s}**`;
      if (hasItalic) s = `_${s}_`;
      if (hasStrike) s = `~~${s}~~`;
      if (linkMark) {
        const href  = (linkMark.attrs?.["href"]  as string) ?? "#";
        const title = linkMark.attrs?.["title"] as string | undefined;
        s = `[${s}](${href}${title ? ` "${title}"` : ""})`;
      }
      return s;
    }

    default:
      return (node.content ?? []).map((n) => nodeToMd(n)).join("");
  }
};

/**
 * Transform TipTap JSON content to the requested format.
 * Returns the original object for "json", a string for "html"/"markdown".
 */
export const transformContent = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any,
  format: ContentFormat
): unknown => {
  if (format === "json") return content;
  if (!content || typeof content !== "object") return format === "html" ? "" : "";
  const doc = content as PmNode;
  return format === "html" ? nodeToHtml(doc) : nodeToMd(doc);
};
