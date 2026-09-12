"use client"

import Link from "next/link"
import { ArrowRight, GraduationCap, Award, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  icon: React.ReactNode
  title: string
  subtitle: string
  href: string
}

const iconClasses =
  "h-9 w-9 text-white/70 transition-colors duration-200 group-hover:text-primary"

const navItems: NavItem[] = [
  {
    icon: <GraduationCap className={iconClasses} strokeWidth={1.2} />,
    title: "PROGRAMS",
    subtitle: "For individuals",
    href: "/academics",
  },
  {
    icon: <Award className={iconClasses} strokeWidth={1.2} />,
    title: "CERTIFICATE",
    subtitle: "For individuals",
    href: "/academics",
  },
  {
    icon: <BookOpen className={iconClasses} strokeWidth={1.2} />,
    title: "AFFORD",
    subtitle: "For individuals",
    href: "/admissions",
  },
]

export default function QhubBanner() {
  return (
    <div className="flex flex-col shadow-sm lg:h-25 lg:flex-row">
      {/* Nav Items Section — warm dark to sit with the primary, not against it */}
      <div className="grid flex-1 grid-cols-3 items-stretch bg-stone-900 text-white dark:bg-stone-950">
        {navItems.map((item) => (
          <NavCard key={item.title} item={item} />
        ))}
      </div>

      {/* CTA Section — Uses Primary Theme Color (#FF3D01) */}
      <Link
        href="/about"
        className={cn(
          "flex items-center justify-between gap-6 px-6 py-5 sm:px-8",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "group shrink-0 transition-colors duration-200"
        )}
        aria-label="Discover Qhub"
      >
        <div className="text-left">
          <p className="text-base leading-tight font-bold tracking-wide sm:text-lg">
            DISCOVER Qhub
          </p>
          <p className="mt-0.5 text-xs text-primary-foreground/80 sm:text-sm">
            {"Don't Hesitate to Ask"}
          </p>
        </div>
        <ArrowRight
          className="h-7 w-7 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
          strokeWidth={2}
        />
      </Link>
    </div>
  )
}

function NavCard({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-2 px-3 py-5 text-center",
        "border-r border-white/10 last:border-r-0",
        "transition-colors duration-200 hover:bg-white/5",
        "lg:flex-row lg:items-center lg:gap-4 lg:px-8 lg:text-left"
      )}
    >
      <div className="shrink-0">{item.icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-widest text-white sm:text-sm">
          {item.title}
        </p>
        <p className="mt-0.5 hidden text-xs text-white/60 sm:block">
          {item.subtitle}
        </p>
      </div>

      {/* Primary rule wipes in on hover */}
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-primary transition-transform duration-300 ease-out group-hover:scale-x-100"
      />
    </Link>
  )
}
