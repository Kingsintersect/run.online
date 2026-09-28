"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useFormContext } from "react-hook-form"
import { ExternalLink, Info, ShieldCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  OPTIONAL_CONSENT_PURPOSES,
  type ConsentValues,
} from "../schema/admission-schema"
import type { FormDefaultValues } from "../types/form-types"

/**
 * No endpoint can store an optional consent yet (sandbox/data-protection/
 * API_CONTRACTS.md §2 is the proposal). Until one exists, the optional
 * purposes are shown but disabled, so ticking a box can't look like a choice
 * that was recorded. Flip this only when the submit (or consent) endpoint
 * really persists them.
 */
const OPTIONAL_CONSENTS_RECORDABLE = false

type RequiredConsentKey = keyof Pick<
  ConsentValues,
  "agreeToTerms" | "acknowledgePrivacyNotice"
>

function NoticeLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 font-medium text-primary underline underline-offset-2 hover:no-underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {children}
      <ExternalLink className="size-3" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </Link>
  )
}

function ConsentCheckbox({
  id,
  checked,
  onChange,
  disabled,
  error,
  children,
  description,
}: {
  id: string
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  error?: string
  children: ReactNode
  description?: ReactNode
}) {
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onChange?.(value === true)}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            cn(description && descriptionId, error && errorId) || undefined
          }
          className="mt-0.5"
        />
        <div className="space-y-1">
          <Label
            htmlFor={id}
            className={cn(
              "block text-sm leading-snug font-normal",
              disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
            )}
          >
            {children}
          </Label>
          {description && (
            <p id={descriptionId} className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {error && (
        <p id={errorId} className="pl-7 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Data-protection acknowledgments shown on the Review step, before the
 * application can be submitted (Nigeria Data Protection Act 2023).
 */
export default function ConsentSection() {
  const {
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = useFormContext<FormDefaultValues>()

  const agreeToTerms = watch("agreeToTerms") ?? false
  const acknowledgePrivacyNotice = watch("acknowledgePrivacyNotice") ?? false
  const requiredDone = agreeToTerms && acknowledgePrivacyNotice
  const hasRequiredError = !!(
    errors.agreeToTerms || errors.acknowledgePrivacyNotice
  )

  // The form has no resolver, so shouldValidate doesn't re-run consentSchema;
  // clear the submit-time error as soon as the box is ticked.
  const setRequired = (key: RequiredConsentKey, checked: boolean) => {
    setValue(key, checked, { shouldDirty: true })
    if (checked) clearErrors(key)
  }

  return (
    <section aria-labelledby="consent-heading" className="space-y-4">
      <div>
        <h3
          id="consent-heading"
          className="flex items-center gap-2 text-base font-semibold"
        >
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          Your personal data
        </h3>
        <p className="text-sm text-muted-foreground">
          Please read the Privacy Notice and the Terms of Use before you submit.
          Both open in a new tab.
        </p>
      </div>

      <Card
        className={cn(
          "border-2",
          requiredDone
            ? "border-primary/30 bg-primary/5 dark:bg-primary/10"
            : "border-border",
          hasRequiredError && "border-destructive"
        )}
      >
        <CardContent className="space-y-4 pt-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Required
          </p>
          <ConsentCheckbox
            id="acknowledgePrivacyNotice"
            checked={acknowledgePrivacyNotice}
            onChange={(c) => setRequired("acknowledgePrivacyNotice", c)}
            error={errors.acknowledgePrivacyNotice?.message}
          >
            I have read the{" "}
            <NoticeLink href="/privacy">Privacy Notice</NoticeLink>. I
            understand the university will use my personal data to consider this
            application and, if I am admitted, to keep my academic records.
          </ConsentCheckbox>
          <ConsentCheckbox
            id="agreeToTerms"
            checked={agreeToTerms}
            onChange={(c) => setRequired("agreeToTerms", c)}
            error={errors.agreeToTerms?.message}
          >
            I accept the <NoticeLink href="/terms">Terms of Use</NoticeLink> and
            confirm that the information I have given is accurate and complete.
            I understand that false information may lead to my admission being
            cancelled.
          </ConsentCheckbox>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="space-y-4 pt-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Optional
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Each of these is a separate choice. Saying no to any of them does
              not affect your application.
            </p>
          </div>
          {!OPTIONAL_CONSENTS_RECORDABLE && (
            <p
              role="note"
              className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground dark:bg-muted/50"
            >
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                The portal can&apos;t record these choices yet, so they are
                switched off for now. Until it can, the university treats each
                of them as not agreed. You will be asked separately once they
                can be saved, and you will be able to change your mind later.
              </span>
            </p>
          )}
          {OPTIONAL_CONSENT_PURPOSES.map((purpose) => (
            <ConsentCheckbox
              key={purpose.key}
              id={purpose.key}
              checked={watch(purpose.key) ?? false}
              disabled={!OPTIONAL_CONSENTS_RECORDABLE}
              onChange={(c) => setValue(purpose.key, c, { shouldDirty: true })}
              description={purpose.description}
            >
              {purpose.label}
            </ConsentCheckbox>
          ))}
        </CardContent>
      </Card>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          What is sent: your application carries only a yes to the Terms of Use.
          Your Privacy Notice acknowledgment, which version of each document you
          saw, and the time you agreed are not saved anywhere yet. None of these
          choices are kept in your browser either; you give them again each time
          you submit.
        </span>
      </p>
    </section>
  )
}
