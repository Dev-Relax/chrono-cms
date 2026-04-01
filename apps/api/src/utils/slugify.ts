// Simple slugifier — no external deps needed for this use-case.
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // strip non-word chars
    .replace(/[\s_-]+/g, "-") // collapse whitespace/underscores/dashes
    .replace(/^-+|-+$/g, "") // trim leading/trailing dashes
