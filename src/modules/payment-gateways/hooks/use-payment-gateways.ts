"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { paymentGatewaysService } from "../services/payment-gateways.service"
import { FALLBACK_PROVIDER_CATALOG } from "../lib/provider-catalog"
import {
  deriveGatewaysFromSettings,
  legacyGatewayId,
} from "../lib/settings-derivation"
import type {
  ActiveGatewayProvider,
  AssignmentHistoryEntry,
  DataSource,
  GatewayAssignment,
  GatewayProvider,
  InstitutionDefaultGateway,
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

export interface UseActiveGatewayResult extends QueryState {
  /** null when the route is missing or the value couldn't be read. */
  activeGateway: ActiveGatewayProvider | null
}

/**
 * Live `GET /fees/gateway`: the gateway every new payment uses today. Used by
 * `useGatewayAssignments()` as the institution default until the proposed
 * assignments API exists; components normally read it through that hook.
 */
export function useActiveGateway(): UseActiveGatewayResult {
  const q = useQuery({
    queryKey: paymentGatewayKeys.activeGateway(),
    queryFn: () => paymentGatewaysService.getActiveGateway(),
    staleTime: STALE,
    retry: false,
  })
  return {
    activeGateway: q.data ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  }
}

export interface UseGatewayAssignmentsResult extends QueryState {
  defaultGatewayId: number | null
  /** The institution default, from whichever API supplied it. */
  institutionDefault: InstitutionDefaultGateway
  assignments: GatewayAssignment[]
  source: DataSource
}

/**
 * §3 routing per major program. The proposed assignments API wins when it
 * exists. Fallback: every active major program with no gateway of its own,
 * and the institution default read from the live `GET /fees/gateway`.
 */
export function useGatewayAssignments(): UseGatewayAssignmentsResult {
  const q = useQuery({
    queryKey: paymentGatewayKeys.assignments(),
    queryFn: () => paymentGatewaysService.listAssignments(),
    staleTime: STALE,
  })
  const isFallback = q.isSuccess && q.data === null
  const programs = useMajorPrograms()
  const active = useActiveGateway()
  const { gateways, source: gatewaysSource } = usePaymentGateways()

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
    const provider = active.activeGateway
    // A gateway derived from Settings has one card per provider, so its id
    // is known. Real gateway ids (once §2 ships) can't be told apart by
    // provider alone; the provider is then enough for labels.
    const derivedId =
      provider && gatewaysSource === "fallback"
        ? legacyGatewayId(FALLBACK_PROVIDER_CATALOG, provider)
        : null
    const gatewayId =
      derivedId !== null && gateways.some((g) => g.id === derivedId)
        ? derivedId
        : null
    return {
      defaultGatewayId: gatewayId,
      institutionDefault: {
        via: provider ? "active-gateway" : null,
        gatewayId,
        provider,
      },
      assignments: fallbackAssignments,
      source: "fallback",
      isLoading: programs.isLoading || active.isLoading,
      isError: programs.isError,
      error: programs.error,
      refetch: () => {
        void programs.refetch()
        active.refetch()
      },
    }
  }
  const defaultGatewayId = q.data?.defaultGatewayId ?? null
  return {
    defaultGatewayId,
    institutionDefault: {
      via: "assignments",
      gatewayId: defaultGatewayId,
      provider:
        gateways.find((g) => g.id === defaultGatewayId)?.provider ?? null,
    },
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
