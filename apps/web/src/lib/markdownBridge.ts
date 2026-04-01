import type { TipTapDoc, TipTapNode, TipTapMark } from "../types/index.js"
import type { Extensions } from "@tiptap/core"

// ---------------------------------------------------------------------------
// TipTap JSON → Markdown
// ---------------------------------------------------------------------------

const applyMarks = (text: string, marks: TipTapMark[] = []): string => {
  let result = text
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = `**${result}**`
        break
      case "italic":
        result = `*${result}*`
        break
      case "strike":
        result = `~~${result}~~`
        break
      case "code":
        result = `\`${result}\``
        break
      case "link": {
        const href = (mark.attrs?.["href"] as string | undefined) ?? ""
        result = `[${result}](${href})`
        break
      }
      // underline has no standard markdown equivalent — skip
    }
  }
  return result
}

const serializeInline = (node: TipTapNode): string => {
  if (node.type === "text") return applyMarks(node.text ?? "", node.marks)
  if (node.type === "hardBreak") return "  \n"
  if (node.content) return node.content.map(serializeInline).join("")
  return ""
}

const serializeListItem = (node: TipTapNode, depth: number): string => {
  const parts: string[] = []
  for (const child of node.content ?? []) {
    if (child.type === "paragraph") {
      parts.push((child.content ?? []).map(serializeInline).join(""))
    } else if (child.type === "bulletList" || child.type === "orderedList") {
      parts.push("\n" + serializeNode(child, depth + 1))
    } else {
      parts.push(serializeNode(child, depth))
    }
  }
  return parts.join("\n")
}

const serializeTable = (node: TipTapNode): string => {
  const rows = node.content ?? []
  if (!rows.length) return ""

  const rowsData = rows.map((row) =>
    (row.content ?? []).map((cell) =>
      (cell.content ?? [])
        .flatMap((p) => p.content ?? [])
        .map(serializeInline)
        .join("")
        .replace(/\|/g, "\\|"),
    ),
  )

  const colCount = Math.max(...rowsData.map((r) => r.length))
  const normalized = rowsData.map((row) => {
    while (row.length < colCount) row.push("")
    return row
  })

  const header = normalized[0] ?? []
  const separator = header.map(() => "---")
  const body = normalized.slice(1)
  const fmt = (r: string[]) => `| ${r.join(" | ")} |`
  return [fmt(header), fmt(separator), ...body.map(fmt)].join("\n")
}

const serializeNode = (node: TipTapNode, depth = 0): string => {
  const indent = "  ".repeat(depth)

  switch (node.type) {
    case "doc":
      return (node.content ?? [])
        .map((n) => serializeNode(n))
        .filter((s) => s !== "")
        .join("\n\n")

    case "paragraph":
      if (!node.content?.length) return ""
      return (node.content ?? []).map(serializeInline).join("")

    case "heading": {
      const level = (node.attrs?.["level"] as number | undefined) ?? 2
      const hashes = "#".repeat(Math.min(level, 6))
      return `${hashes} ${(node.content ?? []).map(serializeInline).join("")}`
    }

    case "bulletList":
      return (node.content ?? [])
        .map((item) => `${indent}- ${serializeListItem(item, depth)}`)
        .join("\n")

    case "orderedList":
      return (node.content ?? [])
        .map((item, i) => `${indent}${i + 1}. ${serializeListItem(item, depth)}`)
        .join("\n")

    case "listItem":
      return serializeListItem(node, depth)

    case "blockquote":
      return (node.content ?? [])
        .map((n) => serializeNode(n))
        .filter(Boolean)
        .join("\n")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")

    case "codeBlock": {
      const lang = (node.attrs?.["language"] as string | undefined) ?? ""
      const code = (node.content ?? []).map(serializeInline).join("")
      return `\`\`\`${lang}\n${code}\n\`\`\``
    }

    case "horizontalRule":
      return "---"

    case "hardBreak":
      return "  \n"

    case "image": {
      const src = (node.attrs?.["src"] as string | undefined) ?? ""
      const alt = (node.attrs?.["alt"] as string | undefined) ?? ""
      return `![${alt}](${src})`
    }

    case "table":
      return serializeTable(node)

    // Custom nodes: emit raw HTML so they survive a markdown roundtrip
    case "callout": {
      const calloutType = (node.attrs?.["calloutType"] as string | undefined) ?? "info"
      const inner = (node.content ?? []).map((n) => serializeNode(n)).join("\n\n")
      return `<div data-callout-type="${calloutType}" class="callout">\n\n${inner}\n\n</div>`
    }

    case "videoEmbed": {
      const src = (node.attrs?.["src"] as string | undefined) ?? ""
      return `<div data-video-embed="${src}"></div>`
    }

    case "fileAttachment": {
      const href = (node.attrs?.["href"] as string | undefined) ?? ""
      const filename = (node.attrs?.["filename"] as string | undefined) ?? ""
      const size = (node.attrs?.["size"] as number | undefined) ?? 0
      const mimeType = (node.attrs?.["mimeType"] as string | undefined) ?? ""
      return `<div data-file-attachment="${href}" data-filename="${filename}" data-size="${size}" data-mime-type="${mimeType}"></div>`
    }

    default:
      if (node.content) {
        return (node.content ?? [])
          .map((n) => serializeNode(n))
          .filter(Boolean)
          .join("\n\n")
      }
      return ""
  }
}

export const docToMarkdown = (doc: TipTapDoc): string =>
  serializeNode(doc as TipTapNode).trim()

// ---------------------------------------------------------------------------
// Markdown → TipTap JSON
// ---------------------------------------------------------------------------

export const markdownToDoc = async (md: string, extensions: Extensions): Promise<TipTapDoc> => {
  const { marked } = await import("marked")
  const { generateJSON } = await import("@tiptap/core")
  const html = await marked(md)
  return generateJSON(html, extensions) as TipTapDoc
}
