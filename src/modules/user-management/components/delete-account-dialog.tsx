"use client"

import { useEffect, useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ApiClientError } from "@/lib/clients/apiClient"
import { useDeleteUserAccount } from "../hooks/useUsersData"
import type { DeletableAccount } from "../lib/account-deletion"
import {
  deleteAccountConfirmSchema,
  type DeleteAccountConfirmValues,
} from "../schemas"

interface DeleteAccountDialogProps {
  // null = closed
  account: DeletableAccount | null
  onClose: () => void
}

const EMPTY: DeleteAccountConfirmValues = { confirmation: "" }
const INPUT_ID = "delete-account-confirmation"
const ERROR_ID = "delete-account-confirmation-error"

// Confirmation for DELETE /users/:id (bruno/user/Users - Delete.bru). The copy
// mirrors exactly what the backend does, and does not do, so an admin can
// tell this apart from the reversible Deactivate action.
export function DeleteAccountDialog({
  account,
  onClose,
}: DeleteAccountDialogProps) {
  const deleteAccount = useDeleteUserAccount()
  const email = account?.email ?? ""
  const schema = useMemo(() => deleteAccountConfirmSchema(email), [email])

  const form = useForm<DeleteAccountConfirmValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
    mode: "onChange",
  })

  // Fresh form for every account the dialog opens on.
  useEffect(() => {
    form.reset(EMPTY)
  }, [account?.id, form])

  const typed = useWatch({ control: form.control, name: "confirmation" })
  const matches = schema.safeParse({ confirmation: typed }).success
  const pending = deleteAccount.isPending

  const close = () => {
    form.reset(EMPTY)
    deleteAccount.reset()
    onClose()
  }

  const onSubmit = async () => {
    if (!account) return
    try {
      await deleteAccount.mutateAsync(account.id)
      close()
    } catch (err) {
      // The hook toasts every failure. Already deleted (409) or not
      // permitted (403) won't change on a retry, so close; anything else
      // stays open for another try.
      const status = (err as ApiClientError).status
      if (status === 409 || status === 403) close()
    }
  }

  const fieldError = form.formState.errors.confirmation?.message
  const showError = Boolean(fieldError) && typed.trim().length > 0

  return (
    <AlertDialog
      open={!!account}
      onOpenChange={(open) => {
        if (!open && !pending) close()
      }}
    >
      <AlertDialogContent className="data-[size=default]:sm:max-w-lg">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-5"
          noValidate
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700 dark:text-red-400">
              Delete this account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes this person&apos;s ability to sign in. It
              is not the same as Deactivate.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {account && (
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 dark:bg-muted/30">
              <p className="text-sm font-medium text-foreground">
                {account.name}
              </p>
              <p className="text-xs break-all text-muted-foreground">
                {account.email}
              </p>
            </div>
          )}

          <div className="space-y-2 text-sm text-foreground">
            <p className="font-medium">What happens:</p>
            <ul className="ml-4 list-disc space-y-1.5 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">
                  Sign-in is revoked permanently.
                </span>{" "}
                Every session is signed out and the password is cleared, so this
                account can never sign in again.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  The email is freed.
                </span>{" "}
                The email and username are replaced with an anonymous
                placeholder, so the original email can be used for a new
                registration.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Records and name are kept.
                </span>{" "}
                Grades, payments, enrollments, roles and the person&apos;s name
                stay exactly as they are. The original email and username are
                kept in the audit log.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  This can&apos;t be undone from the portal.
                </span>
              </li>
            </ul>
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              Only need to block access for now? Use Deactivate instead. It can
              be reversed at any time and leaves the email and password as they
              are.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={INPUT_ID} className="block leading-relaxed">
              To confirm, type{" "}
              <span className="font-mono break-all text-foreground">
                {account?.email}
              </span>
            </Label>
            <Input
              id={INPUT_ID}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={pending}
              aria-invalid={showError}
              aria-describedby={showError ? ERROR_ID : undefined}
              {...form.register("confirmation")}
            />
            {showError && (
              <p
                id={ERROR_ID}
                role="alert"
                className="text-xs text-destructive dark:text-red-400"
              >
                {fieldError}
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
              disabled={!matches || pending}
              aria-busy={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
