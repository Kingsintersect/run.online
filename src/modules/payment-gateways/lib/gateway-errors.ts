import { ApiClientError } from "@/lib/clients/apiClient"
import { GatewayErrorBodySchema } from "../schemas"
import type { GatewayInUseDetails } from "../types"

// Every documented error from bruno/payment-routing (gateways + assignments)
// and the legacy `PATCH /fees/gateway` bridge, mapped to one plain message per
// action. Components show these next to the control that caused them instead
// of a generic failure toast.

export interface GatewayError {
  status: number | null
  code: string | null
  message: string
  /** Laravel `errors.*`, first message per key (`credentials.secret_key`, …). */
  fieldErrors: Record<string, string>
  /** 409 GATEWAY_IN_USE details, when the server sent them. */
  inUse: GatewayInUseDetails | null
}

/** Parses any error; never throws. */
export function parseGatewayError(error: Error): GatewayError {
  if (!(error instanceof ApiClientError)) {
    return {
      status: null,
      code: null,
      message: error.message,
      fieldErrors: {},
      inUse: null,
    }
  }
  const parsed = GatewayErrorBodySchema.safeParse(error.data)
  const body = parsed.success ? parsed.data : null
  const fieldErrors: Record<string, string> = {}
  for (const [key, value] of Object.entries(body?.errors ?? {})) {
    const first = Array.isArray(value) ? value[0] : value
    if (first) fieldErrors[key] = first
  }
  const code =
    body?.code ??
    /\b(GATEWAY_IN_USE|GATEWAY_NOT_READY|GATEWAY_NOT_SUPPORTED|DEFAULT_REQUIRED)\b/.exec(
      error.message
    )?.[1] ??
    null
  return {
    status: error.status ?? null,
    code,
    message: body?.message ?? error.message,
    fieldErrors,
    inUse:
      code === "GATEWAY_IN_USE"
        ? (body?.details ?? {
            majorProgramIds: [],
            isDefault: false,
            pendingPayments: 0,
          })
        : null,
  }
}

/** 409 GATEWAY_IN_USE (delete, or disable while assigned). */
export function isGatewayInUse(error: Error | null): boolean {
  if (!error) return false
  const e = parseGatewayError(error)
  return e.status === 409 && e.code === "GATEWAY_IN_USE"
}

const NOT_READY =
  "That gateway isn't ready: it's disabled or missing a required credential. Enable it and fill in its keys on the Gateways tab, then try again."

/** "the FCMB client" / "a client for this provider". */
function clientPhrase(providerName: string | null): string {
  return providerName ? `${providerName} client` : "client for this provider"
}

function notSupported(providerName: string | null): string {
  return `The server has no ${clientPhrase(providerName)} yet, so payments can't be routed to it. Pick a different gateway.`
}

/** First field message, or the server's message, or a fallback. */
function firstMessage(e: GatewayError, fallback: string): string {
  return Object.values(e.fieldErrors)[0] ?? (e.message || fallback)
}

/**
 * The card's Enabled switch (`PATCH /payments/gateways/:id { isEnabled }`).
 * A 409 GATEWAY_IN_USE should be rendered with <GatewayInUseNotice> using
 * `inUse`; this is its one-line summary.
 */
export function toggleErrorMessage(error: Error, enabling: boolean): string {
  const e = parseGatewayError(error)
  if (e.status === 409 && e.code === "GATEWAY_IN_USE")
    return "Can't disable this gateway while it's in use:"
  if (e.status === 422 && enabling)
    return `Can't enable this gateway: ${firstMessage(e, "a required credential is missing")}. Edit it to fill in the missing credentials first.`
  return e.message
}

/** `POST /payments/gateways/:id/test`. */
export function testErrorMessage(
  error: Error,
  providerName: string | null
): string {
  const e = parseGatewayError(error)
  if (e.status === 429)
    return "Too many connection tests (6 per minute). Wait a minute and try again."
  if (e.code === "GATEWAY_NOT_SUPPORTED")
    return `Connection test isn't available: the server has no ${clientPhrase(providerName)} yet.`
  if (e.code === "GATEWAY_NOT_READY") return NOT_READY
  return e.message
}

/**
 * `PUT /payments/gateway-assignments/:majorProgramId` and `/default`, and
 * the legacy `PATCH /fees/gateway` bridge (`legacy: true`).
 */
export function routingErrorMessages(
  error: Error,
  options: { providerName: string | null; legacy: boolean }
): string[] {
  const e = parseGatewayError(error)
  if (options.legacy && e.status === 409)
    return [
      "More than one gateway uses this provider, so the server can't tell which one to make the default. Set the default from the gateway list instead.",
      ...(e.message ? [`Server: ${e.message}`] : []),
    ]
  switch (e.code) {
    case "GATEWAY_NOT_READY":
      return [NOT_READY]
    case "GATEWAY_NOT_SUPPORTED":
      return [notSupported(options.providerName)]
    case "DEFAULT_REQUIRED":
      return [
        "The institution default can't be cleared while some major programs still follow it. Give every program its own gateway first, or pick a gateway here.",
      ]
  }
  if (e.status === 404)
    return [
      "That major program no longer exists. Close this dialog and reload.",
    ]
  const fields = Object.entries(e.fieldErrors).map(([key, msg]) =>
    key === "fallbackGatewayId"
      ? `Fallback gateway: ${msg}`
      : key === "autoFailover"
        ? `Auto-failover: ${msg}`
        : key === "reason"
          ? `Reason: ${msg}`
          : msg
  )
  return fields.length > 0 ? fields : [e.message]
}

/** Gateway form fields that can carry a server field error inline. */
export type GatewayFormErrorField =
  | "provider"
  | "displayName"
  | "environment"
  | `credentials.${string}`

export interface GatewayFormErrors {
  /** Errors placed on a rendered form field. */
  fields: { name: GatewayFormErrorField; message: string }[]
  /** Everything else, for a form-level alert. */
  form: string[]
}

type TopLevelField = "provider" | "displayName" | "environment"

function isTopLevelField(key: string): key is TopLevelField {
  return key === "provider" || key === "displayName" || key === "environment"
}

/**
 * Create/update 422: `errors.credentials.<key>` lands on the matching dynamic
 * credential input when it is rendered; an unknown key, `credentials` itself,
 * `isEnabled` and anything else goes to the form-level alert.
 */
export function gatewayFormErrors(
  error: Error,
  renderedCredentialFields: string[]
): GatewayFormErrors {
  const e = parseGatewayError(error)
  const result: GatewayFormErrors = { fields: [], form: [] }
  if (e.status !== 422 || Object.keys(e.fieldErrors).length === 0) {
    result.form.push(e.message)
    return result
  }
  const rendered = new Set(renderedCredentialFields)
  for (const [key, message] of Object.entries(e.fieldErrors)) {
    const credential = /^credentials\.(.+)$/.exec(key)?.[1]
    if (credential && rendered.has(credential)) {
      result.fields.push({ name: `credentials.${credential}`, message })
    } else if (isTopLevelField(key)) {
      result.fields.push({ name: key, message })
    } else if (credential) {
      result.form.push(`Credential "${credential}": ${message}`)
    } else {
      result.form.push(message)
    }
  }
  return result
}
