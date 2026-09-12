"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { toast } from "sonner"
import z from "zod"
import { ArrowLeft, ArrowRight, Mail, CheckCircle2 } from "lucide-react"
import ThemeToggle from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requestPasswordReset } from "@/lib/auth/backendAuth"

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
})

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Enter a valid email address."
      )
      return
    }

    setSubmitting(true)
    try {
      await requestPasswordReset(parsed.data.email)
      setSubmitted(true)
    } catch {
      // The backend always returns 200 regardless of whether the email
      // exists (anti-enumeration) — a thrown error here means the request
      // itself failed (network/server error), not "email not found".
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -top-10 -left-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />

      <Link
        href="/"
        className="absolute top-4 left-4 z-20 flex items-center gap-3 rounded-2xl border border-border/80 bg-card/90 px-3 py-2 shadow-lg backdrop-blur sm:top-6 sm:left-6"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/25">
          <Image
            src="/logo/logo.png"
            alt="QHUB"
            width={28}
            height={28}
            className="rounded-md"
          />
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            QHUB Portal
          </p>
          <p className="text-[11px] text-muted-foreground">
            Knowledge • Innovation • Service
          </p>
        </div>
      </Link>

      <div className="absolute top-4 right-4 z-20 rounded-xl border border-border bg-card/80 p-1 backdrop-blur sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full rounded-3xl border border-border/70 bg-card/90 p-8 shadow-xl backdrop-blur"
        >
          {submitted ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="size-6 text-emerald-500" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                Check your email
              </h1>
              <p className="text-sm text-muted-foreground">
                If an account exists for{" "}
                <span className="font-medium text-foreground">{email}</span>,
                we&apos;ve sent a link to reset your password. It may take a few
                minutes to arrive.
              </p>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Reset Password
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">
                Forgot your password?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter the email address linked to your account and we&apos;ll
                send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Email
                  </span>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl pl-9"
                      placeholder="you@example.com"
                    />
                  </div>
                </label>

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="mt-2 h-11 w-full rounded-xl text-sm font-semibold"
                >
                  {submitting ? "Sending..." : "Send Reset Link"}
                  <ArrowRight size={16} />
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                Remembered your password?{" "}
                <Link
                  href="/auth/signin"
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </motion.section>
      </div>
    </main>
  )
}
