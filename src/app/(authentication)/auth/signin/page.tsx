"use client"

import { FormEvent, useEffect, useMemo, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { signIn, useSession } from "next-auth/react"
import { toast } from "sonner"
import z from "zod"
import { LockKeyhole, AtSign, ArrowRight, Eye, EyeOff } from "lucide-react"
import ThemeToggle from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { passwordSchema } from "@/lib/validations/zod"
import { resolvePostSignInPath } from "@/config/nav.config"

const signInFormSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: passwordSchema,
})

function SignInFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const queryIdentifier = useMemo(
    () => searchParams.get("email") ?? "",
    [searchParams]
  )
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") ?? "",
    [searchParams]
  )

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      toast.success("Registration successful. You can now sign in.")
    }
  }, [searchParams])

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      router.replace(callbackUrl || resolvePostSignInPath(session.user.role))
    }
  }, [callbackUrl, router, status, session])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const values = {
      identifier: String(formData.get("identifier") ?? ""),
      password,
    }
    const parsed = signInFormSchema.safeParse(values)

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid sign in details.")
      return
    }

    setSubmitting(true)

    const identifier = parsed.data.identifier

    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    })

    setSubmitting(false)

    if (!result || result.error) {
      toast.error(
        "Invalid credentials. Please check your email/username and password."
      )
      return
    }

    // Successful sign-in updates the session; the effect above does the
    // role-aware redirect once `status` flips to "authenticated".
  }

  return (
    <div>
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

      <div className="absolute top-4 right-4 z-20 mx-auto rounded-xl border border-border bg-card/80 p-1 backdrop-blur sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 p-6 lg:grid-cols-[1.1fr_1fr] lg:p-10">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl border border-border/70 bg-card/90 p-8 shadow-xl backdrop-blur"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Welcome Back
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Sign in to your portal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Continue your admission, learning, or administration workflow from
            where you left off.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Email or Username
              </span>
              <div className="relative">
                <AtSign
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="text"
                  name="identifier"
                  required
                  defaultValue={queryIdentifier}
                  className="h-11 rounded-xl pl-9"
                  placeholder="you@example.com or username"
                />
              </div>
            </label>

            <label className="block space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Password
                </span>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <LockKeyhole
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl pr-10 pl-9"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="mt-2 h-11 w-full rounded-xl text-sm font-semibold"
            >
              {submitting ? "Signing in..." : "Sign In"}
              <ArrowRight size={16} />
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/auth/signup"
              className="font-semibold text-primary hover:underline"
            >
              Create an account
            </Link>
          </p>
        </motion.section>

        {/* <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="hidden rounded-3xl border border-border/60 bg-card p-8 lg:block"
        >
          <h2 className="text-2xl font-bold">Backend-backed access</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your email or username against the live Laravel auth
            API.
          </p>
          <div className="mt-6 rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            Password resets, token refresh, and role assignment now follow the
            backend workflow.
          </div>
        </motion.section> */}
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            Loading...
          </div>
        }
      >
        <SignInFormContent />
      </Suspense>
    </main>
  )
}
