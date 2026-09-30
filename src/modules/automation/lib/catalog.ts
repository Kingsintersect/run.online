// The automations proposed in sandbox/automation, in the order the backend
// is asked to build them. The server's registry lists only what exists; this
// catalogue lets the portal show what's still manual meanwhile.

export interface AutomationCatalogEntry {
  key: string
  step: number
  name: string
  /** What happens today, while it isn't automatic. */
  today: string
}

export const AUTOMATION_CATALOG: AutomationCatalogEntry[] = [
  {
    key: "results.cgpa_recompute",
    step: 1,
    name: "Recompute GPA/CGPA on result changes",
    today:
      "CGPA is only recalculated when someone runs it, so session close reports CGPA not computed.",
  },
  {
    key: "results.release_withheld_on_payment",
    step: 2,
    name: "Release withheld results when fees are paid",
    today:
      "Already automatic on the server: a payment that clears the invoice, or a waiver, releases that student's withheld results. It just isn't listed in the automation registry yet.",
  },
  {
    key: "fees.invoice_resolve",
    step: 3,
    name: "Create invoices on admission, registration and activation",
    today:
      "Missing invoices are only created when the student opens their fees page.",
  },
  {
    key: "notifications.events",
    step: 4,
    name: "Event notifications and reminders",
    today:
      "Nobody is told when results are published, released or withheld, when an invoice is due, or when a sheet awaits approval.",
  },
  {
    key: "results.grade_item_carry_forward",
    step: 5,
    name: "Carry grade-item mappings forward",
    today:
      "Unmapped grade items are mapped by hand on every sheet. The portal suggests mappings meanwhile.",
  },
  {
    key: "moodle.category_health",
    step: 6,
    name: "Nightly Moodle category-mapping check",
    today:
      "Crossed mappings are found only on the Categories screen. The portal flags what it can see meanwhile.",
  },
  {
    key: "moodle.user_cohort_sync",
    step: 7,
    name: "Moodle user and cohort sync",
    today:
      "New users and cohort members reach Moodle only when someone clicks Pull or Sync.",
  },
  {
    key: "users.record_heads",
    step: 8,
    name: "Record HOD/Dean as head on creation",
    today: "The portal records the head right after creating the staff member.",
  },
  {
    key: "progression.readiness_digest",
    step: 9,
    name: "Session close readiness digest",
    today:
      "Someone has to open the readiness checklist to find out what blocks closing.",
  },
]
