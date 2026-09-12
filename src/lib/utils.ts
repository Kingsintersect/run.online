import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type FileKind = "image" | "pdf" | "other"

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "avif",
])

/**
 * Classifies an uploaded file by its extension (from a filename or a URL) so
 * a preview UI can pick a rendering strategy — an `<img>` for images, an
 * `<iframe>` for PDFs, and a "download/open externally" fallback for
 * anything else (e.g. .doc/.docx, which no browser can preview inline).
 * Never assume a document is an image just because it has a `url` — always
 * check the extension first.
 */
export function getFileKind(nameOrUrl: string): FileKind {
  const withoutQuery = nameOrUrl.split(/[?#]/)[0]
  const ext = withoutQuery.split(".").pop()?.toLowerCase() ?? ""
  if (IMAGE_EXTENSIONS.has(ext)) return "image"
  if (ext === "pdf") return "pdf"
  return "other"
}
