"use client"

import { useRef, type KeyboardEvent } from "react"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SettlementProgramOption } from "../hooks/use-settlement-programs"

interface ProgramSwitcherProps {
  programs: SettlementProgramOption[]
  value: number | null
  onChange: (majorProgramId: number) => void
  className?: string
}

// Unlike MajorProgramTabs/MajorProgramFilterTabs this has no "All" option:
// settlement accounts and split rules are always configured per program.
export function ProgramSwitcher({
  programs,
  value,
  onChange,
  className,
}: ProgramSwitcherProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  if (programs.length === 1) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-muted-foreground",
          className
        )}
      >
        <Building2 size={14} aria-hidden />
        <span>
          Major program:{" "}
          <strong className="text-foreground">{programs[0].name}</strong>
        </span>
      </div>
    )
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    e.preventDefault()
    const delta = e.key === "ArrowRight" ? 1 : -1
    const next = (index + delta + programs.length) % programs.length
    refs.current[next]?.focus()
    onChange(programs[next].id)
  }

  return (
    <div
      role="tablist"
      aria-label="Major program"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {programs.map((mp, index) => {
        const selected = value === mp.id
        return (
          <button
            key={mp.id}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(mp.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              selected
                ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                : "border-border bg-muted text-muted-foreground hover:bg-accent dark:bg-muted/50"
            )}
          >
            {mp.name}
          </button>
        )
      })}
    </div>
  )
}
