"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/components/theme-provider"
import AuthSessionBridge from "@/providers/AuthSessionBridge"
import { Toaster } from "sonner"

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2, // 2 min
            refetchOnWindowFocus: false,
            // Never retry a 4xx — it won't change on retry, and
            // hammering a 429 only makes rate-limiting worse. Two
            // attempts for genuine transient failures (5xx / network).
            retry: (failureCount, error) => {
              const status = (error as { status?: number } | null)?.status
              if (status && status >= 400 && status < 500) return false
              return failureCount < 2
            },
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
          },
          mutations: {
            retry: 0,
          },
        },
      })
  )

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <AuthSessionBridge>
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                classNames: {
                  toast:
                    "bg-card border border-border text-card-foreground shadow-lg rounded-xl",
                  title: "text-sm font-semibold",
                  description: "text-xs text-muted-foreground",
                  success: "!border-[oklch(0.8_0.1_165/0.5)]",
                  error: "!border-destructive",
                },
              }}
            />
            {process.env.NODE_ENV === "development" && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
          </QueryClientProvider>
        </AuthSessionBridge>
      </SessionProvider>
    </ThemeProvider>
  )
}
