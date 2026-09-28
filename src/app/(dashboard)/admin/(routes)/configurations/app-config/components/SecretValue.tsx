"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Copy, Eye, EyeOff, KeyRound } from "lucide-react"
import { toast } from "sonner"
import type { SafeSetting } from "@/services/configurationApi"
import { RevealSecretDialog, type RevealPurpose } from "./RevealSecretDialog"

/** How long a revealed secret stays on screen (spec: 30 seconds). */
const REVEAL_SECONDS = 30

const iconButton =
  "rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

interface SecretValueProps {
  setting: SafeSetting
  /** Super admin only; without it the masked value is all there is. */
  canReveal: boolean
}

/**
 * A secret setting's value cell (sandbox/payment-secrets FRONTEND §2). Shows
 * the mask; View / Copy re-check the viewer's password through the reveal
 * endpoint. A revealed value lives only in this component's state, hides
 * itself after 30 seconds, and is dropped on unmount. It never goes into a
 * `title`, a query cache or browser storage.
 */
export function SecretValue({ setting, canReveal }: SecretValueProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  // Kept after closing so the dialog title doesn't change while it fades out.
  const [purpose, setPurpose] = useState<RevealPurpose>("view")
  const [revealed, setRevealed] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const hide = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setRevealed(null)
    setSecondsLeft(0)
  }, [])

  useEffect(() => hide, [hide])

  const show = (value: string) => {
    hide()
    setRevealed(value)
    setSecondsLeft(REVEAL_SECONDS)
    const hideAt = Date.now() + REVEAL_SECONDS * 1000
    timer.current = setInterval(() => {
      const left = Math.ceil((hideAt - Date.now()) / 1000)
      if (left <= 0) hide()
      else setSecondsLeft(left)
    }, 250)
  }

  const openDialog = (next: RevealPurpose) => {
    setPurpose(next)
    setDialogOpen(true)
  }

  const handleRevealed = async (value: string) => {
    if (purpose === "copy") {
      try {
        await navigator.clipboard.writeText(value)
        toast.success(`${setting.key} copied to the clipboard`)
        return
      } catch {
        toast.error("Couldn't copy to the clipboard. Showing the key instead.")
      }
    }
    show(value)
  }

  if (!setting.isSet) {
    return <span className="text-xs text-muted-foreground italic">Not set</span>
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <KeyRound
        size={12}
        className="shrink-0 text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      />
      {revealed !== null ? (
        <span className="max-w-65 font-mono text-xs break-all text-foreground">
          {revealed}
        </span>
      ) : (
        <span
          className="max-w-65 truncate font-mono text-xs text-foreground"
          aria-label={`${setting.key}: secret, masked`}
        >
          {setting.maskedValue ?? "••••"}
        </span>
      )}
      {revealed !== null && (
        <span
          className="shrink-0 text-[10px] text-muted-foreground tabular-nums"
          aria-live="polite"
        >
          hides in {secondsLeft}s
        </span>
      )}
      {canReveal && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
          {revealed !== null ? (
            <button
              type="button"
              onClick={hide}
              className={iconButton}
              aria-label={`Hide ${setting.key}`}
            >
              <EyeOff size={12} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openDialog("view")}
              className={iconButton}
              aria-label={`View ${setting.key}`}
            >
              <Eye size={12} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => openDialog("copy")}
            className={iconButton}
            aria-label={`Copy ${setting.key}`}
          >
            <Copy size={12} aria-hidden="true" />
          </button>
        </div>
      )}
      {canReveal && (
        <RevealSecretDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          setting={setting}
          purpose={purpose}
          onRevealed={handleRevealed}
        />
      )}
    </div>
  )
}
