"use client"

import { Eye, EyeOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUpdateAssessmentVisibility } from "../../hooks/use-sync-mutations"

interface VisibilityToggleProps {
  assessmentId: number
  isVisible: boolean
  className?: string
}

export function VisibilityToggle({
  assessmentId,
  isVisible,
  className,
}: VisibilityToggleProps) {
  const { mutate, isPending } = useUpdateAssessmentVisibility()

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    mutate({ id: assessmentId, payload: { isVisible: !isVisible } })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      title={isVisible ? "Hide from students" : "Show to students"}
      className={cn(
        "flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-all",
        isVisible
          ? "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
          : "border-border text-muted-foreground hover:bg-muted/50",
        isPending && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {isPending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : isVisible ? (
        <Eye size={12} />
      ) : (
        <EyeOff size={12} />
      )}
      <span className="hidden sm:inline">
        {isVisible ? "Visible" : "Hidden"}
      </span>
    </button>
  )
}
