"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface CopyButtonProps {
  value: string
  /** Used in the accessible name and the toast, e.g. "webhook URL". */
  label: string
}

/** Copies a non-secret value (never pass a secret here). */
export function CopyButton({ value, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`Copied the ${label}`)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(`Couldn't copy the ${label}`)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={copy}
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <Check
          className="text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
      ) : (
        <Copy aria-hidden="true" />
      )}
    </Button>
  )
}
