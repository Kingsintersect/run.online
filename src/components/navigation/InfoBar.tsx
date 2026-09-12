"use client"
import React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Mail, Phone, Search } from "lucide-react"
import ThemeToggle from "../ThemeToggle"
import { cn } from "@/lib/utils"
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  UNIVERSITY_NAME,
} from "@/config/global.config"

const Divider = ({ className }: { className?: string }) => (
  <span
    aria-hidden
    className={cn("h-3.5 w-px shrink-0 bg-white/25", className)}
  />
)

/** Info-bar link: sits on the primary fill, reveals a hairline underline on hover. */
const BarLink = ({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) => (
  <Link
    href={href}
    className={cn(
      "group relative inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap",
      "text-white/85 transition-colors duration-200 hover:text-white",
      "outline-none focus-visible:text-white",
      className
    )}
  >
    {children}
    <span
      aria-hidden
      className={cn(
        "absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-white",
        "transition-transform duration-300 ease-out",
        "group-hover:scale-x-100 group-focus-visible:scale-x-100"
      )}
    />
  </Link>
)

export default function InfoBar() {
  return (
    <motion.div
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="w-full bg-primary text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.14)]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-10 items-center justify-between gap-4">
          {/* Left — live admissions status */}
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex shrink-0 items-center gap-2">
              <span className="relative flex h-1.5 w-1.5 items-center justify-center">
                <motion.span
                  aria-hidden
                  className="absolute h-1.5 w-1.5 rounded-full bg-white"
                  animate={{
                    scale: [1, 2.6, 1],
                    opacity: [0.65, 0, 0.65],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
                <span className="relative h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase">
                Admissions Open
              </span>
            </span>

            <Divider className="hidden lg:block" />

            <p className="hidden min-w-0 truncate text-xs text-white/80 lg:block">
              <span className="font-semibold text-white">
                {UNIVERSITY_NAME}
              </span>
              {" — 2026 entry, scholarships available"}
            </p>

            <Divider className="hidden sm:block" />

            <BarLink href="/admissions" className="hidden sm:inline-flex">
              Apply now
              <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </BarLink>
          </div>

          {/* Right — contact, search, theme */}
          <div className="flex shrink-0 items-center gap-3">
            <BarLink href="/calendar" className="hidden lg:inline-flex">
              Academic Calendar
            </BarLink>

            <BarLink
              href={`tel:${SUPPORT_PHONE}`}
              className="hidden md:inline-flex"
            >
              <Phone aria-hidden className="h-3 w-3 shrink-0" />
              {SUPPORT_PHONE}
            </BarLink>

            <BarLink
              href={`mailto:${SUPPORT_EMAIL}`}
              className="hidden xl:inline-flex"
            >
              <Mail aria-hidden className="h-3 w-3 shrink-0" />
              {SUPPORT_EMAIL}
            </BarLink>

            <Divider className="hidden md:block" />

            <form
              action="/search"
              role="search"
              className="relative hidden sm:block"
            >
              <label htmlFor="infobar-search" className="sr-only">
                Search courses, staff and services
              </label>
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-white/65"
              />
              <input
                id="infobar-search"
                name="q"
                type="search"
                placeholder="Search courses, staff, services"
                className={cn(
                  "h-7 w-44 rounded-full border border-white/20 bg-white/10 pr-3 pl-8 lg:w-52",
                  "text-xs text-white placeholder:text-white/55",
                  "transition-all duration-300 ease-out outline-none",
                  "hover:border-white/30 hover:bg-white/15",
                  "focus:w-60 focus:border-white/50 focus:bg-white/20"
                )}
              />
            </form>

            <ThemeToggle className="p-1.5 text-white hover:bg-white/15" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
