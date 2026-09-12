"use client"
import React, { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useSession, signOut } from "next-auth/react"
import { logoutFromBackend } from "@/lib/auth/backendAuth"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ArrowRight, LogOut, Menu, X } from "lucide-react"
import ThemeToggle from "../ThemeToggle"
import Logo from "@/components/branding/Logo"
import { roleDashboardPath, UserRole } from "@/config/nav.config"
import { cn } from "@/lib/utils"
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog"
import { admissionQueryOptions } from "@/app/(admission)/services/admissionService"

const PUBLIC_LINKS = [
  { href: "/about", label: "About" },
  { href: "/admissions", label: "Admissions" },
  { href: "/academics", label: "Academics" },
  { href: "/research", label: "Research" },
  { href: "/contact", label: "Contact" },
]

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`)

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const { data: session, status } = useSession()
  const pathname = usePathname()

  const isAuthenticated = status === "authenticated"
  const role = session?.user?.role as UserRole | undefined

  // An APPLICANT's default destination (roleDashboardPath) is the admission
  // flow itself (/process-admission) — correct while still applying, but
  // once tuition payment has actually started, the applicant has real
  // portal access and "Dashboard" should take them there instead of back
  // into the flow they've already gotten past. Only fetched for applicants;
  // every other role's dashboardHref is unaffected.
  const { data: admissionStudent } = useQuery({
    ...admissionQueryOptions.student(),
    enabled: isAuthenticated && role === UserRole.APPLICANT,
  })
  const tuitionUnlocked =
    admissionStudent?.tuition_payment_status === "partial" ||
    admissionStudent?.tuition_payment_status === "paid"

  const dashboardHref =
    role === UserRole.APPLICANT && tuitionUnlocked
      ? roleDashboardPath[UserRole.STUDENT]
      : ((role && roleDashboardPath[role]) ?? "/auth/signin")

  const handleLogout = async () => {
    await logoutFromBackend()
    await signOut({ callbackUrl: "/" })
  }

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav
      role="navigation"
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color,box-shadow] duration-300 ease-out",
        scrolled
          ? "border-b border-border bg-background/85 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-background/70"
          : "border-b border-transparent bg-background"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Logo
            href="/"
            src="/logo/logo.jpg"
            subtitle="Running With The Vision"
            imageWidth={40}
            imageHeight={40}
            priority
            className="items-center"
            imageClassName="h-10 w-10"
            titleClassName="text-sm"
            subtitleClassName="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground opacity-100 sm:block"
          />

          {/* Desktop links — the active one carries a sliding primary rule */}
          <div className="hidden items-center gap-7 md:flex">
            {PUBLIC_LINKS.map((link) => {
              const active = isActive(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative py-1 text-[13px] font-semibold tracking-[0.08em] uppercase transition-colors outline-none",
                    active
                      ? "text-primary"
                      : "text-foreground/70 hover:text-foreground focus-visible:text-foreground"
                  )}
                >
                  {link.label}
                  {active && (
                    <motion.span
                      layoutId="nav-active-rule"
                      aria-hidden
                      className="absolute -bottom-1.5 left-0 h-0.5 w-full rounded-full bg-primary"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  )}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Quiet secondary action — a login CTA, so it has no reason to
                show once the visitor is already signed in. */}
            {!isAuthenticated && (
              <Link
                className="hidden items-center rounded-md border border-border px-3 py-2 text-xs font-semibold tracking-[0.08em] text-foreground/80 uppercase transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground lg:inline-flex"
                href="/auth/signin"
              >
                Visit Portal
              </Link>
            )}

            {/* The one loud action */}
            <Link
              className={cn(
                "group hidden items-center gap-1.5 rounded-md bg-primary px-4 py-2 sm:inline-flex",
                "text-xs font-bold tracking-[0.08em] text-primary-foreground uppercase",
                "shadow-sm shadow-primary/25 transition-all duration-200",
                "hover:-translate-y-px hover:shadow-md hover:shadow-primary/35"
              )}
              href={isAuthenticated ? dashboardHref : "/admissions"}
            >
              {isAuthenticated ? "Dashboard" : "Apply Now"}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>

            {isAuthenticated && (
              <button
                onClick={() => setLogoutDialogOpen(true)}
                title="Log out"
                aria-label="Log out"
                className="hidden rounded-md p-2 text-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive sm:inline-flex"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}

            <ThemeToggle className="hidden text-foreground/80 hover:bg-accent hover:text-foreground sm:inline-flex" />

            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-panel"
              className="rounded-md p-2 text-foreground transition-colors hover:bg-accent md:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile panel */}
      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            id="mobile-nav-panel"
            key="mobile-nav-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <div className="space-y-1 px-4 py-4 sm:px-6">
              {PUBLIC_LINKS.map((link) => {
                const active = isActive(pathname, link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold tracking-[0.08em] uppercase transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {link.label}
                    {active && (
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                )
              })}

              <div className="mt-3 flex items-center gap-2 border-t border-border pt-4">
                <Link
                  href={isAuthenticated ? dashboardHref : "/admissions"}
                  onClick={closeMenu}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-xs font-bold tracking-[0.08em] text-primary-foreground uppercase"
                >
                  {isAuthenticated ? "Dashboard" : "Apply Now"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {!isAuthenticated && (
                  <Link
                    href="/auth/signin"
                    onClick={closeMenu}
                    className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2.5 text-xs font-semibold tracking-[0.08em] text-foreground/80 uppercase"
                  >
                    Portal
                  </Link>
                )}
                <ThemeToggle className="border border-border text-foreground/80" />
              </div>

              {isAuthenticated && (
                <button
                  onClick={() => setLogoutDialogOpen(true)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-semibold tracking-[0.08em] text-destructive uppercase transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleLogout}
      />
    </nav>
  )
}
