"use client"

import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

export interface GlowingButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode
  /** Tailwind gradient string for the glowing aura. Defaults to the theme primary. */
  glowColor?: string
  variant?: "solid" | "outline" | "glass"
  size?: "sm" | "md" | "lg"
}

export const GlowingButton = React.forwardRef<
  HTMLButtonElement,
  GlowingButtonProps
>(
  (
    {
      children,
      className,
      glowColor = "from-primary via-primary/80 to-primary/40",
      variant = "solid",
      size = "md",
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "px-3.5 py-1.5 text-xs rounded-lg gap-1.5",
      md: "px-5 py-2.5 text-sm rounded-xl gap-2",
      lg: "px-7 py-3.5 text-base rounded-2xl gap-2.5",
    }

    return (
      <div className="group relative inline-flex items-center justify-center">
        {/* Ambient Blur Glow (Behind Button) */}
        {!disabled && (
          <div
            className={cn(
              "absolute -inset-0.5 rounded-[inherit] bg-linear-to-r opacity-50 blur-md transition-all duration-500 group-hover:scale-105 group-hover:opacity-100 group-hover:blur-lg",
              glowColor
            )}
          />
        )}

        {/* Main Button Surface */}
        <motion.button
          ref={ref}
          disabled={disabled}
          whileTap={disabled ? undefined : { scale: 0.97 }}
          whileHover={disabled ? undefined : { scale: 1.01 }}
          className={cn(
            "relative inline-flex items-center justify-center font-semibold tracking-wide transition-all duration-200 select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",

            // Solid Variant — the loud, primary-filled action
            variant === "solid" &&
              "border border-primary bg-primary text-primary-foreground shadow-md hover:bg-primary/90",

            // Outline Variant — quiet, sits on the page surface
            variant === "outline" &&
              "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",

            // Glassmorphism Variant
            variant === "glass" &&
              "border border-border/60 bg-card/80 text-foreground backdrop-blur-md hover:bg-card/90",

            sizeClasses[size],
            className
          )}
          {...props}
        >
          {/* Internal Glow Overlay */}
          <span className="relative z-10 flex items-center justify-center gap-[inherit]">
            {children}
          </span>
        </motion.button>
      </div>
    )
  }
)

GlowingButton.displayName = "GlowingButton"
