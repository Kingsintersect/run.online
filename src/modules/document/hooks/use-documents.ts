"use client"

import { useQuery } from "@tanstack/react-query"
import { documentService } from "../services/document.service"
import { documentKeys } from "./query-keys"
import type {
  DocumentQueryFilters,
  StudentDocumentQueryFilters,
} from "../types"

export function useDocuments(filters?: DocumentQueryFilters) {
  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: () => documentService.listDocuments(filters),
    staleTime: 30 * 1000,
  })
}

export function useDocument(id: number) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => documentService.getDocument(id),
    enabled: !!id,
  })
}

export function useStudentDocuments(
  studentId: number,
  filters?: StudentDocumentQueryFilters
) {
  return useQuery({
    queryKey: documentKeys.byStudent(studentId, filters),
    queryFn: () => documentService.getDocumentsByStudent(studentId, filters),
    enabled: !!studentId,
    staleTime: 30 * 1000,
  })
}
