"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { paymentGatewaysService } from "../services/payment-gateways.service"
import { FALLBACK_PROVIDER_CATALOG } from "../lib/provider-catalog"
import { deriveGatewaysFromSettings } from "../lib/settings-derivation"
import type {
  AssignmentHistoryEntry,
  DataSource,
  GatewayAssignment,
  GatewayProvider,
  PaymentGateway,
  Sourced,
} from "../types"
import { paymentGatewayKeys } from "./query-keys"

// Each hook prefers the proposed live route and falls back when it 404s
// (CLAUDE.md §14). Components get one interface with a `source` flag and
// never call anything different per mode; the day the backend ships a route,
// `source` flips to "live" with no component change.

const STALE = 60 * 1000

interface QueryState {
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

export interface UseGatewayProvidersResult extends QueryState {
  providers: GatewayProvider[]
  source: DataSource
}

/** §1 provider catalog; the static fallback catalog while the route is missing. */
export function useGatewayProviders(): UseGatewayProvidersResult {
  const q = useQuery({
    queryKey: paymentGatewayKeys.providers(),
    queryFn: async (): Promise<Sourced<GatewayProvider[]>> => {
      const live = await paymentGatewaysService.listProviders()
      return live
        ? { source: "live", data: live }
        : { source: "fallback", data: FALLBACK_PROVIDER_CATALOG }
    },
    staleTime: 10 * STALE,
  })
  return {
    providers: q.data?.data ?? [],
    source: q.data?.source ?? "fallback",
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  }
}

export interface UsePaymentGatewaysResult extends QueryState {
  gateways: PaymentGateway[]
  source: DataSource
}

/**
 * §2 gateways. Fallback: one gateway per provider found in Settings
 * (`credo_*`, `fcmb_*`, `flutterwave_*`), with synthetic negative ids.
 */
export function usePaymentGateways(): UsePaymentGatewaysResult {
  const q = useQuery({
    queryKey: paymentGatewayKeys.gateways(),
    queryFn: async (): Promise<Sourced<PaymentGateway[]>> => {
      const live = await paymentGatewaysService.listGateways()
      if (live) return { source: "live", data: live }
      const settings = await paymentGatewaysService.listLegacySettings()
      return {
        source: "fallback",
        data: deriveGatewaysFromSettings(settings, FALLBACK_PROVIDER_CATALOG),
      }
    },
    staleTime: STALE,
  })
  return {
    gateways: q.data?.data ?? [],
    source: q.data?.source ?? "fallback",
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  }
}

export interface UseGatewayAssignmentsResult extends QueryState {
  defaultGatewayId: number | null
  assignments: GatewayAssignment[]
  source: DataSource
}

/**
 * §3 routing per major program. Fallback: every active major program with no
 * gateway (the server picks it today), so the table still lists them.
 */
export function useGatewayAssignments(): UseGatewayAssignmentsResult {
  const q = useQuery({
    queryKey: paymentGatewayKeys.assignments(),
    queryFn: () => paymentGatewaysService.listAssignments(),
    staleTime: STALE,
  })
  const isFallback = q.isSuccess && q.data === null
  const programs = useMajorPrograms()

  const fallbackAssignments = useMemo<GatewayAssignment[]>(
    () =>
      (programs.data?.data ?? [])
        .filter((mp) => mp.isActive)
        .map((mp) => ({
          majorProgramId: mp.id,
          majorProgramName: mp.name,
          gatewayId: null,
          fallbackGatewayId: null,
          autoFailover: false,
          effectiveGatewayId: null,
          updatedBy: null,
          updatedAt: null,
        })),
    [programs.data]
  )

  if (isFallback) {
    return {
      defaultGatewayId: null,
      assignments: fallbackAssignments,
      source: "fallback",
      isLoading: programs.isLoading,
      isError: programs.isError,
      error: programs.error,
      refetch: () => void programs.refetch(),
    }
  }
  return {
    defaultGatewayId: q.data?.defaultGatewayId ?? null,
    assignments: q.data?.assignments ?? [],
    source: "live",
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  }
}

export interface UseGatewayAssignmentHistoryResult extends QueryState {
  history: AssignmentHistoryEntry[]
  source: DataSource
}

/** §3 switch history, optionally for one major program. Empty in fallback. */
export function useGatewayAssignmentHistory(
  majorProgramId: number | null
): UseGatewayAssignmentHistoryResult {
  const q = useQuery({
    queryKey: paymentGatewayKeys.history(majorProgramId),
    queryFn: async (): Promise<Sourced<AssignmentHistoryEntry[]>> => {
      const live = await paymentGatewaysService.listHistory(
        majorProgramId ?? undefined
      )
      return live
        ? { source: "live", data: live }
        : { source: "fallback", data: [] }
    },
    staleTime: STALE,
  })
  return {
    history: q.data?.data ?? [],
    source: q.data?.source ?? "fallback",
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  }
}
