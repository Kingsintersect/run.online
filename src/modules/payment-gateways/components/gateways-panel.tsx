"use client"

import { useMemo, useState } from "react"
import { CreditCard, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/custom/EmptyState"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import {
  useGatewayAssignments,
  useGatewayProviders,
  usePaymentGateways,
} from "../hooks/use-payment-gateways"
import {
  useTestPaymentGateway,
  useUpdatePaymentGateway,
} from "../hooks/use-payment-gateway-mutations"
import type { PaymentGateway } from "../types"
import { GatewayCard } from "./gateway-card"
import { GatewayFormDialog } from "./gateway-form-dialog"
import { DeleteGatewayDialog } from "./delete-gateway-dialog"
import { CardGridSkeleton, ErrorState, FallbackNotice } from "./panel-states"

export function GatewaysPanel() {
  const { gateways, source, isLoading, isError, error, refetch } =
    usePaymentGateways()
  const { providers, source: providersSource } = useGatewayProviders()
  const { assignments, institutionDefault } = useGatewayAssignments()
  const { data: programsRes } = useMajorPrograms()
  const test = useTestPaymentGateway()
  const toggle = useUpdatePaymentGateway()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentGateway | null>(null)
  const [deleting, setDeleting] = useState<PaymentGateway | null>(null)
  const [testingId, setTestingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const isFallback = source === "fallback"
  const configuredProviders = gateways.map((g) => g.provider)
  const allProvidersConfigured =
    isFallback &&
    providers.length > 0 &&
    providers.every((p) => configuredProviders.includes(p.provider))

  // Program names per gateway: the server's own list first, then any
  // assignment that uses it as the primary.
  const programNamesFor = useMemo(() => {
    const names = new Map<number, string>(
      (programsRes?.data ?? []).map((mp) => [mp.id, mp.name])
    )
    return (gw: PaymentGateway): string[] => {
      const ids = new Set(gw.assignedMajorProgramIds)
      for (const a of assignments)
        if (a.gatewayId === gw.id) ids.add(a.majorProgramId)
      return [...ids].map(
        (id) =>
          names.get(id) ??
          assignments.find((a) => a.majorProgramId === id)?.majorProgramName ??
          `Program #${id}`
      )
    }
  }, [programsRes, assignments])

  // The institution default: by id when known, else by provider (the live
  // /fees/gateway switch names a provider, not a gateway).
  const isActiveForNew = (gw: PaymentGateway): boolean =>
    institutionDefault.gatewayId !== null
      ? gw.id === institutionDefault.gatewayId
      : institutionDefault.provider !== null &&
        gw.provider === institutionDefault.provider

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const runTest = (gw: PaymentGateway) => {
    setTestingId(gw.id)
    test.mutate(gw.id, {
      onSuccess: (r) =>
        r.status === "OK"
          ? toast.success(`${gw.displayName}: connection OK`)
          : toast.error(
              `${gw.displayName}: connection failed${r.message ? ` (${r.message})` : ""}`
            ),
      onError: (err) => toast.error(err.message),
      onSettled: () => setTestingId(null),
    })
  }

  const setEnabled = (gw: PaymentGateway, next: boolean) => {
    setTogglingId(gw.id)
    toggle.mutate(
      { id: gw.id, provider: gw.provider, payload: { isEnabled: next } },
      {
        onSuccess: () =>
          toast.success(`${gw.displayName} ${next ? "enabled" : "disabled"}`),
        onError: (err) => toast.error(err.message),
        onSettled: () => setTogglingId(null),
      }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Each gateway holds one provider account. Route major programs to
          gateways in Program routing.
        </p>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button
            type="button"
            onClick={openAdd}
            disabled={isLoading || allProvidersConfigured}
            aria-describedby={
              allProvidersConfigured ? "add-gateway-note" : undefined
            }
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            Add gateway
          </Button>
          {allProvidersConfigured && (
            <p
              id="add-gateway-note"
              className="text-[11px] text-muted-foreground"
            >
              Every provider already has a gateway. A second gateway per
              provider needs the gateway API.
            </p>
          )}
        </div>
      </div>

      {isFallback && !isLoading && !isError && (
        <FallbackNotice>
          Showing gateways derived from Settings; full gateway management is
          waiting on the backend (sandbox/payment-routing). Editing a
          gateway&apos;s credentials writes to those Settings rows, which the
          server reads today. Test connection, delete, and a second gateway for
          the same provider are unavailable until then.
        </FallbackNotice>
      )}

      {isLoading ? (
        <CardGridSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load payment gateways"
          error={error}
          onRetry={refetch}
        />
      ) : gateways.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payment gateways yet"
          description={
            isFallback
              ? "No credo_, fcmb_ or flutterwave_ keys were found in Settings. Add a gateway to store its credentials."
              : "Add a gateway to start taking payments through it."
          }
          action={
            <Button type="button" onClick={openAdd}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Add gateway
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gateways.map((gw) => (
            <GatewayCard
              key={gw.id}
              gateway={gw}
              provider={providers.find((p) => p.provider === gw.provider)}
              catalog={providers}
              source={source}
              programNames={programNamesFor(gw)}
              isActiveForNew={isActiveForNew(gw)}
              isTesting={testingId === gw.id}
              isToggling={togglingId === gw.id}
              onEdit={() => {
                setEditing(gw)
                setFormOpen(true)
              }}
              onTest={() => runTest(gw)}
              onDelete={() => setDeleting(gw)}
              onToggleEnabled={(next) => setEnabled(gw, next)}
            />
          ))}
        </div>
      )}

      <GatewayFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        gateway={editing}
        providers={providers}
        providersSource={providersSource}
        source={source}
        configuredProviders={configuredProviders}
      />
      <DeleteGatewayDialog
        gateway={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </div>
  )
}
