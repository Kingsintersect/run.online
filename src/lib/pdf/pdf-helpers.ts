import type { PDFDocument } from "pdf-lib"

// Shared by the portal's generated PDFs (result slip, registration slip).

export async function loadImageBytes(src: string) {
  try {
    const absoluteUrl = src.startsWith("http")
      ? src
      : typeof window !== "undefined"
        ? new URL(src, window.location.origin).toString()
        : src
    const response = await fetch(absoluteUrl)
    if (!response.ok) return null
    const bytes = await response.arrayBuffer()
    // Detect the format from the bytes: the file extension can't be trusted
    // (the university logo is a PNG named logo.jpg).
    const head = new Uint8Array(bytes.slice(0, 4))
    const kind =
      head[0] === 0x89 &&
      head[1] === 0x50 &&
      head[2] === 0x4e &&
      head[3] === 0x47
        ? "png"
        : head[0] === 0xff && head[1] === 0xd8
          ? "jpg"
          : null
    if (!kind) return null
    return { bytes, kind } as const
  } catch {
    return null
  }
}

export async function embedImage(
  pdfDoc: PDFDocument,
  bytes: ArrayBuffer,
  kind: "png" | "jpg"
) {
  return kind === "png" ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes)
}

export function trimText(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`
}
