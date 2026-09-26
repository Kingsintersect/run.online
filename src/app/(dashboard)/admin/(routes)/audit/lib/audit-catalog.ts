import type { AuditAction, AuditEntityType } from "../types/audit.types"

// ─── Audit catalog ────────────────────────────────────────────────────────────
//
// The one place that names audit entity types for humans and groups them into
// categories (Results, Session migration). Action labels live next to their
// colours and icons in `ACTION_CONFIG` (`_components/ActionBadge.tsx`).
//
// `GET /audit/logs` takes a single `entityType` (a comma list returns 0 rows,
// probed 2026-09-25), so a category is a set of presets: picking the category
// selects one entity type inside it, and each further pick is one query.
// Never fan out one request per entity type.
//
// Entity type names: the ones the backend already writes are copied from live
// logs (GradePullJob, MoodleGradeItemMapping, MoodleSyncGrade,
// GradeAdjustmentBatch, AcademicSession, Semester, Invoice). The rest are the
// PascalCase model names implied by the tables in
// sandbox/results-moodle/SCHEMA_CHANGES.md and
// sandbox/session-promotion/session-promotion-backend-prompt.md §1. The
// backend request that asks for them is in sandbox/session-promotion/README.md
// ("Audit logging requirements").

export const AUDIT_ENTITY_LABELS: Record<AuditEntityType, string> = {
  Student: "Student",
  Grade: "Grade",
  Invoice: "Invoice",
  Course: "Course",
  Tutor: "Tutor",
  Clearance: "Clearance",
  Payment: "Payment",
  MoodleUser: "Moodle user",
  MoodleEnrollment: "Moodle enrollment",
  Announcement: "Announcement",
  Document: "Document",
  User: "User",
  Setting: "Setting",
  StudentEnrollment: "Student enrollment",
  // Results
  ResultSheet: "Result sheet",
  GradeAdjustmentBatch: "Score adjustment (batch)",
  GradeAdjustment: "Score adjustment",
  GradePullJob: "Moodle grade pull",
  MoodleGradeItemMapping: "Grade item mapping",
  MoodleSyncGrade: "Moodle grade sync",
  GradingScheme: "Grading scheme",
  GradeScale: "Grade scale",
  ResultPolicy: "Result policy",
  // Session migration
  AcademicSession: "Academic session",
  Semester: "Semester",
  PromotionPolicy: "Promotion policy",
  PromotionRun: "Promotion run",
  PromotionRunItem: "Promotion run item",
  StudentSessionStanding: "Session standing",
}

/** Human label for an entity type, falling back to the raw name. */
export function entityTypeLabel(entityType: string): string {
  return entityType in AUDIT_ENTITY_LABELS
    ? AUDIT_ENTITY_LABELS[entityType as AuditEntityType]
    : entityType
}

export type AuditCategoryId = "results" | "session-migration"

/** One pick inside a category: an entity type, optionally with an action. */
export interface AuditCategoryPreset {
  entityType: AuditEntityType
  /** Preselected action, e.g. Invoice → WAIVE for session migration. */
  action?: AuditAction
  /** Short hint shown as the preset's tooltip. */
  hint: string
}

export interface AuditCategory {
  id: AuditCategoryId
  label: string
  description: string
  /** What the server doesn't log yet (probed 2026-09-25), shown as a hint. */
  notYetLogged: string
  presets: AuditCategoryPreset[]
  /** Actions worth offering as pills while this category is active. */
  actions: AuditAction[]
}

export const AUDIT_CATEGORIES: AuditCategory[] = [
  {
    id: "results",
    label: "Results",
    description:
      "Moodle grade pulls, item mapping, score adjustments, the result sheet workflow and grading configuration.",
    notYetLogged:
      "Sheet submit, approve, reject, reopen and publish, grade amendments, adjustment approvals and grading scheme or policy changes aren't recorded by the server yet.",
    presets: [
      { entityType: "GradePullJob", hint: "Pulls of grades from Moodle" },
      {
        entityType: "MoodleGradeItemMapping",
        hint: "Moodle grade items mapped to CA or exam",
      },
      { entityType: "MoodleSyncGrade", hint: "Background Moodle grade syncs" },
      {
        entityType: "GradeAdjustmentBatch",
        hint: "Normalization batches: create, approve, reject, revert",
      },
      {
        entityType: "GradeAdjustment",
        hint: "Single-row score adjustments",
      },
      {
        entityType: "ResultSheet",
        hint: "Submit, approve, reject, reopen and publish of a result sheet",
      },
      { entityType: "Grade", hint: "Individual grades, including amendments" },
      { entityType: "GradingScheme", hint: "Grading schemes and weights" },
      { entityType: "GradeScale", hint: "Grade bands inside a scheme" },
      {
        entityType: "ResultPolicy",
        hint: "Per major program result policy (fee gate, thresholds)",
      },
    ],
    actions: [
      "SYNC",
      "CREATE",
      "UPDATE",
      "DELETE",
      "SUBMIT",
      "APPROVE",
      "REJECT",
      "REOPEN",
      "PUBLISH",
      "AMEND",
      "REVERT",
    ],
  },
  {
    id: "session-migration",
    label: "Session migration",
    description:
      "Sessions and semesters, promotion policy and runs, overrides, standings, invoice waivers and debt overrides.",
    notYetLogged:
      "Locking, promotion policy changes, promotion runs, overrides, invoice waivers and debt overrides aren't recorded by the server yet. Session and semester create and update are (activation shows as an update of isActive).",
    presets: [
      {
        entityType: "AcademicSession",
        hint: "Create, update, lock and activate sessions",
      },
      {
        entityType: "Semester",
        hint: "Create, update, lock and activate semesters",
      },
      { entityType: "PromotionPolicy", hint: "Promotion policy changes" },
      {
        entityType: "PromotionRun",
        hint: "Run create, refresh, commit, reverse and discard",
      },
      {
        entityType: "PromotionRunItem",
        hint: "Outcome overrides on individual students",
      },
      {
        entityType: "StudentSessionStanding",
        hint: "Debt overrides on a student's standing",
      },
      { entityType: "Invoice", action: "WAIVE", hint: "Invoice waivers" },
    ],
    actions: [
      "CREATE",
      "UPDATE",
      "DELETE",
      "LOCK",
      "ACTIVATE",
      "REFRESH",
      "COMMIT",
      "REVERSE",
      "DISCARD",
      "OVERRIDE",
      "WAIVE",
      "CANCEL",
      "DEBT_OVERRIDE",
      "DEBT_OVERRIDE_REMOVE",
    ],
  },
]

/** The category whose presets include this entity type, if any. */
export function categoryForEntityType(
  entityType: string | undefined
): AuditCategory | undefined {
  if (!entityType) return undefined
  return AUDIT_CATEGORIES.find((c) =>
    c.presets.some((p) => p.entityType === entityType)
  )
}
