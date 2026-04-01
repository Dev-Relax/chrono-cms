import type { TipTapDoc, TipTapNode } from "../types/index.js"

const WPM = 200

const countWords = (node: TipTapNode): number => {
  let words = 0
  if (node.text) {
    words += node.text.trim().split(/\s+/).filter(Boolean).length
  }
  if (node.content) {
    for (const child of node.content) {
      words += countWords(child)
    }
  }
  return words
}

/**
 * Returns estimated reading time in minutes (minimum 1).
 * Pass the TipTap document root.
 */
export const readingTime = (doc: TipTapDoc): number =>
  Math.max(1, Math.round(countWords(doc) / WPM))

/** Returns a display string, e.g. "3 min read". */
export const readingTimeLabel = (doc: TipTapDoc): string => {
  const mins = readingTime(doc)
  return `${mins} min read`
}
