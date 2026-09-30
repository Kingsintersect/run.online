"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { configurationKeys } from "@/services/configurationApi"
import { paymentGatewaysService } from "../services/payment-gateways.service"
import type {
  CreateGatewayPayload,
  UpdateActiveGatewayPayload,
  UpdateAssignmentPayload,
  UpdateDefaultGatewayPayload,
  UpdateGatewayPayload,
} from "../types"
import { paymentGatewayKeys } from "./query-keys"

/** Gateways, and the Settings cache the fallback writes through. */
function useInvalidateGateways() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: paymentGatewayKeys.gateways() }),
      qc.invalidateQueries({ queryKey: paymentGatewayKeys.assignments() }),
      qc.invalidateQueries({ queryKey: configurationKeys.settings() }),
    ])
}

/**
 * Add a gateway. While `/payments/gateways` is missing, the credentials are
 * saved to Settings instead; the result is then null.
 */
export function useCreatePaymentGateway() {
  const invalidate = useInvalidateGateways()
  return useMutation({
    mutationFn: (payload: CreateGatewayPayload) =>
      paymentGatewaysService.createGateway(payload),
    onSuccess: () => invalidate(),
  })
}

/** Edit a gateway; a derived (negative-id) gateway writes to Settings. */
export function useUpdatePaymentGateway() {
  const invalidate = useInvalidateGateways()
  return useMutation({
    mutationFn: (v: {
      id: number
      provider: string
      payload: UpdateGatewayPayload
    }) => paymentGatewaysService.updateGateway(v.id, v.provider, v.payload),
    onSuccess: () => invalidate(),
  })
}

export function useDeletePaymentGateway() {
  const invalidate = useInvalidateGateways()
  return useMutation({
    mutationFn: (id: number) => paymentGatewaysService.deleteGateway(id),
    onSuccess: () => invalidate(),
  })
}

export function useTestPaymentGateway() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => paymentGatewaysService.testGateway(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: paymentGatewayKeys.gateways() }),
  })
}

function useInvalidateRouting() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: paymentGatewayKeys.assignments() }),
      qc.invalidateQueries({ queryKey: paymentGatewayKeys.activeGateway() }),
      qc.invalidateQueries({ queryKey: paymentGatewayKeys.historyAll() }),
      qc.invalidateQueries({ queryKey: paymentGatewayKeys.gateways() }),
    ])
}

export function useUpdateGatewayAssignment() {
  const invalidate = useInvalidateRouting()
  return useMutation({
    mutationFn: (v: {
      majorProgramId: number
      payload: UpdateAssignmentPayload
    }) => paymentGatewaysService.updateAssignment(v.majorProgramId, v.payload),
    onSuccess: () => invalidate(),
  })
}

export function useUpdateDefaultGateway() {
  const invalidate = useInvalidateRouting()
  return useMutation({
    mutationFn: (payload: UpdateDefaultGatewayPayload) =>
      paymentGatewaysService.updateDefault(payload),
    onSuccess: () => invalidate(),
  })
}

/**
 * Live `PATCH /fees/gateway`: switch the institution-wide gateway for new
 * payments. The server answers with the new value, which is written straight
 * into the cache before the routing queries refetch.
 */
export function useSetActiveGateway() {
  const qc = useQueryClient()
  const invalidate = useInvalidateRouting()
  return useMutation({
    mutationFn: (payload: UpdateActiveGatewayPayload) =>
      paymentGatewaysService.setActiveGateway(payload),
    onSuccess: (activeGateway) => {
      qc.setQueryData(paymentGatewayKeys.activeGateway(), activeGateway)
      return invalidate()
    },
  })
}
