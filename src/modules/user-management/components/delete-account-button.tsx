"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DeleteActionState } from "../lib/account-deletion"

interface DeleteAccountButtonProps {
  state: DeleteActionState
  onRequest: () => void
}

// Row action for DELETE /users/:id. State comes from useAccountDeletion():
// hidden → nothing, deleted → disabled "Already deleted", available → opens
// the typed-confirmation dialog.
export function DeleteAccountButton({
  state,
  onRequest,
}: DeleteAccountButtonProps) {
  if (state === "hidden") return null

  if (state === "deleted") {
    // A disabled button gets no pointer events, so the tooltip sits on a
    // wrapper.
    return (
      <span title="Already deleted" className="inline-flex">
        <Button
          variant="ghost"
          size="sm"
          disabled
          aria-label="Already deleted"
          className="text-muted-foreground"
        >
          <Trash2 size={14} aria-hidden="true" />
        </Button>
      </span>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onRequest}
      title="Delete account (revokes sign-in permanently)"
      aria-label="Delete account"
      className="text-red-700 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
    >
      <Trash2 size={14} aria-hidden="true" />
    </Button>
  )
}
