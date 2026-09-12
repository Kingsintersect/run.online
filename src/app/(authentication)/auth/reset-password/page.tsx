"use client"

import { FormEvent, Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { toast } from "sonner"
import z from "zod"
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import ThemeToggle from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { passwordSchema } from "@/lib/validations/zod"
import { resetPasswordWithToken } from "@/lib/auth/backendAuth"

const resetPasswordFormSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

function ResetPasswordFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = resetPasswordFormSchema.safeParse({
      newPassword,
      confirmPassword,
    })
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ??
          "Please check the form and try again."
      )
      return
    }

    setSubmitting(true)
    try {
      await resetPasswordWithToken(token, parsed.data.newPassword)
      setDone(true)
      toast.success("Password reset successfully. Please sign in.")
    } catch {
      toast.error(
        "This reset link is invalid or has expired. Please request a new one."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full rounded-3xl border border-border/70 bg-card/90 p-8 shadow-xl backdrop-blur"
      >
        {!token ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-6 text-destructive" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Invalid reset link
            </h1>
            <p className="text-sm text-muted-foreground">
              This password reset link is missing its token. Please request a
              new one.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Request a new link
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-6 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Password reset</h1>
            <p className="text-sm text-muted-foreground">
              Your password has been changed. Please sign in with your new
              password.
            </p>
            <Button
              onClick={() => router.replace("/auth/signin")}
              className="h-11 w-full rounded-xl text-sm font-semibold"
            >
              Go to Sign In
              <ArrowRight size={16} />
            </Button>
          </div>
        ) : (
          <>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Reset Password
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              Set a new password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a new password for your account. You&apos;ll need to sign
              in again afterward.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  New Password
                </span>
                <div className="relative">
                  <LockKeyhole
                    size={15}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-11 rounded-xl pr-10 pl-9"
                    placeholder="Enter a new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Confirm Password
                </span>
                <div className="relative">
                  <LockKeyhole
                    size={15}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 rounded-xl pl-9"
                    placeholder="Re-enter your new password"
                  />
                </div>
              </label>

              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="mt-2 h-11 w-full rounded-xl text-sm font-semibold"
              >
                {submitting ? "Resetting..." : "Reset Password"}
                <ArrowRight size={16} />
              </Button>
            </form>
          </>
        )}
      </motion.section>
    </div>
  )
}

export default function ResetPasswordPage() {
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

      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            Loading...
          </div>
        }
      >
        <ResetPasswordFormContent />
      </Suspense>
    </main>
  )
}
