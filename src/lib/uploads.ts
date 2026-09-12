/**
 * Single source of truth for client-side upload constraints.
 *
 * Every file input in the app validates against these helpers at *selection*
 * time, so an oversized file is rejected the moment the user picks it rather
 * than after a long multipart submit fails. Schemas (`zod`) re-use the same
 * constant so the form-level guarantee and the input-level guarantee can never
 * drift apart.
 *
 * This is deliberately framework-free (no React, no `zod`) so it can be shared
 * by schemas, services, and components alike.
 */

/**
 * Lifecycle of a submission that carries files.
 *
 * `uploading` is the only measurable phase — the browser reports bytes written
 * to the network. `processing` covers the window after the last byte is sent
 * while the server is still working, which has no measurable completion, so it
 * is rendered indeterminate rather than parking a determinate bar at 100%.
 */
export type UploadStage =
  | "idle"
  | "preparing"
  | "uploading"
  | "processing"
  | "done"
  | "error"

/** True while a submission is in flight — for disabling controls. */
export function isUploadActive(stage: UploadStage): boolean {
  return (
    stage === "preparing" || stage === "uploading" || stage === "processing"
  )
}

/** Maximum accepted size for any single uploaded file, in megabytes. */
export const MAX_FILE_SIZE_MB = 2

/** Maximum accepted size for any single uploaded file, in bytes. */
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

/** Human-readable form of the limit, e.g. `"2MB"` — for labels and hints. */
export const MAX_FILE_SIZE_LABEL = `${MAX_FILE_SIZE_MB}MB`

/** Generic limit message, used where the offending file isn't known. */
export const FILE_TOO_LARGE_MESSAGE = `File size must be ${MAX_FILE_SIZE_LABEL} or less`

/** Formats a byte count for display: `900 B`, `1.4 KB`, `3.2 MB`. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** True when the file is within the upload size limit. */
export function isFileWithinSizeLimit(file: File): boolean {
  return file.size <= MAX_FILE_SIZE_BYTES
}

/**
 * Returns a specific, user-facing error for an oversized file — naming the
 * file and its actual size — or `null` when the file is acceptable.
 */
export function getFileSizeError(file: File): string | null {
  if (isFileWithinSizeLimit(file)) return null
  return `"${file.name}" is ${formatFileSize(file.size)} — the maximum is ${MAX_FILE_SIZE_LABEL}.`
}

/** What a given upload field is willing to accept. */
export type UploadKind = "image" | "document"

/**
 * Image extensions used only as a fallback when the browser reports no MIME
 * type at all (`file.type === ""`), which happens for formats the OS doesn't
 * recognise and for some drag-and-drop sources.
 */
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".jfif",
  ".pjpeg",
  ".pjp",
  ".png",
  ".apng",
  ".webp",
  ".gif",
  ".bmp",
  ".dib",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
  ".avif",
  ".svg",
  ".ico",
]

const DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx"]

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

/** Lowercased extension including the dot (`".png"`), or `""` if there is none. */
export function getFileExtension(file: File): string {
  const name = file.name.toLowerCase()
  const dot = name.lastIndexOf(".")
  // No dot, or a leading-dot name like ".gitignore" — no usable extension.
  return dot > 0 ? name.slice(dot) : ""
}

/**
 * True for any image the browser can hand us.
 *
 * Matched on the `image/` MIME prefix rather than an allowlist, so every image
 * format is accepted rather than the handful someone remembered to list.
 * An allowlist reliably misses real formats users actually submit — HEIC/HEIF
 * straight off an iPhone, AVIF, and legacy `image/x-png`, which older Windows
 * builds still report in place of `image/png`.
 */
export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true
  // Browser reported no type — fall back to the extension rather than
  // rejecting a perfectly valid file.
  if (file.type === "") return IMAGE_EXTENSIONS.includes(getFileExtension(file))
  return false
}

/** True for PDF/DOC/DOCX (by MIME, falling back to extension). */
export function isDocumentFile(file: File): boolean {
  if (DOCUMENT_MIME_TYPES.includes(file.type)) return true
  if (file.type === "")
    return DOCUMENT_EXTENSIONS.includes(getFileExtension(file))
  return false
}

/** `accept` attribute for a photo field — every image format. */
export const ACCEPT_IMAGES = "image/*"

/** `accept` attribute for a document field — images plus PDF/DOC/DOCX. */
export const ACCEPT_DOCUMENTS = [
  "image/*",
  ...DOCUMENT_EXTENSIONS,
  ...DOCUMENT_MIME_TYPES,
].join(",")

/** Short description of what a field accepts, for hint text. */
export function describeAcceptedTypes(kind: UploadKind): string {
  return kind === "image" ? "Any image format" : "Images, PDF, DOC, DOCX"
}

/**
 * Returns a user-facing error when the file isn't an accepted type for this
 * kind of field, or `null` when it is. A `document` field accepts images too —
 * a photo of a certificate is as valid as a scan of one.
 */
export function getFileTypeError(file: File, kind: UploadKind): string | null {
  if (kind === "image") {
    return isImageFile(file)
      ? null
      : `"${file.name}" isn't an image. Upload a photo in any image format (JPG, PNG, HEIC, WEBP…).`
  }
  return isImageFile(file) || isDocumentFile(file)
    ? null
    : `"${file.name}" isn't an accepted file. Upload an image or a PDF, DOC or DOCX.`
}

/**
 * Full selection-time check: size first, then type. Returns the first problem
 * found, or `null` when the file is acceptable.
 */
export function getFileError(file: File, kind?: UploadKind): string | null {
  return getFileSizeError(file) ?? (kind ? getFileTypeError(file, kind) : null)
}

export interface FileSizePartition {
  /** Files that are within the size limit and may be kept. */
  accepted: File[]
  /** One user-facing message per rejected file. */
  errors: string[]
}

/**
 * Splits a multi-file selection into the files that pass every check and the
 * messages for those that don't, so a partly-valid selection keeps its valid
 * files instead of being discarded wholesale.
 */
export function partitionFiles(
  files: File[],
  kind?: UploadKind
): FileSizePartition {
  const accepted: File[] = []
  const errors: string[] = []

  for (const file of files) {
    const error = getFileError(file, kind)
    if (error) errors.push(error)
    else accepted.push(file)
  }

  return { accepted, errors }
}
