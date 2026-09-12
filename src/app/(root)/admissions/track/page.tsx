"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2, Search, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import StatusBadge from "@/components/custom/StatusBadge"
import { applicationReviewApi } from "@/services/applicationReviewApi"

type Result =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "found"; applicationNumber: string; status: string }
  | { state: "error"; message: string }

const STATUS_LABEL: Record<
  string,
  {
    label: string
    variant: "success" | "warning" | "destructive" | "info" | "default"
  }
> = {
  pending: { label: "Pending review", variant: "warning" },
  under_review: { label: "Under review", variant: "info" },
  approved: { label: "Approved", variant: "success" },
  denied: { label: "Not successful", variant: "destructive" },
  withdrawn: { label: "Withdrawn", variant: "default" },
}

export default function TrackApplicationPage() {
  const [number, setNumber] = useState("")
  const [result, setResult] = useState<Result>({ state: "idle" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = number.trim()
    if (!trimmed) return
    setResult({ state: "loading" })
    try {
      const res = await applicationReviewApi.track(trimmed)
      setResult({
        state: "found",
        applicationNumber: res.data.applicationNumber,
        status: res.data.status,
      })
    } catch (err) {
      const status = (err as { status?: number } | null)?.status
      setResult({
        state: "error",
        message:
          status === 404
            ? "No application found with that number. Double-check and try again."
            : err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
      })
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Link
        href="/admissions"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to Admissions
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-card p-6 sm:p-8"
      >
        <h1 className="text-xl font-bold text-foreground">
          Track your application
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the application number you received when you submitted, to check
          its current status. No login needed.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
          <Input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="e.g. APP-2026-00042"
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={result.state === "loading" || !number.trim()}
            className="gap-1.5"
          >
            {result.state === "loading" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Search size={15} />
            )}
            Check
          </Button>
        </form>

        {result.state === "found" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl border border-border bg-muted/30 p-4"
          >
            <p className="font-mono text-xs text-muted-foreground">
              {result.applicationNumber}
            </p>
            <div className="mt-2">
              <StatusBadge
                dot
                label={STATUS_LABEL[result.status]?.label ?? result.status}
                variant={STATUS_LABEL[result.status]?.variant ?? "default"}
              />
            </div>
          </motion.div>
        )}

        {result.state === "error" && (
          <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {result.message}
          </p>
        )}
      </motion.div>
    </div>
  )
}
