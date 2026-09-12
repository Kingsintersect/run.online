"use client"
import React from "react"
import Image from "next/image"
import Link from "next/link"
import { Mail, MapPin, Phone } from "lucide-react"
import Logo from "@/components/branding/Logo"
import { cn } from "@/lib/utils"
import { CONTACT_INFO, SOCIAL_MEDIA_LINKS } from "@/config/global.config"

const exploreLinks = [
  { label: "About", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Research", href: "/research" },
  { label: "Admissions", href: "/admissions" },
  { label: "Contact", href: "/contact" },
]

const portalLinks = [
  { label: "Apply for Admission", href: "/admissions" },
  { label: "Student Sign In", href: "/auth/signin" },
  { label: "Create Account", href: "/auth/signup" },
  { label: "Visit Portal", href: "/auth/signin" },
]

/*
 * lucide-react v1 dropped its brand glyphs, so these four are inlined. They use
 * the same 24px stroke geometry as the lucide icons elsewhere on the page.
 */
const socialIcons: Record<string, React.ReactNode> = {
  facebook: (
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  ),
  twitter: (
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
  ),
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </>
  ),
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
}

const FooterHeading = ({ children }: { children: React.ReactNode }) => (
  <>
    <h4 className="text-[11px] font-bold tracking-[0.18em] text-white uppercase">
      {children}
    </h4>
    <span
      aria-hidden
      className="mt-3 block h-0.5 w-8 rounded-full bg-primary"
    />
  </>
)

const FooterLink = ({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) => (
  <Link
    href={href}
    className="group inline-flex items-center gap-2 text-sm text-white/65 transition-colors duration-200 hover:text-white"
  >
    <span
      aria-hidden
      className="h-px w-0 bg-primary transition-all duration-300 ease-out group-hover:w-3"
    />
    {children}
  </Link>
)

export default function Footer() {
  return (
    <footer className="mt-16 bg-stone-900 text-white dark:bg-stone-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {/* Top band — identity, promise, social */}
        <div className="flex flex-col gap-8 border-b border-white/10 pb-10 lg:flex-row lg:items-center lg:justify-between">
          <Logo
            href="/"
            src="/logo/logo.jpg"
            subtitle="Running With The Vision"
            imageWidth={52}
            imageHeight={52}
            className="items-center"
            imageClassName="h-13 w-13"
            titleClassName="text-base text-white"
            subtitleClassName="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60 opacity-100"
          />

          <p className="max-w-md text-sm leading-relaxed text-white/65">
            Learn, research, and manage your academic journey from one connected
            university platform.
          </p>

          <div className="flex items-center gap-2">
            {Object.entries(SOCIAL_MEDIA_LINKS).map(([name, url]) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full",
                  "border border-white/15 text-white/70 transition-all duration-200",
                  "hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground"
                )}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {socialIcons[name]}
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <FooterHeading>Explore</FooterHeading>
            <div className="mt-4 flex flex-col gap-2.5">
              {exploreLinks.map((link) => (
                <FooterLink key={link.href} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </div>
          </div>

          <div>
            <FooterHeading>Portal</FooterHeading>
            <div className="mt-4 flex flex-col gap-2.5">
              {portalLinks.map((link) => (
                <FooterLink key={link.label} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </div>
          </div>

          <div>
            <FooterHeading>Connect Us</FooterHeading>
            <div className="mt-4 space-y-3 text-sm text-white/65">
              <p className="flex items-start gap-2.5">
                <MapPin
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                />
                {CONTACT_INFO.address}
              </p>
              <a
                href={`tel:${CONTACT_INFO.phone}`}
                className="flex items-center gap-2.5 transition-colors hover:text-white"
              >
                <Phone aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                {CONTACT_INFO.phone}
              </a>
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="flex items-center gap-2.5 break-all transition-colors hover:text-white"
              >
                <Mail aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                {CONTACT_INFO.email}
              </a>
            </div>
          </div>

          <div>
            <FooterHeading>Our Office</FooterHeading>
            <Image
              src="https://odl.esut.edu.ng/wp-content/uploads/2022/01/map.png"
              alt="Worldwide office map"
              width={900}
              height={420}
              className="mt-4 h-auto w-full rounded-lg border border-white/10"
            />
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-xs text-white/50">
          <span>
            © {new Date().getFullYear()} ESUT ODL. All rights reserved.
          </span>
          <Link href="/privacy" className="transition-colors hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-white">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  )
}
