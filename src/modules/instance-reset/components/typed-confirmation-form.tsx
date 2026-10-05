"use client"

import { useEffect, useId, useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { typedConfirmationSchema } from "../schemas"
import type { ResetError } from "../lib/reset-errors"
import type { TypedConfirmationValues } from "../types"

interface TypedConfirmationFormProps {
  institutionName: string
  submitLabel: string
  isPending: boolean
  /** Server error; CONFIRMATION_MISMATCH / INVALID_PASSWORD land on a field. */
  serverError: ResetError | null
  /** Blocks submission (e.g. the preview expired). */
  blockedReason?: string | null
  onSubmit: (values: TypedConfirmationValues) => void
  onCancel: () => void
  cancelLabel?: string
}

const EMPTY: TypedConfirmationValues = { confirmation: "", password: "" }

/**
 * Type the institution name exactly (case-sensitive, never pre-filled) and
 * enter your password. Shared by "run a reset" and "mark as live". The
 * password lives only in this form's state; the form unmounts (and is reset)
 * when its dialog closes.
 */
export function TypedConfirmationForm({
  institutionName,
  submitLabel,
  isPending,
  serverError,
  blockedReason = null,
  onSubmit,
  onCancel,
  cancelLabel = "Cancel",
}: TypedConfirmationFormProps) {
  const id = useId()
  const schema = useMemo(
    () => typedConfirmationSchema(institutionName),
    [institutionName]
  )
  const {
    register,
    control,
    handleSubmit,
    setError,
    resetField,
    reset,
    formState: { errors },
  } = useForm<TypedConfirmationValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
    mode: "onSubmit",
  })

  // Clear everything typed when the form goes away.
  useEffect(() => () => reset(EMPTY), [reset])

  // Field-level server errors; the password is cleared after a rejection.
  useEffect(() => {
    if (!serverError?.field) return
    if (serverError.field === "password") resetField("password")
    setError(serverError.field, {
      type: "server",
      message:
        serverError.fieldErrors[serverError.field] ?? serverError.message,
    })
  }, [serverError, setError, resetField])

  const typed = useWatch({ control, name: "confirmation" })
  const password = useWatch({ control, name: "password" })
  const nameMatches = typed.trim() === institutionName
  const canSubmit =
    nameMatches && password.length > 0 && !isPending && !blockedReason

  const nameId = `${id}-name`
  const nameHintId = `${id}-name-hint`
  const passwordId = `${id}-password`

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        onSubmit(values)
      })}
      className="space-y-4"
    >
      <Field data-invalid={errors.confirmation ? true : undefined}>
        <FieldLabel htmlFor={nameId}>
          Type the institution name to confirm
        </FieldLabel>
        <p id={nameHintId} className="text-xs text-muted-foreground">
          Type{" "}
          <span className="rounded bg-muted px-1 py-0.5 font-mono font-semibold text-foreground select-none">
            {institutionName}
          </span>{" "}
          exactly, with the same capitals and spacing.
        </p>
        <Input
          id={nameId}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-describedby={nameHintId}
          aria-invalid={errors.confirmation ? true : undefined}
          disabled={isPending}
          {...register("confirmation")}
        />
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {typed.length === 0
            ? ""
            : nameMatches
              ? "Name matches."
              : "Doesn't match yet."}
        </p>
        <FieldError errors={[errors.confirmation]} />
      </Field>

      <Field data-invalid={errors.password ? true : undefined}>
        <FieldLabel htmlFor={passwordId}>Your password</FieldLabel>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          disabled={isPending}
          {...register("password")}
        />
        <FieldError errors={[errors.password]} />
      </Field>

      {blockedReason && (
        <p className="text-xs text-amber-800 dark:text-amber-300">
          {blockedReason}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit}
          className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
        >
          {isPending && (
            <Loader2
              className="animate-spin"
              data-icon="inline-start"
              aria-hidden="true"
            />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
