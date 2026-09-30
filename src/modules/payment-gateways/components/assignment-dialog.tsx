"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, ArrowRight, Loader2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ACTIVE_GATEWAY_PROVIDERS,
  ActiveGatewayProviderSchema,
  AssignmentFormSchema,
} from "../schemas"
import {
  useSetActiveGateway,
  useUpdateDefaultGateway,
  useUpdateGatewayAssignment,
} from "../hooks/use-payment-gateway-mutations"
import { gatewayEligibility, gatewayLabel } from "../lib/gateway-eligibility"
import { providerName } from "../lib/provider-catalog"
import type {
  ActiveGatewayProvider,
  AssignmentFormValues,
  GatewayAssignment,
  GatewayProvider,
  PaymentGateway,
} from "../types"

export type AssignmentTarget =
  | { kind: "program"; assignment: GatewayAssignment }
  | { kind: "default"; defaultGatewayId: number | null }
  /**
   * The live institution-wide switch (`PATCH /fees/gateway`), used while the
   * proposed assignments API is missing. Picks a provider, not a gateway id.
   */
  | { kind: "active-gateway"; current: ActiveGatewayProvider | null }

interface AssignmentDialogProps {
  target: AssignmentTarget | null
  onOpenChange: (open: boolean) => void
  gateways: PaymentGateway[]
  providers: GatewayProvider[]
}

const NONE = "none"
const toId = (v: string): number | null => (v === NONE ? null : Number(v))
const toValue = (id: number | null): string => (id === null ? NONE : String(id))

export function AssignmentDialog({
  target,
  onOpenChange,
  gateways,
  providers,
}: AssignmentDialogProps) {
  const [step, setStep] = useState<"form" | "confirm">("form")
  const updateProgram = useUpdateGatewayAssignment()
  const updateDefault = useUpdateDefaultGateway()
  const setActive = useSetActiveGateway()
  const isSaving =
    updateProgram.isPending || updateDefault.isPending || setActive.isPending
  const isActiveSwitch = target?.kind === "active-gateway"
  const isDefault = target?.kind === "default" || isActiveSwitch

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    getValues,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(AssignmentFormSchema),
    defaultValues: {
      gatewayId: NONE,
      fallbackGatewayId: NONE,
      autoFailover: false,
      reason: "",
    },
  })
  const gatewayId = useWatch({ control, name: "gatewayId" })
  const fallbackGatewayId = useWatch({ control, name: "fallbackGatewayId" })
  const autoFailover = useWatch({ control, name: "autoFailover" })

  useEffect(() => {
    if (!target) return
    setStep("form")
    updateProgram.reset()
    updateDefault.reset()
    setActive.reset()
    reset(
      target.kind === "program"
        ? {
            gatewayId: toValue(target.assignment.gatewayId),
            fallbackGatewayId: toValue(target.assignment.fallbackGatewayId),
            autoFailover: target.assignment.autoFailover,
            reason: "",
          }
        : {
            // For the active-gateway switch the select holds a provider slug.
            gatewayId:
              target.kind === "active-gateway"
                ? (target.current ?? ACTIVE_GATEWAY_PROVIDERS[0])
                : toValue(target.defaultGatewayId),
            fallbackGatewayId: NONE,
            autoFailover: false,
            reason: "",
          }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset per target
  }, [target])

  const close = (open: boolean) => {
    if (isSaving) return
    onOpenChange(open)
  }

  const label = (id: number | null, empty: string) =>
    gatewayLabel(gateways, providers, id) ?? empty
  const primaryEmpty = isDefault ? "Server default" : "Institution default"

  const currentPrimary =
    target?.kind === "program"
      ? target.assignment.gatewayId
      : target?.kind === "default"
        ? target.defaultGatewayId
        : null
  const chosen = isActiveSwitch
    ? undefined
    : gateways.find((g) => g.id === toId(gatewayId))
  const chosenProvider = providers.find(
    (p) => p.provider === (isActiveSwitch ? gatewayId : chosen?.provider)
  )

  // Active-gateway switch: the "before -> after" labels are provider names.
  const currentActive =
    target?.kind === "active-gateway" ? target.current : null
  const beforeLabel = isActiveSwitch
    ? currentActive
      ? providerName(providers, currentActive)
      : "Server default"
    : label(currentPrimary, primaryEmpty)
  const afterLabel = isActiveSwitch
    ? providerName(providers, gatewayId)
    : label(toId(gatewayId), primaryEmpty)

  // Warn, never block (the server only fails on the next payment attempt)
  // when switching to a provider whose required credentials look unset.
  const credentialWarning = ((): string | null => {
    if (!isActiveSwitch) return null
    const name = providerName(providers, gatewayId)
    const candidates = gateways.filter((g) => g.provider === gatewayId)
    if (candidates.length === 0)
      return `No ${name} credentials were found in Settings.`
    if (candidates.some((g) => gatewayEligibility(g, providers).eligible))
      return null
    const reason = gatewayEligibility(candidates[0], providers).reason
    return `${name} looks incompletely configured${reason ? ` (${reason})` : ""}.`
  })()

  const save = async () => {
    if (!target) return
    const v = getValues()
    try {
      if (target.kind === "active-gateway") {
        const gateway = ActiveGatewayProviderSchema.parse(v.gatewayId)
        // The reason is UI-only here: PATCH /fees/gateway takes just
        // `{ gateway }` and keeps no history. It is still asked for so the
        // switch gets the same deliberate review step as any routing change.
        const now = await setActive.mutateAsync({ gateway })
        toast.success(
          `New payments now go through ${providerName(providers, now)}`
        )
      } else if (target.kind === "program") {
        await updateProgram.mutateAsync({
          majorProgramId: target.assignment.majorProgramId,
          payload: {
            gatewayId: toId(v.gatewayId),
            fallbackGatewayId: toId(v.fallbackGatewayId),
            autoFailover: v.autoFailover,
            reason: v.reason,
          },
        })
        toast.success(
          `${target.assignment.majorProgramName} now routes to ${label(toId(v.gatewayId), primaryEmpty)}`
        )
      } else {
        await updateDefault.mutateAsync({
          gatewayId: toId(v.gatewayId),
          reason: v.reason,
        })
        toast.success("Institution default gateway updated")
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't save the routing"
      )
    }
  }

  const title =
    target?.kind === "program"
      ? `Route ${target.assignment.majorProgramName}`
      : "Institution default gateway"
  const reasonHelpId = "assignment-reason-help"

  return (
    <Dialog open={target !== null} onOpenChange={close}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? title : "Confirm gateway switch"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? isActiveSwitch
                ? "The gateway every new payment goes through. Payments already started keep their own gateway."
                : isDefault
                  ? "Used by any major program that has no gateway of its own."
                  : "Pick the gateway new payments for this programme go through."
              : "Check the change before it takes effect."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <form
            id="assignment-form"
            noValidate
            onSubmit={handleSubmit(() => setStep("confirm"))}
            className="space-y-4"
          >
            {/* Primary */}
            <div className="space-y-1.5">
              <Label htmlFor="assignment-gateway">Gateway</Label>
              <Select
                value={gatewayId}
                onValueChange={(v) => {
                  setValue("gatewayId", v, { shouldValidate: true })
                  if (v !== NONE && v === getValues("fallbackGatewayId")) {
                    setValue("fallbackGatewayId", NONE)
                  }
                }}
              >
                <SelectTrigger id="assignment-gateway" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isActiveSwitch ? (
                    ACTIVE_GATEWAY_PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {providerName(providers, p)}
                        {p === currentActive ? " (current)" : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value={NONE}>
                        {isDefault
                          ? "None (server default)"
                          : "Use the institution default"}
                      </SelectItem>
                      {gateways.map((g) => {
                        const e = gatewayEligibility(g, providers)
                        return (
                          <SelectItem
                            key={g.id}
                            value={String(g.id)}
                            disabled={!e.eligible}
                          >
                            {label(g.id, "")}
                            {e.reason ? ` (${e.reason})` : ""}
                          </SelectItem>
                        )
                      })}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {isActiveSwitch
                  ? "The server supports Credo and FCMB for this switch."
                  : "Only enabled gateways with every required credential can be picked."}
              </p>
            </div>

            {credentialWarning && (
              <div
                role="note"
                className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <AlertTriangle
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  {credentialWarning} You can still switch, but new payments
                  will fail with a gateway configuration error until its keys
                  are set on the Gateways tab.
                </span>
              </div>
            )}

            {chosenProvider && !chosenProvider.serverSupported && (
              <div
                role="note"
                className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <AlertTriangle
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  The server has no {chosenProvider.name} client yet. The server
                  may refuse this routing, or payments may fail, until the
                  backend ships it.
                </span>
              </div>
            )}

            {!isDefault && (
              <>
                {/* Fallback */}
                <div className="space-y-1.5">
                  <Label htmlFor="assignment-fallback">Fallback gateway</Label>
                  <Select
                    value={fallbackGatewayId}
                    onValueChange={(v) => {
                      setValue("fallbackGatewayId", v, { shouldValidate: true })
                      if (v === NONE) setValue("autoFailover", false)
                    }}
                  >
                    <SelectTrigger
                      id="assignment-fallback"
                      className="w-full"
                      aria-invalid={!!errors.fallbackGatewayId}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No fallback</SelectItem>
                      {gateways.map((g) => {
                        const e = gatewayEligibility(g, providers)
                        const same = String(g.id) === gatewayId
                        const reason = same ? "same as primary" : e.reason
                        return (
                          <SelectItem
                            key={g.id}
                            value={String(g.id)}
                            disabled={same || !e.eligible}
                          >
                            {label(g.id, "")}
                            {reason ? ` (${reason})` : ""}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {errors.fallbackGatewayId && (
                    <p className="text-xs text-destructive">
                      {errors.fallbackGatewayId.message}
                    </p>
                  )}
                </div>

                {/* Auto-failover */}
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
                  <div>
                    <Label htmlFor="assignment-failover">Auto-failover</Label>
                    <p
                      id="assignment-failover-hint"
                      className="mt-0.5 text-xs text-muted-foreground"
                    >
                      Switch new payments to the fallback while the primary
                      gateway&apos;s health check is failing.
                    </p>
                    {errors.autoFailover && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.autoFailover.message}
                      </p>
                    )}
                  </div>
                  <Switch
                    id="assignment-failover"
                    checked={autoFailover}
                    disabled={fallbackGatewayId === NONE}
                    aria-describedby="assignment-failover-hint"
                    onCheckedChange={(v) =>
                      setValue("autoFailover", v, { shouldValidate: true })
                    }
                  />
                </div>
              </>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="assignment-reason">Reason</Label>
              <Textarea
                id="assignment-reason"
                rows={2}
                placeholder="e.g. Moving Certificate collections to Flutterwave"
                aria-invalid={!!errors.reason}
                aria-required="true"
                aria-describedby={reasonHelpId}
                {...register("reason")}
              />
              {errors.reason ? (
                <p id={reasonHelpId} className="text-xs text-destructive">
                  {errors.reason.message}
                </p>
              ) : (
                <p id={reasonHelpId} className="text-xs text-muted-foreground">
                  {isActiveSwitch
                    ? "For your own review only: the server doesn't store a reason for this switch yet."
                    : "Kept in the routing history."}
                </p>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">{beforeLabel}</span>
              <ArrowRight
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="font-semibold text-foreground">
                {afterLabel}
              </span>
            </div>
            {credentialWarning && (
              <p className="text-xs text-amber-800 dark:text-amber-200">
                {credentialWarning}
              </p>
            )}
            {!isDefault && (
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <dt className="text-muted-foreground">Fallback</dt>
                <dd className="text-foreground">
                  {label(toId(fallbackGatewayId), "None")}
                </dd>
                <dt className="text-muted-foreground">Auto-failover</dt>
                <dd className="text-foreground">
                  {autoFailover ? "On" : "Off"}
                </dd>
              </dl>
            )}
            <div
              role="note"
              className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <ShieldAlert
                className="mt-0.5 size-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>
                Only new payments are affected. Payments already started keep
                verifying and refunding on the gateway they started on.
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "form" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => close(false)}
              >
                Cancel
              </Button>
              <Button type="submit" form="assignment-form">
                Review change
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("form")}
                disabled={isSaving}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={save}
                disabled={isSaving}
                autoFocus
              >
                {isSaving && (
                  <Loader2
                    className="animate-spin"
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                )}
                Confirm switch
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
