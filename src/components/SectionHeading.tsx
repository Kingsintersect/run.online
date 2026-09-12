import React from "react"
import { cn } from "@/lib/utils"

/**
 * Shared section header: bold eyebrow caption, primary rule, then the title.
 * Gives every section across the public site one voice.
 */
export default function SectionHeading({
  eyebrow,
  title,
  accent,
  subtitle,
  align = "center",
  tone = "default",
  className,
}: {
  eyebrow: string
  title: string
  accent?: string
  subtitle?: string
  align?: "center" | "left"
  tone?: "default" | "onDark"
  className?: string
}) {
  const centered = align === "center"
  const onDark = tone === "onDark"

  return (
    <div className={cn(centered ? "text-center" : "text-left", className)}>
      <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
        {eyebrow}
      </p>
      <span
        aria-hidden
        className={cn(
          "mt-3 block h-0.5 w-12 rounded-full bg-primary",
          centered && "mx-auto"
        )}
      />
      <h2
        className={cn(
          "mt-5 text-3xl font-bold tracking-tight sm:text-4xl",
          onDark ? "text-white" : "text-foreground"
        )}
      >
        {title}
        {accent ? <span className="text-primary"> {accent}</span> : null}
      </h2>
      {subtitle ? (
        <p
          className={cn(
            "mt-3 text-sm leading-6",
            onDark ? "text-white/75" : "text-foreground/65",
            centered ? "mx-auto max-w-2xl" : "max-w-xl"
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}
