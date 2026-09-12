"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useUploadProgress } from "@/hooks/use-upload-progress"
import { documentService } from "../services/document.service"
import { documentKeys } from "./query-keys"
import type {
  RejectDocumentDto,
  UpdateDocumentDto,
  UploadDocumentDto,
  VerifyDocumentDto,
} from "../types"

/**
 * Upload a document, exposing live transfer progress alongside the mutation.
 *
 * The returned object is the React Query mutation plus a `progress` handle
 * (`percent`, `stage`, `reset`) that feeds `<UploadProgress />` directly.
 */
export function useUploadDocument() {
  const qc = useQueryClient()
  const progress = useUploadProgress()

  const mutation = useMutation({
    mutationFn: (dto: UploadDocumentDto) => {
      progress.start()
      return documentService.uploadDocument(dto, progress.handleProgress)
    },
    onSuccess: (_data, variables) => {
      progress.succeed()
      qc.invalidateQueries({ queryKey: documentKeys.all })
      qc.invalidateQueries({
        queryKey: documentKeys.byStudent(variables.studentId),
      })
    },
    onError: () => progress.fail(),
  })

  return { ...mutation, progress }
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateDocumentDto }) =>
      documentService.updateDocument(id, dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: documentKeys.all })
      qc.invalidateQueries({ queryKey: documentKeys.detail(variables.id) })
    },
  })
}

export function useVerifyDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: VerifyDocumentDto }) =>
      documentService.verifyDocument(id, dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: documentKeys.all })
      qc.invalidateQueries({ queryKey: documentKeys.detail(variables.id) })
    },
  })
}

export function useRejectDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: RejectDocumentDto }) =>
      documentService.rejectDocument(id, dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: documentKeys.all })
      qc.invalidateQueries({ queryKey: documentKeys.detail(variables.id) })
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => documentService.deleteDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.all }),
  })
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async ({ id, fileName }: { id: number; fileName: string }) => {
      const blob = await documentService.downloadDocument(id)
      const url = URL.createObjectURL(blob)
      const a = globalThis.document.createElement("a")
      a.href = url
      a.download = fileName
      globalThis.document.body.appendChild(a)
      a.click()
      globalThis.document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
  })
}
