"use client"

import { cn } from "@/lib/utils"

interface ProgressProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** Completion percentage, 0–100. Pass `null` for an indeterminate bar. */
  value?: number | null
  /** Accessible name for the bar — required, since it has no visible label. */
  label: string
  /** Class names applied to the moving indicator rather than the track. */
  indicatorClassName?: string
}

/**
 * Determinate / indeterminate progress bar.
 *
 * Built on a plain `div` with the ARIA `progressbar` role rather than
 * `@radix-ui/react-progress`, which isn't a declared dependency of this
 * project — the primitive is presentational and has no interaction model, so
 * there's nothing Radix would add here beyond an extra package.
 *
 * Passing `value={null}` renders an indeterminate sweep, for the phase where
 * work is ongoing but its completion can't be measured (e.g. the server
 * processing an upload that has already finished transferring).
 */
function Progress({
  value,
  label,
  className,
  indicatorClassName,
  ...props
}: ProgressProps) {
  const isIndeterminate = value === null || value === undefined
  const clamped = isIndeterminate ? 0 : Math.min(100, Math.max(0, value))

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isIndeterminate ? undefined : Math.round(clamped)}
      aria-valuetext={
        isIndeterminate ? "In progress" : `${Math.round(clamped)}%`
      }
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted dark:bg-muted/50",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn(
          "h-full rounded-full bg-primary",
          isIndeterminate
            ? "w-1/3 animate-[progress-sweep_1.2s_ease-in-out_infinite]"
            : "transition-[width] duration-300 ease-out",
          indicatorClassName
        )}
        style={isIndeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  )
}

export { Progress }
