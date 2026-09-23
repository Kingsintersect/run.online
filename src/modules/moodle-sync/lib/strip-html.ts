// Assessment descriptions come straight from Moodle's rich-text editor as raw HTML
// (e.g. `<p>Discuss the meaning...</p>`), but these screens only ever show a plain-text
// preview or paragraph, never rendered HTML — decode entities and strip tags with plain
// string handling rather than injecting third-party HTML via `dangerouslySetInnerHTML`,
// which would be a real XSS surface for content pulled from an external system.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
  mdash: "—",
  ndash: "–",
}

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, code: string) => {
      if (code[0] === "#") {
        const codePoint =
          code[1] === "x" || code[1] === "X"
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10)
        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : match
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? match
    }
  )
}

// Single-line preview — every tag (including paragraph/line breaks) collapses to a
// space. Use for a truncated card excerpt.
export function stripHtmlToText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
}

// Multi-line — paragraph/list/line-break tags become real newlines first, so a full
// description still reads as separate paragraphs. Use where the result isn't clamped
// to one line.
export function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<\s*(br)\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
  return decodeEntities(withBreaks)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
}
