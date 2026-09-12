import { z } from "zod"

// documentType is free-form on the backend (max 30 chars) — these are just
// the examples document_README.md gives, offered as quick-pick options; any
// string up to 30 chars is accepted.
export const COMMON_DOCUMENT_TYPES = [
  "birth_certificate",
  "o_level",
  "jamb_result",
  "transcript",
] as const

export const DocumentStatusSchema = z.enum(["pending", "verified", "rejected"])

export const DocumentTypeSchema = z.string().min(1).max(30)

// Full StudentDocument shape. studentId/filePath aren't shown in the
// "By Student" response example in document_README.md (only in the Upload
// response), so they're kept optional rather than assumed absent.
export const DocumentResponseSchema = z.object({
  id: z.number(),
  studentId: z.number().optional(),
  documentType: z.string(),
  fileName: z.string(),
  filePath: z.string().optional(),
  fileSize: z.number(),
  mimeType: z.string(),
  status: DocumentStatusSchema,
  verifiedBy: z.number().nullable().optional(),
  verifiedAt: z.string().nullable().optional(),
  uploadedAt: z.string(),
  createdAt: z.string().optional(),
})

export const DocumentListMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})

export const DocumentListResponseSchema = z.object({
  data: z.array(DocumentResponseSchema),
  meta: DocumentListMetaSchema,
})

export const DocumentQueryFiltersSchema = z.object({
  studentId: z.number().optional(),
  documentType: z.string().optional(),
  status: DocumentStatusSchema.optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
})

export const StudentDocumentQueryFiltersSchema = z.object({
  documentType: z.string().optional(),
  status: DocumentStatusSchema.optional(),
})

export const UploadDocumentDtoSchema = z.object({
  file: z.instanceof(File),
  studentId: z.number().int().positive(),
  documentType: DocumentTypeSchema,
})

export const UpdateDocumentDtoSchema = z.object({
  documentType: DocumentTypeSchema,
})

export const VerifyDocumentDtoSchema = z.object({
  remarks: z.string().optional(),
})

export const RejectDocumentDtoSchema = z.object({
  reason: z.string().min(1, "A reason is required"),
})

// Flat result shape returned by both PATCH /:id/verify and /:id/reject.
export const DocumentStatusTransitionResponseSchema = z.object({
  id: z.number(),
  status: z.enum(["verified", "rejected"]),
  verifiedBy: z.number(),
  verifiedAt: z.string(),
})
