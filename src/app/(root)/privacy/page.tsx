import type { Metadata } from "next"
import { LegalPage, type LegalSection } from "@/components/legal/legal-page"
import { UNIVERSITY_NAME } from "@/config/global.config"

export const metadata: Metadata = {
  title: `Privacy Notice (Draft) | ${UNIVERSITY_NAME}`,
}

// DRAFT – pending DPO review. Structured around what the Nigeria Data
// Protection Act 2023 expects a privacy notice to cover; every [bracketed]
// item is an open decision for management (sandbox/data-protection).
const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <p>
        {UNIVERSITY_NAME} is the data controller for personal data processed
        through this portal. Data Protection Officer: [name, email and postal
        address to be confirmed].
      </p>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <ul>
        <li>
          Identity and contact details: name, date of birth, gender, photo,
          email, phone, address, next of kin.
        </li>
        <li>
          Admission records: JAMB details, O&apos;level results, uploaded
          documents.
        </li>
        <li>
          Academic records: registration, attendance, scores, grades, GPA/CGPA,
          standing.
        </li>
        <li>Financial records: invoices, payments, waivers.</li>
        <li>
          Accommodation, clearance and welfare records where you use those
          services.
        </li>
        <li>
          Technical data: sign-in times and the security logs needed to protect
          your account.
        </li>
      </ul>
    ),
  },
  {
    id: "why",
    title: "Why we use it and on what basis",
    body: (
      <ul>
        <li>
          To admit you, teach and assess you, and keep your academic record:
          performing our contract with you.
        </li>
        <li>
          To meet legal and regulatory duties, for example reporting to the NUC
          and submitting graduation lists for NYSC: legal obligation.
        </li>
        <li>
          To run the portal securely and prevent fraud: legitimate interests.
        </li>
        <li>
          Anything else, for example marketing or research use of your data,
          only with your consent, which you can withdraw. [Scope to be
          confirmed.]
        </li>
      </ul>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <p>
        Regulators and government bodies where the law requires it (for example
        NUC, JAMB, NYSC); our learning platform (Moodle) and payment processors,
        only as needed to provide those services; sponsors or parents only with
        your permission. [Full list of processors and any transfers outside
        Nigeria to be confirmed.]
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <p>
        Academic records that prove your qualification are kept permanently.
        Other records are kept only as long as needed: [retention periods for
        applications, financial records, documents and logs to be set by
        management].
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <p>
        You can ask to see the data we hold about you, correct it, object to or
        restrict some uses, withdraw consent, and ask for a copy in a portable
        form. Some records can&apos;t be deleted while the law or your academic
        record requires them. Send requests to the Data Protection Officer.
        [Response time to be confirmed.]
      </p>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <p>
        Access is limited by role, every change to results and records is
        logged, and connections are encrypted. [Further measures to be described
        after the DPO&apos;s review.]
      </p>
    ),
  },
  {
    id: "complaints",
    title: "Complaints",
    body: (
      <p>
        Contact the Data Protection Officer first. You may also complain to the
        Nigeria Data Protection Commission.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Notice"
      intro={
        <p>
          How {UNIVERSITY_NAME} collects, uses and protects personal data of
          applicants, students, staff and visitors who use this portal.
        </p>
      }
      sections={sections}
    />
  )
}
