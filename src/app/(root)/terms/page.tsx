import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, type LegalSection } from "@/components/legal/legal-page"
import { UNIVERSITY_NAME } from "@/config/global.config"

export const metadata: Metadata = {
  title: `Terms of Use (Draft) | ${UNIVERSITY_NAME}`,
}

// DRAFT – pending DPO review. Placeholder terms; [bracketed] items are open
// decisions for the registry and legal team.
const sections: LegalSection[] = [
  {
    id: "accounts",
    title: "Your account",
    body: (
      <ul>
        <li>
          Your account is for you alone. Don&apos;t share your password or let
          anyone act for you on the portal.
        </li>
        <li>
          You&apos;re responsible for keeping your contact details up to date so
          notices reach you.
        </li>
        <li>Tell the registry at once if you think your account is misused.</li>
      </ul>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <p>
        Don&apos;t try to access data that isn&apos;t yours, interfere with the
        portal, or upload false documents. Misuse may lead to suspension of
        access and disciplinary action under the university&apos;s regulations.
      </p>
    ),
  },
  {
    id: "records",
    title: "Academic records",
    body: (
      <p>
        Results shown on the portal are published by the university. A result
        slip you download is a student copy; official transcripts and result
        statements are issued only by the registry. [Wording on senate approval
        to be confirmed.]
      </p>
    ),
  },
  {
    id: "payments",
    title: "Fees and payments",
    body: (
      <p>
        Fees are shown on your invoices. Payments are processed by the
        university&apos;s payment provider and confirmed on the portal. [Refund
        policy to be confirmed by the bursary.]
      </p>
    ),
  },
  {
    id: "privacy",
    title: "Privacy",
    body: (
      <p>
        How we use your personal data is set out in the{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          Privacy Notice
        </Link>
        .
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms. The date of the current version will appear
        here once they are approved. [Effective date to be set.]
      </p>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro={
        <p>
          The rules for using the {UNIVERSITY_NAME} portal as an applicant,
          student or member of staff.
        </p>
      }
      sections={sections}
    />
  )
}
