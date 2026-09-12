"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  demographicsKeys,
  demographicsMutationOptions,
} from "../services/demographics.service"

export function useCountryMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: demographicsKeys.countries.all })

  const create = useMutation({
    ...demographicsMutationOptions.createCountry(),
    onSuccess: invalidate,
  })
  const update = useMutation({
    ...demographicsMutationOptions.updateCountry(),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    ...demographicsMutationOptions.removeCountry(),
    onSuccess: invalidate,
  })

  return { create, update, remove }
}

export function useStateMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: demographicsKeys.states.all })

  const create = useMutation({
    ...demographicsMutationOptions.createState(),
    onSuccess: invalidate,
  })
  const update = useMutation({
    ...demographicsMutationOptions.updateState(),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    ...demographicsMutationOptions.removeState(),
    onSuccess: invalidate,
  })

  return { create, update, remove }
}

export function useLocalGovernmentMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: demographicsKeys.localGovernments.all,
    })

  const create = useMutation({
    ...demographicsMutationOptions.createLocalGovernment(),
    onSuccess: invalidate,
  })
  const update = useMutation({
    ...demographicsMutationOptions.updateLocalGovernment(),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    ...demographicsMutationOptions.removeLocalGovernment(),
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
