"use client"

import { useId, useMemo, useState } from "react"
import { Check, Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useBanks } from "../hooks/use-settlement-accounts"

interface BankSelectProps {
  id?: string
  value: string
  onChange: (bankCode: string) => void
  invalid?: boolean
  describedBy?: string
}

/** Searchable bank picker — `/payments/banks`, else the offline list. */
export function BankSelect({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: BankSelectProps) {
  const { banks, isFallback, isLoading } = useBanks()
  const [search, setSearch] = useState("")
  const listId = useId()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return banks
    return banks.filter(
      (b) => b.name.toLowerCase().includes(q) || b.code.includes(q)
    )
  }, [banks, search])

  const selected = banks.find((b) => b.code === value)

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={id}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            selected ? `Selected: ${selected.name}` : "Search banks…"
          }
          className="pl-8"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          autoComplete="off"
        />
      </div>
      <div
        id={listId}
        role="listbox"
        aria-label="Banks"
        className={cn(
          "max-h-40 overflow-y-auto rounded-md border bg-background p-1 dark:bg-input/30",
          invalid ? "border-destructive" : "border-input"
        )}
      >
        {isLoading ? (
          <p className="flex items-center gap-1.5 p-2 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" aria-hidden />
            Loading banks…
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">
            No bank matches &ldquo;{search}&rdquo;.
          </p>
        ) : (
          filtered.map((bank) => {
            const isSelected = bank.code === value
            return (
              <button
                key={bank.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(bank.code)
                  // Clear the query so the "Selected: …" placeholder shows.
                  setSearch("")
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none dark:hover:bg-muted/50",
                  isSelected &&
                    "bg-primary/10 font-medium text-primary dark:bg-primary/20"
                )}
              >
                <span>{bank.name}</span>
                {isSelected && <Check size={14} aria-hidden />}
              </button>
            )
          })
        )}
      </div>
      {isFallback && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Offline bank list — the server&apos;s bank list (
          <code className="font-mono">/payments/banks</code>) isn&apos;t
          available yet.
        </p>
      )}
    </div>
  )
}
