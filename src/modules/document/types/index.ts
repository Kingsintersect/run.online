import type { z } from "zod"
import * as DocumentSchemas from "../schemas/document.schema"

export type DocumentStatus = z.infer<
  typeof DocumentSchemas.DocumentStatusSchema
>
export type DocumentResponse = z.infer<
  typeof DocumentSchemas.DocumentResponseSchema
>
export type DocumentListMeta = z.infer<
  typeof DocumentSchemas.DocumentListMetaSchema
>
export type DocumentListResponse = z.infer<
  typeof DocumentSchemas.DocumentListResponseSchema
>
export type DocumentQueryFilters = z.infer<
  typeof DocumentSchemas.DocumentQueryFiltersSchema
>
export type StudentDocumentQueryFilters = z.infer<
  typeof DocumentSchemas.StudentDocumentQueryFiltersSchema
>
export type UploadDocumentDto = z.infer<
  typeof DocumentSchemas.UploadDocumentDtoSchema
>
export type UpdateDocumentDto = z.infer<
  typeof DocumentSchemas.UpdateDocumentDtoSchema
>
export type VerifyDocumentDto = z.infer<
  typeof DocumentSchemas.VerifyDocumentDtoSchema
>
export type RejectDocumentDto = z.infer<
  typeof DocumentSchemas.RejectDocumentDtoSchema
>
export type DocumentStatusTransitionResponse = z.infer<
  typeof DocumentSchemas.DocumentStatusTransitionResponseSchema
>
