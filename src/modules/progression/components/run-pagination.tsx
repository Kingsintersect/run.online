"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { PaginationMeta } from "../types"

interface RunPaginationProps {
  meta: PaginationMeta
  /** Noun for the total, e.g. "students" or "runs". */
  noun: string
  onPageChange: (page: number) => void
  perPageOptions?: readonly number[]
  onPerPageChange?: (perPage: number) => void
  disabled?: boolean
  className?: string
}

/** Server-side pagination footer shared by the run workspace and history. */
export function RunPagination({
  meta,
  noun,
  onPageChange,
  perPageOptions,
  onPerPageChange,
  disabled,
  className,
}: RunPaginationProps) {
  const { page, totalPages, total, limit } = meta
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(total, page * limit)

  return (
    <nav
      aria-label={`${noun} pagination`}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground",
        className
      )}
    >
      <p aria-live="polite">
        {total === 0
          ? `No ${noun}`
          : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} ${noun}`}
      </p>
      <div className="flex items-center gap-2">
        {perPageOptions && onPerPageChange && (
          <Select
            value={String(limit)}
            onValueChange={(v) => onPerPageChange(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger size="sm" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {perPageOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
        <span className="tabular-nums">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
