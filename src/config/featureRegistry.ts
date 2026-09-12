export type FeatureCategory =
  | "core"
  | "authentication"
  | "access"
  | "admissions"
  | "finance"
  | "academics"
  | "housing"
  | "engagement"
  | "communication"
  | "insights"
  | "operations"
  | "integrations"

export type FeatureDefinition = {
  key: string
  label: string
  description: string
  category: FeatureCategory
  defaultEnabled: boolean
  dependencies?: readonly string[]
  immutable?: boolean
}

const FEATURE_REGISTRY_RAW = [
  {
    key: "landing_page",
    label: "Landing Page",
    description: "Public marketing and information pages.",
    category: "core",
    defaultEnabled: true,
    immutable: true,
  },
  {
    key: "registration",
    label: "Registration",
    description: "Account signup and initial profile creation.",
    category: "core",
    defaultEnabled: true,
    immutable: true,
  },
  {
    key: "password_auth",
    label: "Password Authentication",
    description: "Email or username plus password login.",
    category: "authentication",
    defaultEnabled: true,
    dependencies: ["registration"],
  },
  {
    key: "otp_auth",
    label: "OTP Authentication",
    description: "One-time passcode authentication flow.",
    category: "authentication",
    defaultEnabled: true,
    dependencies: ["registration"],
  },
  {
    key: "role_permissions",
    label: "Roles and Permissions",
    description: "RBAC with role and permission assignments.",
    category: "access",
    defaultEnabled: true,
    immutable: true,
  },
  {
    key: "admission",
    label: "Admission System",
    description: "Application intake, review, and admission decisions.",
    category: "admissions",
    defaultEnabled: true,
    dependencies: ["registration"],
  },
  {
    key: "payment",
    label: "Payment System",
    description: "Invoice payment collection and transaction tracking.",
    category: "finance",
    defaultEnabled: true,
  },
  {
    key: "fee_management",
    label: "Fee Management",
    description: "Fee structures, billing rules, and fee schedules.",
    category: "finance",
    defaultEnabled: true,
    dependencies: ["payment"],
  },
  {
    key: "user_management",
    label: "User Management",
    description: "Admin workflows for students, staff, and roles.",
    category: "access",
    defaultEnabled: true,
    dependencies: ["role_permissions"],
  },
  {
    key: "program_management",
    label: "University Programs Management",
    description: "Program, faculty, and department management tools.",
    category: "academics",
    defaultEnabled: true,
  },
  {
    key: "moodle_lms",
    label: "Moodle LMS Integration",
    description: "Core Moodle connectivity for sync and LMS operations.",
    category: "integrations",
    defaultEnabled: true,
    immutable: true,
  },
  {
    key: "moodle_sso",
    label: "Moodle SSO",
    description: "Single sign-on between portal and Moodle.",
    category: "integrations",
    defaultEnabled: true,
    dependencies: ["moodle_lms"],
  },
  {
    key: "course_sync",
    label: "Course Sync Management",
    description: "Portal to Moodle course and enrollment sync.",
    category: "integrations",
    defaultEnabled: true,
    dependencies: ["moodle_lms"],
  },
  {
    key: "hostel_management",
    label: "Hostel Management",
    description: "Hostel inventory, rooms, and allocations.",
    category: "housing",
    defaultEnabled: true,
  },
  {
    key: "grading",
    label: "Grading and GPA",
    description: "Grade entry, GPA computation, and publishing.",
    category: "academics",
    defaultEnabled: true,
    dependencies: ["program_management"],
  },
  {
    key: "clearance",
    label: "Clearance System",
    description: "Student clearance workflows and approvals.",
    category: "operations",
    defaultEnabled: true,
    dependencies: ["user_management"],
  },
  {
    key: "session_semester",
    label: "Session and Semester Management",
    description: "Academic session creation and semester migration.",
    category: "academics",
    defaultEnabled: true,
  },
  {
    key: "gamification",
    label: "Gamification and Leaderboard",
    description: "Points, badges, and leaderboard mechanics.",
    category: "engagement",
    defaultEnabled: false,
    dependencies: ["moodle_lms"],
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "In-app, email, and SMS notifications.",
    category: "communication",
    defaultEnabled: true,
  },
  {
    key: "calendar_timetable_sync",
    label: "Calendar and Timetable Sync",
    description: "Calendar and timetable sync with Moodle and portal.",
    category: "integrations",
    defaultEnabled: true,
    dependencies: ["moodle_lms", "session_semester"],
  },
  {
    key: "profile_settings",
    label: "Profile Settings",
    description: "User profile updates and preferences.",
    category: "core",
    defaultEnabled: true,
    dependencies: ["registration"],
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "Academic, finance, and operational dashboards.",
    category: "insights",
    defaultEnabled: true,
  },
  {
    key: "audit",
    label: "Audit System",
    description: "Audit logs and activity tracing.",
    category: "operations",
    defaultEnabled: true,
    immutable: true,
  },
  {
    key: "system_configuration",
    label: "System Configuration",
    description: "Global app and integration configuration.",
    category: "operations",
    defaultEnabled: true,
    immutable: true,
  },
  {
    key: "portal_settings",
    label: "Portal Settings",
    description: "Feature toggles and portal-level settings.",
    category: "operations",
    defaultEnabled: true,
    dependencies: ["system_configuration"],
    immutable: true,
  },
] as const satisfies readonly FeatureDefinition[]

export type FeatureKey = (typeof FEATURE_REGISTRY_RAW)[number]["key"]

export type FeatureRegistryItem = Omit<
  FeatureDefinition,
  "key" | "dependencies"
> & {
  key: FeatureKey
  dependencies?: readonly FeatureKey[]
}

export const FEATURE_REGISTRY: readonly FeatureRegistryItem[] =
  FEATURE_REGISTRY_RAW

export const FEATURE_KEYS = FEATURE_REGISTRY_RAW.map(
  (feature) => feature.key
) as FeatureKey[]

export const FEATURE_REGISTRY_MAP: Record<FeatureKey, FeatureRegistryItem> =
  Object.fromEntries(
    FEATURE_REGISTRY.map((feature) => [feature.key, feature])
  ) as Record<FeatureKey, FeatureRegistryItem>

export const FEATURE_CATEGORY_LABELS: Record<FeatureCategory, string> = {
  core: "Core",
  authentication: "Authentication",
  access: "Access Control",
  admissions: "Admissions",
  finance: "Finance",
  academics: "Academics",
  housing: "Housing",
  engagement: "Engagement",
  communication: "Communication",
  insights: "Insights",
  operations: "Operations",
  integrations: "Integrations",
}
