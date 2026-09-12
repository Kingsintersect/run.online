"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  gradingSchemesKeys,
  gradingSchemesMutationOptions,
  gradingSchemesQueryOptions,
} from "../services/grading-schemes.service"

export function useGradingSchemes() {
  return useQuery({
    ...gradingSchemesQueryOptions.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateGradingScheme() {
  const qc = useQueryClient()
  return useMutation({
    ...gradingSchemesMutationOptions.create(),
    onSuccess: () => qc.invalidateQueries({ queryKey: gradingSchemesKeys.all }),
  })
}

export function useAddGradingSchemeScale() {
  const qc = useQueryClient()
  return useMutation({
    ...gradingSchemesMutationOptions.addScale(),
    onSuccess: () => qc.invalidateQueries({ queryKey: gradingSchemesKeys.all }),
  })
}
