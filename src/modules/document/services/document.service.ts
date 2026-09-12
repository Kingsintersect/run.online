import apiClient from "@/lib/clients/apiClient"
import type {
  DocumentListResponse,
  DocumentQueryFilters,
  DocumentResponse,
  DocumentStatusTransitionResponse,
  RejectDocumentDto,
  StudentDocumentQueryFilters,
  UpdateDocumentDto,
  UploadDocumentDto,
  VerifyDocumentDto,
} from "../types"

// Real backend contract per bruno/document/*.bru (the sole source of truth
// for this module — see CLAUDE.md §13). GET endpoints are wrapped in a
// `{ data: ... }` envelope (List additionally carries `meta`, confirmed by
// document_README.md's example bodies); mutation endpoints (POST/PATCH)
// return the flat resource/result — confirmed for Upload by the bruno file's
// explicit "NOT wrapped like most other endpoints" note, and for
// Verify/Reject by document_README.md's flat example response bodies.
const BASE = "/documents"
const AUTH = { access_token: true } as const

export const documentService = {
  async listDocuments(
    filters: DocumentQueryFilters = {}
  ): Promise<DocumentListResponse> {
    return apiClient.get<DocumentListResponse>(BASE, {
      ...AUTH,
      params: filters as Record<string, unknown>,
    })
  },

  async getDocument(id: number): Promise<DocumentResponse> {
    const res = await apiClient.get<{ data: DocumentResponse }>(
      `${BASE}/${id}`,
      AUTH
    )
    return res.data
  },

  async getDocumentsByStudent(
    studentId: number,
    filters: StudentDocumentQueryFilters = {}
  ): Promise<DocumentResponse[]> {
    const res = await apiClient.get<{ data: DocumentResponse[] }>(
      `${BASE}/student/${studentId}`,
      { ...AUTH, params: filters as Record<string, unknown> }
    )
    return res.data
  },

  // `onUploadProgress` is a transport concern, not part of the payload, so it
  // stays a separate argument rather than a field on UploadDocumentDto (which
  // is z.infer'd from the schema validating what's actually sent).
  uploadDocument: (
    { file, studentId, documentType }: UploadDocumentDto,
    onUploadProgress?: (percent: number) => void
  ) =>
    apiClient.post<DocumentResponse>(
      BASE,
      { file, studentId, documentType },
      { ...AUTH, contentType: "multipart", onUploadProgress }
    ),

  updateDocument: (id: number, dto: UpdateDocumentDto) =>
    apiClient.patch<DocumentResponse>(`${BASE}/${id}`, dto, AUTH),

  verifyDocument: (id: number, dto: VerifyDocumentDto) =>
    apiClient.patch<DocumentStatusTransitionResponse>(
      `${BASE}/${id}/verify`,
      dto,
      AUTH
    ),

  rejectDocument: (id: number, dto: RejectDocumentDto) =>
    apiClient.patch<DocumentStatusTransitionResponse>(
      `${BASE}/${id}/reject`,
      dto,
      AUTH
    ),

  downloadDocument: (id: number) =>
    apiClient.get<Blob>(`${BASE}/${id}/download`, {
      ...AUTH,
      responseType: "blob",
    }),

  deleteDocument: (id: number) => apiClient.delete<void>(`${BASE}/${id}`, AUTH),
}
