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
import { AssignmentFormSchema } from "../schemas"
import {
  useUpdateDefaultGateway,
  useUpdateGatewayAssignment,
} from "../hooks/use-payment-gateway-mutations"
import { gatewayEligibility, gatewayLabel } from "../lib/gateway-eligibility"
import type {
  AssignmentFormValues,
  GatewayAssignment,
  GatewayProvider,
  PaymentGateway,
} from "../types"

export type AssignmentTarget =
  | { kind: "program"; assignment: GatewayAssignment }
  | { kind: "default"; defaultGatewayId: number | null }

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
  const isSaving = updateProgram.isPending || updateDefault.isPending
  const isDefault = target?.kind === "default"

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
    reset(
      target.kind === "program"
        ? {
            gatewayId: toValue(target.assignment.gatewayId),
            fallbackGatewayId: toValue(target.assignment.fallbackGatewayId),
            autoFailover: target.assignment.autoFailover,
            reason: "",
          }
        : {
            gatewayId: toValue(target.defaultGatewayId),
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
      : (target?.defaultGatewayId ?? null)
  const chosen = gateways.find((g) => g.id === toId(gatewayId))
  const chosenProvider = providers.find((p) => p.provider === chosen?.provider)

  const save = async () => {
    if (!target) return
    const v = getValues()
    try {
      if (target.kind === "program") {
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

  return (
    <Dialog open={target !== null} onOpenChange={close}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? title : "Confirm gateway switch"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? isDefault
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
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only enabled gateways with every required credential can be
                picked.
              </p>
            </div>

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
                {...register("reason")}
              />
              {errors.reason ? (
                <p className="text-xs text-destructive">
                  {errors.reason.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Kept in the routing history.
                </p>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">
                {label(currentPrimary, primaryEmpty)}
              </span>
              <ArrowRight
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="font-semibold text-foreground">
                {label(toId(gatewayId), primaryEmpty)}
              </span>
            </div>
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
