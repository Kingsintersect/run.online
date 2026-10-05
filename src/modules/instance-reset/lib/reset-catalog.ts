import type {
  PlannedResetGroup,
  PreservedCatalogItem,
  PreservedCatalogEntry,
} from "../types"

// GENERATED from the instance-reset proposal's groups.json and preserved.json
// (2026-10-05). The planned catalogue: what each reset group will clear once
// the backend ships /system/instance-reset. Used by useResetGroups() while
// GET /groups isn't built (CLAUDE.md §14). It carries NO row counts: counts
// only ever come from the server, so the screen shows "—" in planned mode.
// Keep it in step with the proposal; the live GET /groups wins once it exists.

export const PLANNED_RESET_GROUPS: readonly PlannedResetGroup[] = [
  {
    key: "admissions",
    label: "Admissions & applicants",
    description:
      "Applications, applicant documents and academic records, admission offers, programme choices, applicant progress, admission cycles and their requirements, and applicant-only login accounts. Resets the admission process and form steps to the default set.",
    order: 1,
    dependsOn: ["accounts", "academic-structure"],
    cascadesTo: ["finance-transactions", "communications", "accounts"],
    tables: [
      {
        name: "admissions",
        note: "Admission offers / admission numbers created from approved applications.",
      },
      {
        name: "application_academic_records",
        note: "O-level/sitting results attached to an application.",
      },
      {
        name: "application_documents",
        note: "Uploaded applicant documents (files on disk too).",
      },
      {
        name: "admission_applications",
        note: "Applicant forms (one per applicant per session).",
      },
      {
        name: "admission_cycle_requirements",
        note: "Per-cycle/per-programme entry requirements.",
      },
      {
        name: "admission_cycles",
        note: "Admission cycles (per session) set up by the institution.",
      },
      {
        name: "admission_form_fields",
        note: "Fields of the FORM steps: delete, then re-seed the default fields (dynamic-admission SCHEMA_CHANGES §6).",
      },
      {
        name: "admission_program_choices",
        note: "Applicant programme choice per session.",
      },
      {
        name: "admission_sequence_rule_settings",
        note: "Sequence-rule toggles: an empty table means built-in defaults, so delete all rows.",
      },
      {
        name: "admission_stage_progress",
        note: "Applicant progress through admission process steps.",
      },
      {
        name: "admission_step_definitions",
        note: "Admission process/form step registry: delete, then re-seed the default PROCESS + FORM steps.",
      },
      {
        name: "users",
        note: "Applicant-only login accounts (and their user_roles); accounts holding any other role are kept.",
      },
    ],
    moodle: null,
    preserved: [
      "Default admission process and form steps (re-seeded)",
      "Accounts that also hold a student, staff or super_admin role",
    ],
  },
  {
    key: "students",
    label: "Students & student records",
    description:
      "Student records and documents, clearances, standings and promotion runs, requests, ID cards, graduation and alumni records, parent links, SIWES placements, and student-only login accounts.",
    order: 2,
    dependsOn: [
      "admissions",
      "teaching",
      "finance-transactions",
      "accounts",
      "academic-structure",
      "institution-config",
    ],
    cascadesTo: [
      "admissions",
      "teaching",
      "finance-transactions",
      "communications",
      "lms",
      "accounts",
      "campus",
    ],
    tables: [
      {
        name: "alumni",
        note: "(proposed / may not exist yet) alumni registrations.",
      },
      {
        name: "certificates",
        note: "(proposed / may not exist yet) issued certificates.",
      },
      {
        name: "graduation_candidates",
        note: "(proposed / may not exist yet) students in a graduation round.",
      },
      {
        name: "nysc_export_students",
        note: "(proposed / may not exist yet) students in an NYSC export.",
      },
      {
        name: "nysc_exports",
        note: "(proposed / may not exist yet) NYSC export files.",
      },
      {
        name: "student_clearances",
        note: "Per-student clearance decisions.",
      },
      {
        name: "graduation_rounds",
        note: "(proposed / may not exist yet) graduation rounds.",
      },
      {
        name: "student_id_cards",
        note: "(proposed / may not exist yet) student ID cards.",
      },
      {
        name: "id_card_print_batches",
        note: "(proposed / may not exist yet) ID card print batches.",
      },
      {
        name: "result_statements",
        note: "(proposed / may not exist yet) official result statements (result-documents).",
      },
      {
        name: "verification_request_attachments",
        note: "(proposed / may not exist yet) files of verification requests.",
      },
      {
        name: "verification_requests",
        note: "(proposed / may not exist yet) third-party verification requests.",
      },
      {
        name: "issued_documents",
        note: "(proposed / may not exist yet) serial register of issued documents; NOTE two proposals define this name differently (graduation vs result-documents).",
      },
      {
        name: "parent_link_consents",
        note: "(proposed / may not exist yet) consent history of parent links.",
      },
      {
        name: "parent_links",
        note: "(proposed / may not exist yet) parent/guardian links to students.",
      },
      {
        name: "promotion_run_items",
        note: "(proposed / may not exist yet) per-student rows of a promotion run.",
      },
      {
        name: "student_session_standings",
        note: "(proposed / may not exist yet) per-student per-session standing (session-promotion).",
      },
      {
        name: "promotion_runs",
        note: "(proposed / may not exist yet) batch promotion runs (session-promotion).",
      },
      {
        name: "siwes_component_scores",
        note: "(proposed / may not exist yet) SIWES assessment scores.",
      },
      {
        name: "siwes_link_otps",
        note: "(proposed / may not exist yet) OTPs for supervisor links.",
      },
      {
        name: "siwes_logbook_attachments",
        note: "(proposed / may not exist yet) logbook files.",
      },
      {
        name: "siwes_logbook_days",
        note: "(proposed / may not exist yet) SIWES logbook days.",
      },
      {
        name: "siwes_week_comments",
        note: "(proposed / may not exist yet) logbook comments.",
      },
      {
        name: "siwes_logbook_weeks",
        note: "(proposed / may not exist yet) SIWES logbook weeks.",
      },
      {
        name: "siwes_supervisor_links",
        note: "(proposed / may not exist yet) industry supervisor magic links.",
      },
      {
        name: "siwes_visits",
        note: "(proposed / may not exist yet) supervision visits.",
      },
      {
        name: "siwes_placements",
        note: "(proposed / may not exist yet) SIWES placements.",
      },
      {
        name: "siwes_organisations",
        note: "(proposed / may not exist yet) SIWES host organisations entered during placements (test data).",
      },
      {
        name: "student_documents",
        note: "Student uploaded documents (files on disk too).",
      },
      {
        name: "student_program_history",
        note: "(proposed / may not exist yet) programme transfers (student-requests).",
      },
      {
        name: "student_request_attachments",
        note: "(proposed / may not exist yet) request attachments (files too).",
      },
      {
        name: "student_request_events",
        note: "(proposed / may not exist yet) request timeline.",
      },
      {
        name: "student_request_steps",
        note: "(proposed / may not exist yet) approval steps of a request.",
      },
      {
        name: "transcript_fulfilments",
        note: "(proposed / may not exist yet) transcript delivery records.",
      },
      {
        name: "student_requests",
        note: "(proposed / may not exist yet) student requests (transcripts, appeals, deferment...).",
      },
      {
        name: "students",
        note: "Student records.",
      },
      {
        name: "users",
        note: "Student-only login accounts (and their user_roles); accounts holding any other role are kept.",
      },
    ],
    moodle: null,
    preserved: [
      "super_admin accounts",
      "Accounts that also hold a staff or admin role (only their student record goes)",
    ],
  },
  {
    key: "teaching",
    label: "Teaching, registration & results",
    description:
      "Course offerings and lecturer assignments, timetables and exam schedules, attendance, course registration, grades, result sheets and adjustments, CGPA history, course forms, exam dockets, senate approvals and course evaluations.",
    order: 3,
    dependsOn: [
      "students",
      "finance-transactions",
      "accounts",
      "academic-structure",
      "campus",
      "institution-config",
    ],
    cascadesTo: ["lms"],
    tables: [
      {
        name: "attendance",
        note: "Attendance marks per class schedule.",
      },
      {
        name: "cgpa_history",
        note: "Per-semester CGPA snapshots.",
      },
      {
        name: "class_schedules",
        note: "Class timetable slots.",
      },
      {
        name: "course_advisers",
        note: "(proposed / may not exist yet) course adviser assignments.",
      },
      {
        name: "course_form_actions",
        note: "(proposed / may not exist yet) course form approvals.",
      },
      {
        name: "course_forms",
        note: "(proposed / may not exist yet) course forms.",
      },
      {
        name: "course_offering_lecturers",
        note: "Lecturer assignments to offerings.",
      },
      {
        name: "course_offering_major_programs",
        note: "Live table named in cross-program-teaching (offering owners); NOT in schema.prisma, verify it exists.",
      },
      {
        name: "evaluation_aggregates",
        note: "(proposed / may not exist yet) computed evaluation results.",
      },
      {
        name: "evaluation_receipts",
        note: "(proposed / may not exist yet) who submitted an evaluation.",
      },
      {
        name: "evaluation_answers",
        note: "(proposed / may not exist yet) anonymous answers.",
      },
      {
        name: "evaluation_responses",
        note: "(proposed / may not exist yet) anonymous responses.",
      },
      {
        name: "exam_docket_overrides",
        note: "(proposed / may not exist yet) docket blocker overrides.",
      },
      {
        name: "exam_schedules",
        note: "Exam timetable entries.",
      },
      {
        name: "grade_adjustments",
        note: "Per-grade adjustments.",
      },
      {
        name: "grade_adjustment_batches",
        note: "Grade normalisation batches.",
      },
      {
        name: "result_sheets",
        note: "Result workflow sheet per offering.",
      },
      {
        name: "senate_approval_offerings",
        note: "(proposed / may not exist yet) offerings covered by an approval.",
      },
      {
        name: "student_enrollments",
        note: "Course registrations.",
      },
      {
        name: "course_offerings",
        note: "Courses offered in a session/semester.",
      },
      {
        name: "evaluation_window_major_programs",
        note: "(proposed / may not exist yet) window scope.",
      },
      {
        name: "evaluation_windows",
        note: "(proposed / may not exist yet) course evaluation windows.",
      },
      {
        name: "exam_dockets",
        note: "(proposed / may not exist yet) exam dockets.",
      },
      {
        name: "grade_pull_jobs",
        note: "Moodle grade pull jobs.",
      },
      {
        name: "grades",
        note: "Per-student course grades.",
      },
      {
        name: "late_registrations",
        note: "(proposed / may not exist yet) late registration records.",
      },
      {
        name: "registration_changes",
        note: "(proposed / may not exist yet) add/drop log.",
      },
      {
        name: "registration_extensions",
        note: "(proposed / may not exist yet) registration extensions.",
      },
      {
        name: "senate_approval_students",
        note: "(proposed / may not exist yet) students covered by an approval.",
      },
      {
        name: "senate_approvals",
        note: "(proposed / may not exist yet) senate approval records.",
      },
      {
        name: "term_result_summaries",
        note: "Per-term result summaries.",
      },
    ],
    moodle: null,
    preserved: ["The course catalogue and curriculum (Academic structure)"],
  },
  {
    key: "finance-transactions",
    label: "Finance transactions",
    description:
      "Invoices, payments, gateway transactions and webhook logs, bulk fee generation jobs and public (non-portal) invoices.",
    order: 4,
    dependsOn: ["students", "accounts", "academic-structure", "finance-config"],
    cascadesTo: [],
    tables: [
      {
        name: "fee_generation_jobs",
        note: "Bulk invoice generation jobs per fee type.",
      },
      {
        name: "payment_gateway_logs",
        note: "Gateway webhook/verify log.",
      },
      {
        name: "payment_transactions",
        note: "Gateway transaction attempts per payment.",
      },
      {
        name: "payments",
        note: "Payments against invoices.",
      },
      {
        name: "invoices",
        note: "Student/applicant invoices.",
      },
      {
        name: "public_invoices",
        note: "(proposed / may not exist yet) invoices for non-portal payers (verification requests).",
      },
    ],
    moodle: null,
    preserved: ["Fee types and gateway setup (Finance configuration)"],
  },
  {
    key: "communications",
    label: "Communications & logs",
    description:
      "Announcements, notifications, the audit trail of the test period and other activity logs (automation runs, secret reveals, document lookups, parent access log, failed jobs).",
    order: 5,
    dependsOn: ["students", "accounts", "institution-config"],
    cascadesTo: [],
    tables: [
      {
        name: "announcements",
        note: "Announcements.",
      },
      {
        name: "audit_logs",
        note: "Audit trail (test history). The reset run itself is recorded in instance_reset_runs, plus ONE fresh audit_logs row written after the clear.",
      },
      {
        name: "automation_runs",
        note: "(proposed / may not exist yet) automation run log.",
      },
      {
        name: "document_verification_lookups",
        note: "(proposed / may not exist yet) public document lookups (graduation).",
      },
      {
        name: "document_verifications",
        note: "(proposed / may not exist yet) document lookups (result-documents).",
      },
      {
        name: "failed_jobs",
        note: "Laravel failed queue jobs (migration-only; not in schema.prisma).",
      },
      {
        name: "notification_reminders_sent",
        note: "(proposed / may not exist yet) reminder de-duplication log (automation).",
      },
      {
        name: "notifications",
        note: "In-app/email notifications to users.",
      },
      {
        name: "parent_access_log",
        note: "(proposed / may not exist yet) parent portal access log.",
      },
      {
        name: "secret_reveal_attempts",
        note: "(proposed / may not exist yet) secret reveal audit (payment-secrets).",
      },
    ],
    moodle: null,
    preserved: [
      "The reset run history (instance_reset_runs)",
      "One new audit entry recording the reset itself",
    ],
  },
  {
    key: "lms",
    label: "LMS (Moodle) links & Moodle content",
    description:
      "Deletes, in Moodle, the categories, courses, users, cohorts, enrolments, calendar events and grade items the portal created, then clears the portal's Moodle mapping tables, pulled grades, grade-item mappings and drift/reconcile records.",
    order: 6,
    dependsOn: ["teaching", "accounts", "academic-structure"],
    cascadesTo: [],
    tables: [
      {
        name: "moodle_category_health_issues",
        note: "(proposed / may not exist yet) Moodle category health findings (automation).",
      },
      {
        name: "moodle_enrollment_drift",
        note: "Detected Moodle enrolment drift.",
      },
      {
        name: "moodle_enrollment_drift_scans",
        note: "Drift scan runs.",
      },
      {
        name: "moodle_grade_item_mappings",
        note: "Moodle grade item -> CA/EXAM mapping per course.",
      },
      {
        name: "moodle_sync_assessments",
        note: "Moodle assignments/quizzes pulled per course.",
      },
      {
        name: "moodle_sync_calendar_events",
        note: "Portal-pushed Moodle calendar events.",
      },
      {
        name: "moodle_sync_categories",
        note: "Academic unit <-> Moodle category map.",
      },
      {
        name: "moodle_sync_cohort_members",
        note: "Cohort membership map.",
      },
      {
        name: "moodle_sync_cohorts",
        note: "Programme/session/level <-> Moodle cohort map.",
      },
      {
        name: "moodle_sync_enrollments",
        note: "Student enrolment <-> Moodle enrolment map.",
      },
      {
        name: "moodle_sync_grades",
        note: "Moodle grades pulled per user/grade item.",
      },
      {
        name: "moodle_sync_lecturer_assignments",
        note: "Lecturer assignment <-> Moodle teacher enrolment map.",
      },
      {
        name: "moodle_sync_courses",
        note: "Course offering <-> Moodle course map.",
      },
      {
        name: "moodle_sync_reconcile_previews",
        note: "Reconcile previews (short-lived).",
      },
      {
        name: "moodle_sync_users",
        note: "Portal user <-> Moodle user map.",
      },
    ],
    moodle: {
      entities: [
        {
          type: "enrollments",
          label: "Course enrolments of portal students and tutors",
        },
        {
          type: "calendar_events",
          label: "Calendar events the portal pushed",
        },
        {
          type: "grade_items",
          label: "Grade items in portal-created courses",
        },
        {
          type: "cohort_members",
          label: "Members of portal-created cohorts",
        },
        {
          type: "cohorts",
          label: "Programme/session/level cohorts",
        },
        {
          type: "courses",
          label: "Courses created for course offerings",
        },
        {
          type: "categories",
          label: "Categories created for the academic structure",
        },
        {
          type: "users",
          label: "Moodle accounts created for portal students and tutors",
        },
      ],
    },
    preserved: [
      "Moodle site administrators",
      "Moodle users, courses and categories the portal did not create (sync direction PULL, or not in a mapping table)",
    ],
  },
  {
    key: "accounts",
    label: "Staff & user accounts",
    description:
      "Every login account except super_admin accounts, with role grants, staff and lecturer profiles, tokens, password resets, 2FA data, notification preferences and consent records.",
    order: 7,
    dependsOn: ["admissions", "academic-structure", "institution-config"],
    cascadesTo: [
      "admissions",
      "students",
      "teaching",
      "finance-transactions",
      "communications",
      "lms",
      "campus",
    ],
    tables: [
      {
        name: "consent_records",
        note: "(proposed / may not exist yet) data-protection consent records of users (test data).",
      },
      {
        name: "lecturers",
        note: "Lecturer/tutor profiles (incl. any lecturer profile of a super admin).",
      },
      {
        name: "notification_preferences",
        note: "(proposed / may not exist yet) per-user notification preferences; super admins keep theirs.",
      },
      {
        name: "password_resets",
        note: "Password reset tokens.",
      },
      {
        name: "personal_access_tokens",
        note: "Laravel Sanctum tokens (migration-only; verify it exists live). Polymorphic tokenable_type/tokenable_id.",
      },
      {
        name: "refresh_tokens",
        note: "Refresh tokens of deleted users; super admins keep theirs (they are signed in to run the reset).",
      },
      {
        name: "staff",
        note: "Staff profiles (incl. any staff profile of a super admin).",
      },
      {
        name: "two_factor_challenges",
        note: "(proposed / may not exist yet) in-flight 2FA challenges.",
      },
      {
        name: "user_backup_codes",
        note: "(proposed / may not exist yet) 2FA backup codes; super admins keep theirs.",
      },
      {
        name: "user_roles",
        note: "Role grants of deleted users; super_admin accounts keep their rows.",
      },
      {
        name: "user_two_factor",
        note: "(proposed / may not exist yet) 2FA secrets; super admins keep theirs.",
      },
      {
        name: "users",
        note: "All accounts EXCEPT super_admin accounts. Student-only and applicant-only accounts are also removed by the Students / Admissions groups.",
      },
    ],
    moodle: null,
    preserved: [
      "super_admin accounts and their role grants",
      "super_admin refresh tokens and 2FA (they are signed in to run the reset)",
    ],
  },
  {
    key: "academic-structure",
    label: "Academic structure",
    description:
      "Major programmes, faculties, departments, programmes, the academic unit tree, courses and curriculum, sessions and semesters, cohorts, result and promotion policies, SIWES requirements. Resets levels, academic unit types and grading schemes/bands to the defaults.",
    order: 8,
    dependsOn: ["finance-config"],
    cascadesTo: [
      "admissions",
      "students",
      "teaching",
      "finance-transactions",
      "communications",
      "lms",
      "accounts",
      "finance-config",
      "campus",
    ],
    tables: [
      {
        name: "academic_units",
        note: "Generic academic tree (mirrors faculties/departments/programmes/levels/semesters).",
      },
      {
        name: "semesters",
        note: "Semesters/terms.",
      },
      {
        name: "academic_sessions",
        note: "Academic sessions.",
      },
      {
        name: "academic_unit_types",
        note: "Academic unit types: delete institution-added types, keep/re-seed the system types.",
      },
      {
        name: "cohorts",
        note: "Intake cohorts per programme.",
      },
      {
        name: "course_prerequisites",
        note: "Course prerequisites.",
      },
      {
        name: "program_courses",
        note: "Programme curriculum.",
      },
      {
        name: "siwes_requirements",
        note: "(proposed / may not exist yet) SIWES requirement per programme/level.",
      },
      {
        name: "courses",
        note: "Course catalogue.",
      },
      {
        name: "programs",
        note: "Programmes.",
      },
      {
        name: "departments",
        note: "Departments.",
      },
      {
        name: "faculties",
        note: "Faculties.",
      },
      {
        name: "grade_scales",
        note: "Grade bands: delete, then re-seed the default bands (incl. the legacy NULL-scheme 5-point bands).",
      },
      {
        name: "result_policies",
        note: "Result policy per major programme.",
      },
      {
        name: "grading_schemes",
        note: "Grading schemes: delete, then re-seed the default schemes (University 5-Point GPA, WAEC 9-Point).",
      },
      {
        name: "levels",
        note: "Levels: delete, then re-seed the default levels.",
      },
      {
        name: "promotion_policies",
        note: "(proposed / may not exist yet) promotion policy per major programme.",
      },
      {
        name: "major_programs",
        note: "Top-level programme families (e.g. Full-Time / Part-Time).",
      },
    ],
    moodle: null,
    preserved: [
      "Default levels, academic unit types and grading schemes (re-seeded)",
    ],
  },
  {
    key: "finance-config",
    label: "Finance configuration",
    description:
      "Fee types, payment gateways and their credentials, gateway routing and its history, settlement bank accounts, gateway subaccount links and split rules.",
    order: 9,
    dependsOn: ["academic-structure"],
    cascadesTo: ["finance-transactions"],
    tables: [
      {
        name: "split_rule_entries",
        note: "(proposed / may not exist yet) split rule lines.",
      },
      {
        name: "split_rules",
        note: "(proposed / may not exist yet) payment split rules.",
      },
      {
        name: "fee_types",
        note: "Fee types and amounts.",
      },
      {
        name: "gateway_assignment_history",
        note: "(proposed / may not exist yet) routing change history.",
      },
      {
        name: "gateway_credentials",
        note: "(proposed / may not exist yet) gateway keys and secrets (institution-specific; must go).",
      },
      {
        name: "major_program_gateway_assignments",
        note: "(proposed / may not exist yet) gateway routing per major programme.",
      },
      {
        name: "settlement_account_gateway_links",
        note: "(proposed / may not exist yet) gateway subaccount codes for bank accounts.",
      },
      {
        name: "payment_gateways",
        note: "(proposed / may not exist yet) configured gateways; secrets live in gateway_credentials.",
      },
      {
        name: "settlement_accounts",
        note: "(proposed / may not exist yet) institution bank accounts (must go).",
      },
    ],
    moodle: null,
    preserved: [],
  },
  {
    key: "campus",
    label: "Campus & facilities",
    description: "Hostels, blocks, rooms, room allocations and venues.",
    order: 10,
    dependsOn: ["students", "academic-structure"],
    cascadesTo: ["teaching"],
    tables: [
      {
        name: "hostel_allocations",
        note: "Room allocations to students.",
      },
      {
        name: "hostel_rooms",
        note: "Hostel rooms.",
      },
      {
        name: "hostel_blocks",
        note: "Hostel blocks.",
      },
      {
        name: "hostels",
        note: "Hostels.",
      },
      {
        name: "venues",
        note: "Exam/lecture venues.",
      },
    ],
    moodle: null,
    preserved: [],
  },
  {
    key: "institution-config",
    label: "Institution configuration",
    description:
      "Resets settings and feature flags to their defaults (secrets blanked) and notification templates, consent purposes and request types to the system set; clears clearance types, privacy/terms notices, evaluation questionnaires and ID-card serial counters.",
    order: 11,
    dependsOn: ["finance-config"],
    cascadesTo: ["students", "teaching", "accounts"],
    tables: [
      {
        name: "clearance_types",
        note: "Clearance units defined by the institution (Library, Bursary...).",
      },
      {
        name: "consent_purposes",
        note: "(proposed / may not exist yet) consent purpose catalogue: re-seed codes, active=false.",
      },
      {
        name: "evaluation_questions",
        note: "(proposed / may not exist yet) questionnaire questions.",
      },
      {
        name: "evaluation_questionnaires",
        note: "(proposed / may not exist yet) evaluation questionnaires.",
      },
      {
        name: "feature_flags",
        note: "Per-instance feature toggles: enabled reset to feature_registry.default_enabled, updated_by NULL.",
      },
      {
        name: "id_card_serial_counters",
        note: "(proposed / may not exist yet) ID card serial counters (start again from zero).",
      },
      {
        name: "legal_notices",
        note: "(proposed / may not exist yet) privacy/terms texts (institution-specific).",
      },
      {
        name: "notification_templates",
        note: "Message templates: delete institution edits, re-seed the system templates (if a default set exists, else clear).",
      },
      {
        name: "settings",
        note: "Key/value settings: rows kept, values reset to the default catalogue; secret values (gateway keys) blanked.",
      },
      {
        name: "student_request_types",
        note: "(proposed / may not exist yet) request type catalogue: re-seed defaults, fee_type_id NULL.",
      },
    ],
    moodle: null,
    preserved: [
      "Setting rows (values reset, rows kept)",
      "Feature catalogue (feature_registry)",
      "Roles and permissions",
    ],
  },
]

/** Always survives a reset (preserved.json "preserve" + "runState"). */
export const PRESERVED_CATALOG: readonly PreservedCatalogItem[] = [
  {
    title: "Super admin accounts",
    entries: [
      {
        table: "users",
        reason:
          "super_admin accounts only (users whose user_roles include the super_admin role); every other account is deleted.",
      },
      {
        table: "user_roles",
        reason:
          "Role grants of the surviving super_admin accounts; major_program_id is nulled when Academic structure is cleared.",
      },
      {
        table: "refresh_tokens",
        reason:
          "Only the super_admin accounts' own tokens survive (the running session must stay valid); all other rows are deleted.",
      },
    ],
  },
  {
    title: "Roles and permissions",
    entries: [
      {
        table: "roles",
        reason: "System role catalogue (RoleSeeder); product decision: keep.",
      },
      {
        table: "permissions",
        reason:
          "Permission catalogue (PermissionSeeder + live additions, ids 115-122 etc.); product decision: keep.",
      },
      {
        table: "role_permissions",
        reason: "Role -> permission matrix; product decision: keep.",
      },
    ],
  },
  {
    title: "Location reference data",
    entries: [
      {
        table: "countries",
        reason: "Location reference data (seeded by 2026_08_27_000006); keep.",
      },
      {
        table: "states",
        reason: "Nigerian states + FCT (seeded); keep.",
      },
      {
        table: "local_governments",
        reason: "Nigerian LGAs (seeded 2026_08_29_000002); keep.",
      },
    ],
  },
  {
    title: "Feature registry",
    entries: [
      {
        table: "feature_registry",
        reason:
          "Feature catalogue (system-defined, holds default_enabled); keep.",
      },
    ],
  },
  {
    title: "Revoked access tokens",
    entries: [
      {
        table: "revoked_access_tokens",
        reason:
          "JWT deny-list (jti, no user FK). Clearing it would re-validate revoked tokens until they expire; keep (prune only expired rows).",
      },
    ],
  },
  {
    title: "Migration ledger",
    entries: [
      {
        table: "migrations",
        reason: "Laravel migration ledger; never touch.",
      },
    ],
  },
  {
    title: "Reset history and the go-live lock",
    entries: [
      {
        table: "instance_reset_runs",
        reason:
          "(proposed) one row per reset run: who, when, groups, counts, backupRef, status. Never cleared.",
      },
      {
        table: "instance_reset_run_steps",
        reason:
          "(proposed) per-table / per-Moodle-entity step of a run. Never cleared.",
      },
      {
        table: "instance_reset_previews",
        reason:
          "(proposed) previews (previewId, resolved closure, row counts, expiresAt). Never cleared by a reset (prune expired).",
      },
      {
        table: "instance_reset_state",
        reason:
          "(proposed) single row: locked, locked_at, locked_by_user_id (go-live lock). Never cleared.",
      },
    ],
  },
]

/** Kept as rows but emptied and re-seeded, or reset to default values. */
export const RESET_TO_DEFAULTS_CATALOG: readonly PreservedCatalogEntry[] = [
  {
    table: "admission_step_definitions",
    reason:
      "Admission process/form step registry: delete, then re-seed the default PROCESS + FORM steps.",
  },
  {
    table: "admission_form_fields",
    reason:
      "Fields of the FORM steps: delete, then re-seed the default fields (dynamic-admission SCHEMA_CHANGES §6).",
  },
  {
    table: "admission_sequence_rule_settings",
    reason:
      "Sequence-rule toggles: an empty table means built-in defaults, so delete all rows.",
  },
  {
    table: "levels",
    reason: "Levels: delete, then re-seed the default levels.",
  },
  {
    table: "academic_unit_types",
    reason:
      "Academic unit types: delete institution-added types, keep/re-seed the system types.",
  },
  {
    table: "grading_schemes",
    reason:
      "Grading schemes: delete, then re-seed the default schemes (University 5-Point GPA, WAEC 9-Point).",
  },
  {
    table: "grade_scales",
    reason:
      "Grade bands: delete, then re-seed the default bands (incl. the legacy NULL-scheme 5-point bands).",
  },
  {
    table: "settings",
    reason:
      "Key/value settings: rows kept, values reset to the default catalogue; secret values (gateway keys) blanked.",
  },
  {
    table: "feature_flags",
    reason:
      "Per-instance feature toggles: enabled reset to feature_registry.default_enabled, updated_by NULL.",
  },
  {
    table: "notification_templates",
    reason:
      "Message templates: delete institution edits, re-seed the system templates (if a default set exists, else clear).",
  },
  {
    table: "consent_purposes",
    reason:
      "(proposed / may not exist yet) consent purpose catalogue: re-seed codes, active=false.",
  },
  {
    table: "student_request_types",
    reason:
      "(proposed / may not exist yet) request type catalogue: re-seed defaults, fee_type_id NULL.",
  },
]
