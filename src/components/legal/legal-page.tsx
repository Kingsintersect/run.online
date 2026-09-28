import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import Footer from "@/components/navigation/Footer"

export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

interface LegalPageProps {
  title: string
  intro: ReactNode
  sections: LegalSection[]
}

// Shared layout for /privacy and /terms. Both are drafts until the Data
// Protection Officer and the registry approve the wording, and say so.
export function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div
          role="note"
          className="mb-8 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="text-sm">
            <p className="font-bold tracking-wide uppercase">
              DRAFT – pending DPO review
            </p>
            <p className="mt-1">
              This text is a placeholder. It hasn&apos;t been approved by the
              university&apos;s Data Protection Officer or legal team and
              isn&apos;t yet the university&apos;s policy. Items in [square
              brackets] are still to be decided.
            </p>
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {intro}
        </div>

        <nav
          aria-label="On this page"
          className="mt-8 rounded-2xl border border-border bg-muted/30 p-4 dark:bg-muted/10"
        >
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            On this page
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`}>
              <h2
                id={`${s.id}-title`}
                className="text-lg font-semibold text-foreground"
              >
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90 [&_li]:ml-5 [&_li]:list-disc">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </article>
      <Footer />
    </>
  )
}
