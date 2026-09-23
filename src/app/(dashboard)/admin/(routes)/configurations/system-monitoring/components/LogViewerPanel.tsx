"use client"

import { useState } from "react"
import { Loader2, RefreshCw, AlertTriangle, FileWarning } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSystemLogs } from "@/hooks/useConfiguration"
import type { SystemLogChannel } from "@/services/configurationApi"

const CHANNELS: { value: SystemLogChannel; label: string; hint: string }[] = [
  {
    value: "laravel",
    label: "Application (laravel)",
    hint: "General app errors — production only logs ERROR level.",
  },
  {
    value: "payments",
    label: "Payments",
    hint: "Webhook/payment-lifecycle trail, debug level regardless of app log level.",
  },
  {
    value: "scheduler",
    label: "Scheduler",
    hint: "Raw stdout from every scheduled command as it actually runs — not date-scoped.",
  },
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function LogViewerPanel() {
  const [channel, setChannel] = useState<SystemLogChannel>("payments")
  const [date, setDate] = useState(todayIso())
  const [lines, setLines] = useState(200)
  const [search, setSearch] = useState("")
  const [searchDraft, setSearchDraft] = useState("")

  const { data, isLoading, isFetching, isError, refetch } = useSystemLogs({
    channel,
    date: channel === "scheduler" ? undefined : date,
    lines,
    search: search || undefined,
  })

  const activeChannel = CHANNELS.find((c) => c.value === channel)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Channel
          </label>
          <Select
            value={channel}
            onValueChange={(v) => setChannel(v as SystemLogChannel)}
          >
            <SelectTrigger className="h-8 w-48 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {channel !== "scheduler" && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Date
            </label>
            <Input
              type="date"
              className="h-8 w-40 text-sm"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Lines
          </label>
          <Input
            type="number"
            min={1}
            max={2000}
            className="h-8 w-24 text-sm"
            value={lines}
            onChange={(e) =>
              setLines(Math.min(2000, Math.max(1, Number(e.target.value) || 1)))
            }
          />
        </div>

        <div className="min-w-48 flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSearch(searchDraft)
            }}
          >
            <Input
              className="h-8 text-sm"
              placeholder="e.g. a payment reference number…"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </form>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 gap-1.5"
        >
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {activeChannel && (
        <p className="text-xs text-muted-foreground">{activeChannel.hint}</p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          <AlertTriangle size={20} className="opacity-50" />
          Couldn&apos;t load logs — this endpoint is super-admin only.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {data?.exists === false ? (
              <Badge variant="secondary" className="gap-1">
                <FileWarning size={10} data-icon="inline-start" />
                No log file for this day
              </Badge>
            ) : (
              <>
                <Badge variant="outline">
                  {data?.matchedLines ?? 0} matched
                </Badge>
                {typeof data?.returnedLines === "number" && (
                  <Badge variant="outline">showing {data.returnedLines}</Badge>
                )}
                {data?.truncatedFromBytes != null && (
                  <Badge variant="outline">
                    tail of a larger file (truncated from{" "}
                    {Math.round(data.truncatedFromBytes / 1024)} KB)
                  </Badge>
                )}
              </>
            )}
            {data?.path && (
              <span className="truncate font-mono opacity-60">{data.path}</span>
            )}
          </div>

          <div className="max-h-[32rem] overflow-auto rounded-xl border border-border bg-muted/30 p-3">
            {!data?.lines.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No matching log lines.
              </p>
            ) : (
              <pre className="font-mono text-xs whitespace-pre-wrap text-foreground">
                {data.lines.join("\n")}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
