"use client"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 4V2m0 20v-2M4.22 4.22L2.81 2.81M21.19 21.19l-1.41-1.41M4 12H2m20 0h-2M4.22 19.78l-1.41 1.41M21.19 2.81l-1.41 1.41"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
)

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" />
  </svg>
)

const baseClasses =
  "inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors"

export default function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()

  /*
   * Both icons are always rendered and the `dark` variant picks the visible
   * one, so the correct icon paints on the very first frame with no mounted
   * guard and no hydration mismatch. `resolvedTheme` is only read inside the
   * click handler, which never runs during SSR.
   */
  return (
    <motion.button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      initial={{ scale: 1 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
      className={cn(baseClasses, className)}
      title="Toggle light and dark mode"
      aria-label="Toggle light and dark mode"
    >
      <span className="dark:hidden">
        <SunIcon />
      </span>
      <span className="hidden dark:block">
        <MoonIcon />
      </span>
    </motion.button>
  )
}
