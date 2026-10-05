"use client"

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { signIn, signOut, useSession } from "next-auth/react"
import { toast } from "sonner"
import z from "zod"
import { LockKeyhole, AtSign, ArrowRight, Eye, EyeOff } from "lucide-react"
import ThemeToggle from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { passwordSchema } from "@/lib/validations/zod"
import { resolveSignInRedirect, UserRole } from "@/config/nav.config"
import { resolveStudentLandingPath } from "@/lib/auth/post-sign-in"
import {
  SESSION_EXPIRED_REASON,
  SIGNIN_PREFILL_KEY,
  useHydrated,
  useStripSensitiveParams,
} from "@/lib/auth/use-auth-form-guard"

const signInFormSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: passwordSchema,
})

function SignInFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const hydrated = useHydrated()

  // Prefill once, at mount: the just-registered email handed over by the
  // sign-up page (sessionStorage, never the URL), or a legacy `?email=` link.
  // Captured into state before useStripSensitiveParams removes it from the
  // URL. The value is never logged.
  // (This component sits under a Suspense boundary and reads
  // useSearchParams, so it renders on the client — reading sessionStorage
  // in the initializer can't cause a hydration mismatch.)
  const [identifier, setIdentifier] = useState(() => {
    const fromQuery = searchParams.get("email")
    if (fromQuery) return fromQuery
    if (typeof window === "undefined") return ""
    try {
      return sessionStorage.getItem(SIGNIN_PREFILL_KEY) ?? ""
    } catch {
      return ""
    }
  })
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // `?reason=session-expired` is set by AuthSessionBridge after it ended a
  // stale session. Captured once so the notice survives stripping the param.
  const [sessionExpired] = useState(
    () => searchParams.get("reason") === SESSION_EXPIRED_REASON
  )
  // Set when the user submits this form, so a session that becomes
  // authenticated *from this form* is always redirected onward, even on a
  // page that was opened with the session-expired notice.
  const signedInHereRef = useRef(false)
  const staleSignOutRef = useRef(false)

  // Credentials must never stay in the URL (identifier/password from an old
  // native GET submission, email from a legacy sign-up redirect). `reason`
  // is dropped too so a reload doesn't re-show the notice.
  useStripSensitiveParams([
    "identifier",
    "password",
    "email",
    "username",
    "reason",
  ])

  // One-shot hand-off: drop the sign-up prefill once it has been read.
  useEffect(() => {
    try {
      sessionStorage.removeItem(SIGNIN_PREFILL_KEY)
    } catch {
      // Storage unavailable — nothing to clean up.
    }
  }, [])

  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") ?? "",
    [searchParams]
  )

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      toast.success("Registration successful. You can now sign in.")
    }
  }, [searchParams])

  // Arrived here because a stale session was ended, yet next-auth still
  // reports "authenticated" — the bridge's signOut() didn't get through
  // (e.g. a network blip). Clear it from here, once, instead of bouncing the
  // user back to a dashboard whose tokens are dead (that would loop:
  // dashboard -> 401 -> sign-in -> dashboard ...).
  useEffect(() => {
    if (!sessionExpired || signedInHereRef.current) return
    if (status !== "authenticated" || staleSignOutRef.current) return
    staleSignOutRef.current = true
    void signOut({ redirect: false }).catch(() => {
      // Nothing more to do — the form stays usable and signing in again
      // replaces the stale session cookie.
    })
  }, [sessionExpired, status])

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.role) return
    // Never auto-redirect a session the expiry flow just ended (see above);
    // only one created by submitting this form.
    if (sessionExpired && !signedInHereRef.current) return
    const role = session.user.role
    // Role-aware: a callbackUrl from another role's area (e.g. left over
    // from someone else's expired session) is ignored in favour of this
    // user's own landing page.
    if (role !== UserRole.STUDENT) {
      router.replace(resolveSignInRedirect(role, callbackUrl))
      return
    }
    // STUDENT: the dashboard once admitted with tuition paid (fully or
    // partly), otherwise the admission flow — read from the backend.
    let cancelled = false
    void resolveStudentLandingPath(session.user.accessToken).then((home) => {
      if (!cancelled)
        router.replace(resolveSignInRedirect(role, callbackUrl, home))
    })
    return () => {
      cancelled = true
    }
  }, [callbackUrl, router, sessionExpired, status, session])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!hydrated || submitting) return

    const values = { identifier, password }
    const parsed = signInFormSchema.safeParse(values)

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid sign in details.")
      return
    }

    setSubmitting(true)
    signedInHereRef.current = true

    const result = await signIn("credentials", {
      identifier: parsed.data.identifier,
      password,
      redirect: false,
    })

    setSubmitting(false)

    if (!result || result.error) {
      signedInHereRef.current = false
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
            src="/logo/logo.jpg"
            alt="RUN"
            width={28}
            height={28}
            className="rounded-md"
          />
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Redeemer&apos;s University of Nigeria Portal
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

          {sessionExpired && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
            >
              Your session expired. Please sign in again.
            </p>
          )}

          {/*
            method="post" + no action + no `name` attributes + a submit button
            that stays disabled until hydration: even a pre-hydration native
            submission can never serialise credentials into the URL.
          */}
          <form
            method="post"
            onSubmit={handleSubmit}
            className="mt-8 space-y-4"
          >
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
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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
                  autoComplete="current-password"
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
              disabled={!hydrated || submitting}
              aria-disabled={!hydrated || submitting}
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
