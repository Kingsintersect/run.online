import {
  AppWindowIcon,
  Banknote,
  BarChart,
  CalendarCheck2,
  ChartNetwork,
  ClapperboardIcon,
  ColumnsSettingsIcon,
  ListChecks,
  ListChevronsUpDown,
  NetworkIcon,
  SchoolIcon,
  Settings2,
  WifiSyncIcon,
  type LucideIcon,
} from "lucide-react"
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  Bell,
  Settings,
  Users,
  BarChart3,
  Building2,
  ShieldCheck,
  Database,
  CreditCard,
  FolderOpen,
  UserCog,
  Globe,
  Link2,
  Award,
  UserCheck,
  CalendarCheck,
  MapPin,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export enum UserRole {
  APPLICANT = "APPLICANT",
  GUEST = "GUEST",
  STUDENT = "STUDENT",
  TUTOR = "TUTOR",
  STAFF = "STAFF",
  HOD = "HOD",
  DEAN = "DEAN",
  BURSARY = "BURSARY",
  DIRECTOR = "DIRECTOR",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}
export interface NavItem {
  title: string
  href?: string
  icon: LucideIcon
  badge?: string | number
  badgeVariant?: string
  matchExactOnly?: boolean
  children?: NavItem[]
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

/* ------------------------------------------------------------------ */
/*  Student navigation                                                 */
/* ------------------------------------------------------------------ */

const studentNav: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/student/dashboard",
        matchExactOnly: true,
        icon: LayoutDashboard,
      },
      {
        title: "My Application",
        href: "/student/my-application",
        matchExactOnly: true,
        icon: FileText,
      },
      {
        title: "My Documents",
        href: "/student/documents",
        matchExactOnly: true,
        icon: FolderOpen,
      },
      {
        title: "My Hostel",
        href: "/student/hostel",
        matchExactOnly: true,
        icon: Building2,
      },
      {
        title: "My Clearance",
        href: "/student/clearance",
        matchExactOnly: true,
        icon: ListChecks,
      },
    ],
  },
  {
    label: "Academics",
    items: [
      {
        title: "My Courses",
        href: "/student/courses",
        matchExactOnly: true,
        icon: BookOpen,
      },
      {
        title: "Timetable",
        href: "/student/timetable",
        matchExactOnly: false,
        icon: CalendarDays,
      },
      {
        title: "Assessments",
        href: "/student/assessments/my-assessments",
        matchExactOnly: false,
        icon: ClipboardList,
      },
      {
        title: "Course Registration",
        href: "/student/enrollment",
        matchExactOnly: true,
        icon: UserCheck,
      },
      {
        title: "My Attendance",
        href: "/student/attendance",
        matchExactOnly: true,
        icon: CalendarCheck,
      },
      {
        title: "Results",
        href: "/student/results",
        matchExactOnly: true,
        icon: ClipboardList,
      },
      {
        title: "Grades",
        href: "/student/results/grades",
        matchExactOnly: true,
        icon: CalendarDays,
      },
      {
        // No dedicated /student/profile route — the profile editor lives as a
        // tab on the Settings page.
        title: "Profile",
        href: "/student/settings",
        matchExactOnly: true,
        icon: UserCog,
      },
    ],
  },
  {
    label: "Moodle LMS",
    items: [
      {
        title: "Moodle Grades",
        href: "/student/moodle/grades",
        matchExactOnly: true,
        icon: Award,
      },
      {
        title: "Moodle Calendar",
        href: "/student/moodle/calendar",
        matchExactOnly: true,
        icon: CalendarDays,
      },
      {
        title: "Upcoming (Moodle)",
        href: "/student/moodle/assessments/upcoming",
        matchExactOnly: true,
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Campus",
    items: [
      {
        title: "Notifications",
        href: "/student/notifications",
        matchExactOnly: true,
        icon: Bell,
        badge: 3,
        badgeVariant: "warning",
      },
      {
        title: "Calendar & Events",
        href: "/student/timetable/calendar",
        matchExactOnly: false,
        icon: CalendarDays,
      },
      {
        // The fees + payment surface is served at /student/fees.
        title: "Payments",
        href: "/student/fees",
        matchExactOnly: false,
        icon: CreditCard,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "Settings",
        href: "/student/settings",
        matchExactOnly: true,
        icon: Settings,
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Tutor navigation                                                */
/* ------------------------------------------------------------------ */

const tutorNav: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/tutor",
        matchExactOnly: true,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Teaching",
    items: [
      {
        title: "Course Assignments",
        href: "/tutor/courses",
        matchExactOnly: true,
        icon: CalendarCheck2,
      },
      {
        title: "Assessments",
        href: "/tutor/assessments",
        matchExactOnly: true,
        icon: ClipboardList,
      },
      {
        title: "Attendance",
        href: "/tutor/attendance",
        matchExactOnly: true,
        icon: CalendarCheck,
      },
      {
        title: "Timetable",
        href: "/tutor/timetable",
        matchExactOnly: true,
        icon: CalendarDays,
      },
      {
        title: "Grading",
        icon: ClipboardList,
        children: [
          {
            title: "Submit Results",
            href: "/tutor/grading/submit",
            matchExactOnly: true,
            icon: FileText,
          },
          {
            title: "Grade Book",
            href: "/tutor/grading/book",
            matchExactOnly: true,
            icon: FolderOpen,
          },
        ],
      },
      // REMOVED (2026-09-12): "Resources" -> "/tutor/resources" 404'd —
      // found via a full nav sweep, live-tested with a real TUTOR login.
      // No dedicated resources page exists under /tutor — pulled the dead
      // link rather than silently building a new page.
    ],
  },
  {
    label: "Campus",
    items: [
      {
        title: "Notifications",
        href: "/tutor/notifications",
        matchExactOnly: true,
        icon: Bell,
      },
      // REMOVED (2026-09-12): "Calendar & Events" -> "/tutor/timetable/
      // calendar" 404'd — found the same way. "/tutor/timetable" itself
      // (the parent, one level up) is real and already the timetable view;
      // no separate nested calendar page exists under it.
    ],
  },
  {
    label: "Account",
    items: [
      {
        // RESTORED (2026-09-12): was removed as a dead link, then a real
        // page was built at this path — the tutor onboarding checklist's
        // "Confirm your profile" step (TutorOnboardingChecklist.tsx) always
        // linked here, so this needed a real destination, not just removal.
        title: "Settings",
        href: "/tutor/settings",
        matchExactOnly: true,
        icon: Settings,
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  HOD navigation                                                     */
/* ------------------------------------------------------------------ */

const hodNav: NavGroup[] = tutorNav

/* ------------------------------------------------------------------ */
/*  Director navigation                                                   */
/* ------------------------------------------------------------------ */

const directorNav: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/director/dashboard",
        matchExactOnly: true,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Scholars",
    items: [
      {
        title: "Student & Lectures",
        href: "/director/scholars",
        matchExactOnly: true,
        icon: GraduationCap,
      },
    ],
  },
  {
    label: "Academic Reports",
    items: [
      {
        title: "Grade Reports",
        href: "/director/grades",
        matchExactOnly: true,
        icon: GraduationCap,
      },
    ],
  },
  {
    label: "Finances",
    items: [
      {
        title: "Financial Reports",
        href: "/director/financial-reports",
        matchExactOnly: true,
        icon: BarChart3,
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Admin navigation                                                   */
/* ------------------------------------------------------------------ */

const adminNav: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/manager/dashboard",
        matchExactOnly: true,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Admission",
    items: [
      {
        title: "Review Applications",
        href: "/manager/review-applications",
        matchExactOnly: true,
        icon: GraduationCap,
      },
    ],
  },
  {
    label: "Academic Sessions",
    items: [
      {
        title: "Sessions",
        href: "/manager/academics/academic-year",
        matchExactOnly: true,
        icon: CalendarDays,
      },
      {
        title: "Admissions",
        href: "/manager/academics/admissions",
        matchExactOnly: true,
        icon: SchoolIcon,
      },
      {
        title: "Course Structure",
        href: "/manager/academics/course-structure",
        matchExactOnly: true,
        icon: GraduationCap,
      },
      {
        title: "Academic Structure",
        href: "/manager/academics/academic-structure",
        matchExactOnly: true,
        icon: NetworkIcon,
      },
      {
        title: "Courses",
        href: "/manager/academics/courses-management",
        matchExactOnly: true,
        icon: BookOpen,
      },
      {
        title: "Demographics",
        href: "/manager/configurations/demographics",
        matchExactOnly: true,
        icon: MapPin,
      },
    ],
  },
  {
    label: "User Management",
    items: [
      {
        title: "User Management",
        icon: UserCog,
        children: [
          {
            title: "Summary",
            href: "/manager/users/summary",
            matchExactOnly: true,
            icon: Users,
          },
          {
            title: "Students",
            href: "/manager/users/students",
            matchExactOnly: true,
            icon: GraduationCap,
          },
          {
            title: "Tutors",
            href: "/manager/users/tutors",
            matchExactOnly: true,
            icon: BookOpen,
          },
          {
            title: "Staff",
            href: "/manager/users/staff",
            matchExactOnly: true,
            icon: UserCog,
          },
          {
            title: "Documents",
            href: "/manager/documents",
            matchExactOnly: true,
            icon: FileText,
          },
          {
            title: "Hostels",
            href: "/manager/hostels",
            matchExactOnly: true,
            icon: Building2,
          },
          {
            title: "Clearance",
            href: "/manager/clearance",
            matchExactOnly: true,
            icon: ListChecks,
          },
        ],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Fee Management",
        href: "/manager/finance/fees",
        matchExactOnly: true,
        icon: Banknote,
      },
    ],
  },
  {
    label: "Grades Management",
    items: [
      {
        title: "Summary Charts",
        href: "/manager/grades/summary",
        matchExactOnly: true,
        icon: BarChart,
      },
      {
        title: "Results",
        href: "/manager/grades/results",
        matchExactOnly: true,
        icon: ListChevronsUpDown,
      },
      {
        title: "Publish Results",
        href: "/manager/grades/publish-results",
        matchExactOnly: true,
        icon: ListChecks,
      },
      {
        title: "Grading Schemes",
        href: "/manager/grades/grading-schemes",
        matchExactOnly: true,
        icon: Settings2,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      // REMOVED (2026-09-12): "Analytics" -> "/manager/analytics" 404'd —
      // found via a full nav sweep, same gap as SUPER_ADMIN's "Analytics"
      // link (see the matching note on adminNav above). No analytics page
      // exists anywhere in the app yet to repoint this at — pulled the
      // dead link rather than silently building a new dashboard.
      {
        title: "Announcements",
        href: "/manager/announcements",
        matchExactOnly: true,
        icon: Bell,
      },
      {
        title: "Notifications",
        href: "/manager/notification",
        matchExactOnly: true,
        icon: Bell,
      },
    ],
  },
  // REMOVED (2026-09-12): "Account" > "Settings" -> "/manager/settings"
  // 404'd — found via a full nav sweep, same gap as SUPER_ADMIN's "Account
  // Settings" link. No admin-tier settings page exists anywhere in the app
  // (only /student/settings and /guest/settings are real) — pulled the
  // dead link rather than silently building a new page.
]

/* ------------------------------------------------------------------ */
/*  Super-admin navigation                                            */
/* ------------------------------------------------------------------ */

const superAdminNav: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        matchExactOnly: true,
        icon: LayoutDashboard,
      },
      {
        title: "Configurations",
        icon: AppWindowIcon,
        children: [
          {
            title: "Application Config",
            href: "/admin/configurations/app-config",
            matchExactOnly: true,
            icon: ColumnsSettingsIcon,
          },
          {
            title: "Roles & Permissions",
            href: "/admin/configurations/roles",
            matchExactOnly: true,
            icon: ShieldCheck,
          },
          {
            title: "Admission Config",
            href: "/admin/configurations/admission-config",
            matchExactOnly: true,
            icon: ClapperboardIcon,
          },
          {
            title: "Features Registry",
            href: "/admin/configurations/feature-registry",
            matchExactOnly: true,
            icon: Globe,
          },
          {
            title: "Features Access",
            href: "/admin/configurations/feature-access",
            matchExactOnly: true,
            icon: Settings,
          },
          {
            title: "Clearance Types",
            href: "/admin/configurations/clearance-types",
            matchExactOnly: true,
            icon: ListChecks,
          },
          {
            title: "Demographics",
            href: "/admin/configurations/demographics",
            matchExactOnly: true,
            icon: MapPin,
          },
        ],
      },
    ],
  },
  {
    label: "Academics",
    items: [
      {
        title: "Sessions",
        href: "/admin/academics/academic-year",
        matchExactOnly: true,
        icon: CalendarDays,
      },
      {
        title: "Admissions",
        href: "/admin/academics/admissions",
        matchExactOnly: true,
        icon: SchoolIcon,
      },
      {
        title: "Course Structure",
        href: "/admin/academics/course-structure",
        matchExactOnly: true,
        icon: GraduationCap,
      },
      {
        title: "Academic Structure",
        href: "/admin/academics/academic-structure",
        matchExactOnly: true,
        icon: NetworkIcon,
      },
      {
        title: "Courses",
        href: "/admin/academics/courses-management",
        matchExactOnly: true,
        icon: BookOpen,
      },
      {
        title: "Assessments",
        icon: ClipboardList,
        children: [
          {
            title: "All Assessments",
            href: "/admin/assessments",
            matchExactOnly: true,
            icon: ClipboardList,
          },
          {
            title: "Sync Status",
            href: "/admin/assessments/sync-status",
            matchExactOnly: true,
            icon: Database,
          },
        ],
      },
      {
        title: "Timetable",
        icon: CalendarDays,
        children: [
          {
            title: "All Schedules",
            href: "/admin/timetable",
            matchExactOnly: true,
            icon: CalendarDays,
          },
          {
            title: "Venue Checker",
            href: "/admin/timetable/venue-check",
            matchExactOnly: true,
            icon: Building2,
          },
        ],
      },
      {
        title: "Enrollment",
        href: "/admin/enrollment",
        matchExactOnly: true,
        icon: UserCheck,
      },
    ],
  },
  {
    label: "Synchronize LMS",
    items: [
      {
        title: "Moodle Syncronizer",
        icon: WifiSyncIcon,
        children: [
          {
            title: "Overview",
            href: "/admin/moodle-sync",
            matchExactOnly: true,
            icon: WifiSyncIcon,
          },
          {
            title: "Categories",
            href: "/admin/moodle-sync/categories",
            matchExactOnly: true,
            icon: Building2,
          },
          {
            title: "Users",
            href: "/admin/moodle-sync/users",
            matchExactOnly: true,
            icon: Users,
          },
          {
            title: "Courses",
            href: "/admin/moodle-sync/courses",
            matchExactOnly: true,
            icon: BookOpen,
          },
          {
            title: "Enrollments",
            href: "/admin/moodle-sync/enrollments",
            matchExactOnly: true,
            icon: Link2,
          },
          {
            title: "Assessments",
            href: "/admin/moodle-sync/assessments",
            matchExactOnly: true,
            icon: ClipboardList,
          },
          {
            title: "Grades",
            href: "/admin/moodle-sync/grades",
            matchExactOnly: true,
            icon: Award,
          },
          {
            title: "Calendar & Zoom",
            href: "/admin/moodle-sync/calendar",
            matchExactOnly: true,
            icon: CalendarDays,
          },
        ],
      },
    ],
  },
  {
    label: "Account Operations",
    items: [
      {
        title: "Summary",
        href: "/admin/users/summary",
        matchExactOnly: true,
        icon: Users,
      },
      {
        title: "Account Administration",
        icon: UserCog,
        children: [
          {
            title: "Students",
            href: "/admin/users/students",
            matchExactOnly: true,
            icon: GraduationCap,
          },
          {
            title: "Tutors",
            href: "/admin/users/tutors",
            matchExactOnly: true,
            icon: BookOpen,
          },
          {
            title: "Staff",
            href: "/admin/users/staff",
            matchExactOnly: true,
            icon: UserCog,
          },
        ],
      },
      {
        title: "Documents",
        href: "/admin/documents",
        matchExactOnly: true,
        icon: FileText,
      },
      {
        title: "Hostels",
        href: "/admin/hostels",
        matchExactOnly: true,
        icon: Building2,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Fee Management",
        href: "/admin/finance/fees",
        matchExactOnly: true,
        icon: Banknote,
      },
    ],
  },
  {
    label: "Grades Management",
    items: [
      {
        title: "Summary Charts",
        href: "/admin/grades/summary",
        matchExactOnly: true,
        icon: BarChart,
      },
      {
        title: "Results",
        href: "/admin/grades/results",
        matchExactOnly: true,
        icon: ListChevronsUpDown,
      },
      {
        title: "Publish Results",
        href: "/admin/grades/publish-results",
        matchExactOnly: true,
        icon: ListChecks,
      },
      {
        title: "Grading Schemes",
        href: "/admin/grades/grading-schemes",
        matchExactOnly: true,
        icon: Settings2,
      },
    ],
  },
  {
    label: "Auditing",
    items: [
      {
        title: "Audit Overview",
        href: "/admin/audit",
        matchExactOnly: true,
        icon: ChartNetwork,
      },
      {
        title: "Audit Logs",
        href: "/admin/audit/logs",
        matchExactOnly: true,
        icon: NetworkIcon,
      },
    ],
  },
  {
    label: "Communications",
    items: [
      {
        title: "Announcements",
        href: "/admin/announcements",
        matchExactOnly: true,
        icon: Bell,
      },
      {
        title: "Notifications",
        href: "/admin/notification",
        matchExactOnly: true,
        icon: Bell,
      },
      {
        title: "Calendar Events",
        href: "/admin/calendar",
        matchExactOnly: true,
        icon: CalendarDays,
      },
    ],
  },
  {
    label: "System",
    items: [
      // REMOVED (2026-09-12): "Analytics" -> "/admin/system/analytics" 404'd
      // — found via a full nav sweep. Unlike "System Config" below, there is
      // no existing analytics page anywhere in the app to repoint this at;
      // it was advertised in the sidebar but never built. Pulled the dead
      // link rather than silently building a new analytics dashboard —
      // flagged to the user as a real, separately-scoped feature to build.
      {
        // FIX (2026-09-12): pointed at "/admin/system/config", which has
        // never had a page — 404'd, found via a full nav sweep. The real,
        // fully-built system-settings page already exists at this path
        // (src/app/(dashboard)/admin/(routes)/configurations/app-config) —
        // this was a wrong href, not a missing page.
        title: "System Config",
        href: "/admin/configurations/app-config",
        matchExactOnly: true,
        icon: Database,
      },
    ],
  },
  // REMOVED (2026-09-12): "Account" > "Settings" -> "/admin/account/settings"
  // 404'd — found via a full nav sweep. No admin-facing settings page exists
  // to repoint this at (unlike System Config); student/guest have a real
  // equivalent at */settings this could be adapted from, but building it is
  // new page work, not a link fix — pulled the dead link and flagged to the
  // user as a real, separately-scoped feature to build rather than doing it
  // silently.
]

/* ------------------------------------------------------------------ */
/*  Dean navigation                                                    */
/* ------------------------------------------------------------------ */

// DEAN otherwise mirrors ADMIN's nav exactly (deliberately — both are
// platform-wide operational roles), except for one entry point: adminNav's
// "User Management" > "Summary" link is the page that exposes "Add User"
// (any role, including SUPER_ADMIN) and "Manage roles" (assign/revoke any
// role) — see StatisticsManagementShell in
// src/modules/user-management/components/UserManagementShell.tsx. Per
// sandbox/BACKEND_DEVIATIONS_2026-09-14.md A27 and
// sandbox/major-program-scoping/README.md §F (both confirmed live,
// 2026-09-16), DEAN currently gets Admin-equivalent access to that
// create/manage-any-account-any-role capability, which should be
// Admin/Super-Admin-only. Every other "User Management" entry (Students,
// Tutors, Staff, Documents, Hostels, Clearance) stays — DEAN's real
// permissions already cover those correctly (students/tutors/staff
// view+manage). See UserManagementShell.tsx's matching role check for the
// page-level guard (nav removal alone doesn't stop direct navigation).
const deanNav: NavGroup[] = adminNav.map((group) =>
  group.label !== "User Management"
    ? group
    : {
        ...group,
        items: group.items.map((item) =>
          item.title !== "User Management" || !item.children
            ? item
            : {
                ...item,
                children: item.children.filter((c) => c.title !== "Summary"),
              }
        ),
      }
)

/* ------------------------------------------------------------------ */
/*  Bursary navigation                                                 */
/* ------------------------------------------------------------------ */

const bursaryNav: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/admin/finance/fees",
        matchExactOnly: true,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Fee Management",
        href: "/admin/finance/fees",
        matchExactOnly: true,
        icon: CreditCard,
      },
    ],
  },
  // REMOVED (2026-09-12): "Account" > "Settings" -> "/admin/settings"
  // 404'd — found via a full nav sweep, live-tested with a real BURSARY
  // login. Same gap as every other role's "Settings" link this sweep found
  // — no page exists at this path (distinct from "/admin/account/settings",
  // SUPER_ADMIN's own dead link, removed earlier — this is a different,
  // equally-nonexistent path).
]

const applicantNav: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/process-admission",
        matchExactOnly: true,
        icon: LayoutDashboard,
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Staff navigation                                                   */
/* ------------------------------------------------------------------ */

const staffNav: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/manager/dashboard",
        matchExactOnly: true,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Records",
    items: [
      {
        // FIX (2026-09-12): pointed at "/manager/students", which has never
        // had a page — 404'd, found via a full nav sweep (live-tested with
        // a real STAFF login, not just static analysis). The real students
        // list lives at this path (same route ADMIN's own nav uses).
        title: "Students",
        href: "/manager/users/students",
        matchExactOnly: true,
        icon: GraduationCap,
      },
      // REMOVED (2026-09-12): "Departments" -> "/manager/departments"
      // 404'd — found the same way. No dedicated department-list page
      // exists; the closest real feature is the broader Academic Structure
      // builder ("/manager/academics/academic-structure"), which manages
      // the whole faculty/department/program tree rather than a simple
      // department list — didn't repoint to it since that would change
      // what this link promises, not just fix its href. Pulled the dead
      // link and flagged to the user rather than deciding that silently.
      {
        title: "Clearance",
        href: "/manager/clearance",
        matchExactOnly: true,
        icon: ListChecks,
      },
    ],
  },
  {
    label: "Campus",
    items: [
      {
        title: "Announcements",
        href: "/manager/announcements",
        matchExactOnly: true,
        icon: Bell,
      },
      // REMOVED (2026-09-12): "Messages" -> "/manager/messages" 404'd —
      // found the same way. No messaging feature exists anywhere in this
      // app (not just this page) — pulled the dead link rather than
      // silently building a new messaging system.
    ],
  },
  // REMOVED (2026-09-12): "Account" > "Settings" -> "/manager/settings"
  // 404'd — found the same way, same gap as ADMIN's and SUPER_ADMIN's own
  // "Settings"/"Account Settings" links (see the matching notes above).
]

const guestNav: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/guest/dashboard",
        matchExactOnly: true,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "Settings",
        href: "/guest/settings",
        matchExactOnly: true,
        icon: Settings,
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Combined config keyed by role                                      */
/* ------------------------------------------------------------------ */

export const navConfig: Record<UserRole, NavGroup[]> = {
  APPLICANT: applicantNav,
  GUEST: guestNav,
  STUDENT: studentNav,
  TUTOR: tutorNav,
  STAFF: staffNav,
  HOD: hodNav,
  DEAN: deanNav,
  BURSARY: bursaryNav,
  DIRECTOR: directorNav,
  ADMIN: adminNav,
  SUPER_ADMIN: superAdminNav,
}

/** Maps each role to its dashboard base path */
export const roleDashboardPath: Record<UserRole, string> = {
  [UserRole.APPLICANT]: "/process-admission",
  [UserRole.STUDENT]: "/student/dashboard",
  [UserRole.GUEST]: "/guest/dashboard",
  // FIX (2026-09-12): both were "/tutor/dashboard", which has never had a
  // page — every TUTOR and HOD login redirected straight to a 404 (HOD
  // reuses tutorNav, see hodNav below). No "dashboard" subroute exists
  // under tutor/ at all — the real dashboard is the tutor area's own root,
  // "/tutor" (src/app/(dashboard)/tutor/page.tsx), which tutorNav's own
  // sidebar "Dashboard" item already correctly links to. Found via a full
  // nav sweep, live-tested with a real TUTOR login.
  [UserRole.TUTOR]: "/tutor",
  [UserRole.STAFF]: "/manager/dashboard",
  [UserRole.HOD]: "/tutor",
  [UserRole.DEAN]: "/manager/dashboard",
  [UserRole.BURSARY]: "/admin/finance/fees",
  [UserRole.DIRECTOR]: "/director/dashboard",
  [UserRole.ADMIN]: "/manager/dashboard",
  [UserRole.SUPER_ADMIN]: "/admin/dashboard",
}

/**
 * Where to send a user immediately after signing in. Only STUDENT and
 * APPLICANT go through the admission flow — every other role lands on its
 * own dashboard via `roleDashboardPath`.
 */
export function resolvePostSignInPath(role: UserRole): string {
  if (role === UserRole.APPLICANT || role === UserRole.STUDENT) {
    return "/process-admission"
  }
  return roleDashboardPath[role]
}
