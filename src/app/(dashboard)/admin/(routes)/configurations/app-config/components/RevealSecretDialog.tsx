"use client"

import { useEffect, useId, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertTriangle, Loader2, LockKeyhole } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiClientError } from "@/lib/clients/apiClient"
import { isEndpointMissing } from "@/modules/student-grades/lib/results-errors"
import { useRevealSecretSetting } from "@/hooks/useConfiguration"
import {
  RevealSecretPayloadSchema,
  type RevealSecretPayload,
  type SafeSetting,
} from "@/services/configurationApi"

export type RevealPurpose = "view" | "copy"

// ── Error mapping (sandbox/payment-secrets API_CONTRACTS §3) ──────────

const ErrorBodySchema = z.object({
  code: z.string().optional(),
  error: z.object({ code: z.string().optional() }).optional(),
  lockedUntil: z.string().optional(),
  retryAfterSeconds: z.number().optional(),
})

interface RevealError {
  message: string
  /** The reveal endpoint isn't on the server yet (CLAUDE.md §14). */
  notAvailable: boolean
}

function formatUntil(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

function toRevealError(error: Error): RevealError {
  if (isEndpointMissing(error)) {
    return {
      notAvailable: true,
      message:
        "Revealing secret settings isn't available on the server yet. You can see the key in the payment gateway's dashboard.",
    }
  }
  const status = error instanceof ApiClientError ? error.status : undefined
  const parsed =
    error instanceof ApiClientError
      ? ErrorBodySchema.safeParse(error.data)
      : null
  const body = parsed?.success ? parsed.data : null
  const code = body?.code ?? body?.error?.code

  if (code === "NOT_A_SECRET" || code === "SECRET_NOT_SET") {
    return {
      notAvailable: false,
      message: "This setting has no secret value to reveal.",
    }
  }
  if (code === "WRONG_PASSWORD" || status === 422 || status === 401) {
    return {
      notAvailable: false,
      message: "That password is not correct. Check it and try again.",
    }
  }
  if (code === "REVEAL_LOCKED" || status === 423) {
    const until = formatUntil(body?.lockedUntil)
    return {
      notAvailable: false,
      message: until
        ? `Too many wrong passwords. Revealing is locked for your account until ${until}.`
        : "Too many wrong passwords. Revealing is locked for your account for now. Try again later.",
    }
  }
  if (status === 429) {
    const secs = body?.retryAfterSeconds
    return {
      notAvailable: false,
      message: secs
        ? `Too many attempts. Wait ${secs} seconds and try again.`
        : "Too many attempts. Wait a minute and try again.",
    }
  }
  if (status === 403) {
    return {
      notAvailable: false,
      message: "Only a super admin can view or copy secret settings.",
    }
  }
  return {
    notAvailable: false,
    message: "The key couldn't be revealed. Try again in a moment.",
  }
}

// ── Dialog ────────────────────────────────────────────────────────────

interface RevealSecretDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  setting: Pick<SafeSetting, "id" | "key">
  purpose: RevealPurpose
  /** Called once with the full value; the caller decides how long to keep it. */
  onRevealed: (value: string) => void
}

export function RevealSecretDialog({
  open,
  onOpenChange,
  setting,
  purpose,
  onRevealed,
}: RevealSecretDialogProps) {
  const passwordId = useId()
  const errorId = useId()
  const reveal = useRevealSecretSetting()
  const { reset: resetMutation } = reveal
  const [error, setError] = useState<RevealError | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RevealSecretPayload>({
    resolver: zodResolver(RevealSecretPayloadSchema),
    defaultValues: { password: "" },
  })

  // The password never outlives the dialog, and neither does the mutation's
  // result: clear both whenever it closes and when it unmounts.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset({ password: "" })
      setError(null)
      resetMutation()
    }
    onOpenChange(next)
  }
  useEffect(() => () => resetMutation(), [resetMutation])

  const onSubmit = handleSubmit(async (payload) => {
    setError(null)
    try {
      const revealed = await reveal.mutateAsync({ id: setting.id, payload })
      resetMutation()
      reset({ password: "" })
      onRevealed(revealed.value)
      handleOpenChange(false)
    } catch (err) {
      reset({ password: "" })
      setError(
        toRevealError(err instanceof Error ? err : new Error(String(err)))
      )
    }
  })

  const action = purpose === "view" ? "View" : "Copy"
  const fieldError = errors.password?.message
  const describedBy = [fieldError || error ? errorId : null]
    .filter(Boolean)
    .join(" ")

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockKeyhole
                className="size-4 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              {action} secret setting
            </DialogTitle>
            <DialogDescription>
              Enter your own password to {action.toLowerCase()}{" "}
              <code className="font-mono text-xs text-foreground">
                {setting.key}
              </code>
              . The key is shown for 30 seconds, then hidden again. Every
              attempt is logged.
            </DialogDescription>
          </DialogHeader>

          {error?.notAvailable ? (
            <div
              role="status"
              className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <p>{error.message}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor={passwordId}>Your password</Label>
              <Input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                autoFocus
                aria-invalid={!!fieldError || !!error}
                aria-describedby={describedBy || undefined}
                disabled={reveal.isPending}
                {...register("password")}
              />
              {(fieldError || error) && (
                <p
                  id={errorId}
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {fieldError ?? error?.message}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={reveal.isPending}
            >
              {error?.notAvailable ? "Close" : "Cancel"}
            </Button>
            {!error?.notAvailable && (
              <Button type="submit" disabled={reveal.isPending}>
                {reveal.isPending && (
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                )}
                {action} key
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
