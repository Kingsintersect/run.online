"use client"

import { useQuery } from "@tanstack/react-query"
import { demographicsQueryOptions } from "../services/demographics.service"
import type { DemographicsListFilters } from "../types"

export function useCountries(filters?: DemographicsListFilters) {
  return useQuery(demographicsQueryOptions.countries.list(filters))
}

export function useStates(
  countryId: number | null,
  filters?: DemographicsListFilters
) {
  return useQuery(
    demographicsQueryOptions.states.list({
      ...filters,
      countryId: countryId ?? undefined,
    })
  )
}

export function useLocalGovernments(
  stateId: number | null,
  filters?: DemographicsListFilters
) {
  return useQuery(
    demographicsQueryOptions.localGovernments.list({
      ...filters,
      stateId: stateId ?? undefined,
    })
  )
}
