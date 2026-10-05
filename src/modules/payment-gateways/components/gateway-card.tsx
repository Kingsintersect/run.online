"use client"

import {
  AlertTriangle,
  CircleCheck,
  KeyRound,
  Loader2,
  Pencil,
  PlugZap,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type {
  DataSource,
  GatewayInUseDetails,
  GatewayProvider,
  PaymentGateway,
} from "../types"
import { providerName } from "../lib/provider-catalog"
import { formatDateTime } from "../lib/gateway-eligibility"
import { EnvironmentBadge, HealthBadge } from "./gateway-badges"
import { CopyButton } from "./copy-button"
import { GatewayErrorAlert } from "./gateway-error-alert"

/** The last Enabled-switch or Test-connection failure on this card. */
export interface GatewayCardError {
  message: string
  /** 409 GATEWAY_IN_USE details (disable while assigned). */
  inUse: GatewayInUseDetails | null
}

interface GatewayCardProps {
  gateway: PaymentGateway
  provider: GatewayProvider | undefined
  catalog: GatewayProvider[]
  source: DataSource
  /** Names of the major programs routed to this gateway. */
  programNames: string[]
  /** This gateway is the institution default every new payment uses. */
  isActiveForNew: boolean
  isTesting: boolean
  isToggling: boolean
  onEdit: () => void
  onTest: () => void
  onDelete: () => void
  onToggleEnabled: (next: boolean) => void
  error: GatewayCardError | null
  onDismissError: () => void
}

export function GatewayCard({
  gateway,
  provider,
  catalog,
  source,
  programNames,
  isActiveForNew,
  isTesting,
  isToggling,
  onEdit,
  onTest,
  onDelete,
  onToggleEnabled,
  error,
  onDismissError,
}: GatewayCardProps) {
  const isFallback = source === "fallback"
  const switchId = `gateway-enabled-${gateway.id}`
  const noteId = `gateway-fallback-note-${gateway.id}`
  const name = providerName(catalog, gateway.provider)

  return (
    <article
      aria-labelledby={`gateway-title-${gateway.id}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {name}
          </p>
          <h3
            id={`gateway-title-${gateway.id}`}
            className="truncate text-sm font-semibold text-foreground"
          >
            {gateway.displayName}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {isActiveForNew && (
              <span className="inline-flex h-5 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 text-[11px] font-semibold whitespace-nowrap text-primary dark:border-primary/40 dark:bg-primary/20">
                <CircleCheck className="size-3" aria-hidden="true" />
                Active for new payments
              </span>
            )}
            <EnvironmentBadge env={gateway.environment} />
            <HealthBadge
              status={gateway.health.status}
              title={
                gateway.health.message ??
                (gateway.health.checkedAt
                  ? `Checked ${formatDateTime(gateway.health.checkedAt)}`
                  : undefined)
              }
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <label htmlFor={switchId} className="text-xs text-muted-foreground">
              {gateway.isEnabled ? "Enabled" : "Disabled"}
            </label>
            <Switch
              id={switchId}
              checked={gateway.isEnabled}
              disabled={isFallback || isToggling}
              onCheckedChange={onToggleEnabled}
              aria-describedby={isFallback ? noteId : undefined}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        {error && (
          <GatewayErrorAlert
            message={error.message}
            inUse={error.inUse}
            action="disable"
            onDismiss={onDismissError}
          />
        )}

        {provider && !provider.serverSupported && (
          <div
            role="note"
            className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <AlertTriangle
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>
              The server has no {name} client yet. Keys will be saved, but
              payments can&apos;t route to it until the backend ships it.
            </span>
          </div>
        )}

        {/* Credentials */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Credentials
          </p>
          <dl className="space-y-1">
            {gateway.credentials.map((c) => (
              <div
                key={c.field}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <dt className="shrink-0 text-muted-foreground">{c.label}</dt>
                <dd className="flex min-w-0 items-center gap-1.5">
                  {!c.isSet ? (
                    <span className="text-muted-foreground italic">
                      Not set
                    </span>
                  ) : c.secret ? (
                    <>
                      <KeyRound
                        className="size-3 shrink-0 text-amber-600 dark:text-amber-400"
                        aria-hidden="true"
                      />
                      <span
                        className="truncate font-mono text-foreground"
                        aria-label={`${c.label}: secret, masked`}
                      >
                        {c.maskedValue ?? "••••"}
                      </span>
                    </>
                  ) : (
                    <span className="truncate font-mono text-foreground">
                      {c.value}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Webhook */}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Webhook URL
          </p>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 py-1 pr-1 pl-2.5">
            <code className="min-w-0 flex-1 truncate text-xs text-foreground">
              {gateway.webhookUrl}
            </code>
            <CopyButton
              value={gateway.webhookUrl}
              label={`${gateway.displayName} webhook URL`}
            />
          </div>
        </div>

        {/* Programs */}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Used by
          </p>
          {programNames.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {programNames.map((n) => (
                <li
                  key={n}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  {n}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isFallback
                ? isActiveForNew
                  ? "Every major program (institution default; per-program routing isn't available yet)"
                  : "No programs (per-program routing isn't available yet)"
                : isActiveForNew
                  ? "Programs without their own gateway (institution default)"
                  : "No major program is routed to this gateway"}
            </p>
          )}
        </div>

        {isFallback && (
          <p id={noteId} className="text-[11px] text-muted-foreground">
            Enable/disable, test connection and delete need the gateway API
            (sandbox/payment-routing). Edit saves the credentials to Settings.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={isFallback || isTesting}
          aria-describedby={isFallback ? noteId : undefined}
          aria-label={`Test connection for ${gateway.displayName}`}
        >
          {isTesting ? (
            <Loader2
              className="animate-spin"
              data-icon="inline-start"
              aria-hidden="true"
            />
          ) : (
            <PlugZap data-icon="inline-start" aria-hidden="true" />
          )}
          Test connection
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEdit}
          aria-label={`Edit ${gateway.displayName}`}
        >
          <Pencil data-icon="inline-start" aria-hidden="true" />
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={isFallback}
          aria-describedby={isFallback ? noteId : undefined}
          aria-label={`Delete ${gateway.displayName}`}
          className={cn(
            "text-destructive hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <Trash2 data-icon="inline-start" aria-hidden="true" />
          Delete
        </Button>
      </div>
    </article>
  )
}
