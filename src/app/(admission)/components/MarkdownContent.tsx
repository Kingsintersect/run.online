import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Minimal, safe Markdown renderer for admin-written stage content.   */
/*  Supports headings (#, ##, ###), bullet and numbered lists,         */
/*  paragraphs, **bold**, *italic*, `code` and [links](https://…).     */
/*  Builds React elements only — no HTML from the content is ever      */
/*  injected, and links are limited to http(s) and site-relative URLs. */
/* ------------------------------------------------------------------ */

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "paragraph"; text: string }

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  const flush = () => {
    if (paragraph.length)
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") })
    paragraph = []
  }

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim()
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line)

    if (!line) {
      flush()
    } else if (heading) {
      flush()
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      })
    } else if (bullet || numbered) {
      flush()
      const ordered = !!numbered
      const item = (bullet ?? numbered)![1]
      const last = blocks[blocks.length - 1]
      if (last?.kind === "list" && last.ordered === ordered)
        last.items.push(item)
      else blocks.push({ kind: "list", ordered, items: [item] })
    } else {
      paragraph.push(line)
    }
  }
  flush()
  return blocks
}

const SAFE_HREF = /^(https?:\/\/|\/)/

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g
  )
  return tokens.map((token, i) => {
    if (/^\*\*[^*]+\*\*$/.test(token))
      return <strong key={i}>{token.slice(2, -2)}</strong>
    if (/^\*[^*]+\*$/.test(token)) return <em key={i}>{token.slice(1, -1)}</em>
    if (/^`[^`]+`$/.test(token)) {
      return (
        <code
          key={i}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>
      )
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)
    if (link) {
      const [, label, href] = link
      if (!SAFE_HREF.test(href)) return label
      const external = href.startsWith("http")
      return (
        <a
          key={i}
          href={href}
          className="font-medium text-primary underline underline-offset-2"
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {label}
        </a>
      )
    }
    return token
  })
}

export function MarkdownContent({
  markdown,
  className,
}: {
  markdown: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed text-foreground",
        className
      )}
    >
      {parseBlocks(markdown).map((block, i) => {
        switch (block.kind) {
          case "heading": {
            const Tag =
              block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5"
            return (
              <Tag
                key={i}
                className={cn(
                  "font-semibold text-foreground",
                  block.level === 1
                    ? "text-lg"
                    : block.level === 2
                      ? "text-base"
                      : "text-sm"
                )}
              >
                {renderInline(block.text)}
              </Tag>
            )
          }
          case "list": {
            const List = block.ordered ? "ol" : "ul"
            return (
              <List
                key={i}
                className={cn(
                  "space-y-1 pl-5",
                  block.ordered ? "list-decimal" : "list-disc"
                )}
              >
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </List>
            )
          }
          case "paragraph":
            return <p key={i}>{renderInline(block.text)}</p>
        }
      })}
    </div>
  )
}
