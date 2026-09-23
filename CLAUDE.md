# Claude Instructions – University Portal Frontend

> This file is Claude Code's persistent project memory. It is loaded automatically at the
> start of every session run from this repo (or a subdirectory of it). Keep it specific —
> vague instructions get followed loosely, specific ones get followed consistently.

---

## 1. Project Context

- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript (Strict Mode)
- **Architecture:** Single-tenant — one deployment per university instance. No multi-tenancy.
- **Backend:** External NestJS API. Never generate local `app/api` routes, `pages/api` routes,
  or server actions for database operations unless explicitly requested.

---

## 2. Stack

| Concern       | Library                                                    |
| ------------- | ---------------------------------------------------------- |
| Data Fetching | TanStack React Query v5                                    |
| UI State      | Zustand                                                    |
| Validation    | Zod + React Hook Form (`zodResolver`)                      |
| Styling       | Tailwind CSS + `cn()`                                      |
| Components    | ShadCN UI + Radix UI                                       |
| Animation     | Framer Motion (transitions/micro) · GSAP (scroll/timeline) |

---

## 3. Folder Structure

```
src/
├── lib/
│   ├── clients/
│   │   └── apiClient.ts          # Centralised HTTP client — all services import this
│   ├── permissions               # allPermissions[] registry + pickPermissions() helper
│   └── feature-flags             # UserRole → Permission[] map + roleDashboardPath map
│
├── types/
│   └── roles.ts                  # UserRole enum, Permission, UserProfile, RoleConfig
│
├── components/                   # Global reusable UI components
│   └── permission-gate.tsx       # <PermissionGate> — conditional rendering by permission
│
├── hooks/                        # Global cross-cutting hooks
│   ├── use-permissions.ts        # can(), canAll(), canAny(), canAccessModule()
│   └── use-role-guard.ts         # Route-level redirect if role not allowed
│
├── store/
│   └── app.store.ts              # Zustand: user session, activeRole
│
├── modules/
│   └── [domain]/                 # e.g. assessments, results, timetable, finance
│       ├── types/
│       │   └── index.ts          # Types inferred from Zod schemas (z.infer<>)
│       ├── schemas/
│       │   └── index.ts          # Zod schemas: filters, payloads, responses
│       ├── services/
│       │   └── [domain].service.ts  # API calls via apiClient only
│       ├── hooks/
│       │   ├── query-keys.ts     # Typed key factory
│       │   ├── use-[resource].ts
│       │   └── use-[resource]-mutations.ts
│       ├── store/
│       │   └── [domain]-ui.store.ts  # Zustand: domain-scoped UI state only
│       └── components/
│           └── *.tsx
│
└── app/
    ├── (root)/                   # Public or shared authenticated routes (no sidebar)
    └── (dashboard)/
        ├── student/
        ├── tutor/
        ├── hod/
        ├── dean/
        ├── staff/
        ├── bursary/
        ├── director/
        ├── manager/
        └── admin/
```

---

## Role-Based Route Ownership

- Each user role owns a specific dashboard route. Users may only access the dashboard route assigned to their role.

| User Role   | Route                   |
| ----------- | ----------------------- |
| SUPER_ADMIN | `/(dashboard)/admin`    |
| ADMIN       | `/(dashboard)/manager`  |
| DIRECTOR    | `/(dashboard)/director` |
| BURSARY     | `/(dashboard)/bursary`  |
| DEAN        | `/(dashboard)/dean`     |
| HOD         | `/(dashboard)/hod`      |
| STAFF       | `/(dashboard)/staff`    |
| TUTOR       | `/(dashboard)/tutor`    |
| STUDENT     | `/(dashboard)/student`  |
| GUEST       | `/(dashboard)/guest`    |

- SUPER_ADMIN must have access and permission to all administrative actions, features, configurations and performance. total control over the system. then other Roles can then have there unique duties and control

---

## 4. Architecture Rules

### Global vs Module scope

- **Global** (`/lib`, `/components`, `/hooks`, `/store`, `/types`) — only for logic reused
  across 2+ modules.
- **Module** (`/modules/[domain]/`) — all domain-specific logic lives here. Never leak
  module code into global directories.
- Route pages in `app/` are **thin shells only** — they import module components and
  compose them. No business logic, no direct API calls, no inline data fetching in pages.

### API calls

- All services must import and use `src/lib/clients/apiClient.ts`.
- Never construct raw `fetch` or `axios` calls inside components, hooks, or pages.
- Never hardcode API URLs — always use environment variables.
- Handle errors gracefully in services; never swallow them silently.

### React Query

- Every module has a `query-keys.ts` with a typed key factory.
- Never call `useQuery` or `useMutation` directly in page or layout components — always
  abstract into custom hooks.
- Invalidate queries by key factory, never by raw string.
- Zustand is **not** for server data. If it came from an API, it belongs in React Query cache.

### Zustand

Use only for:

- Global session state (`user`, `activeRole`) — in `app.store.ts`
- Cross-component UI state (sidebar open/close, modals, theme)
- Domain-scoped UI state (active filters, selected tabs) — in `modules/[domain]/store/`

### Validation

- Every form uses `zod` + `zodResolver` with React Hook Form.
- Every API payload is validated against a Zod schema before dispatch.
- Infer TypeScript types directly: `type Foo = z.infer<typeof FooSchema>`. Never duplicate
  type definitions.
- Module-specific schemas → `modules/[domain]/schemas/`. Global/shared schemas → `src/schemas/`.

---

## 5. RBAC & Permissions Protocol

**Corrected 2026-09-17** — this section previously described an aspirational architecture
(`src/lib/permissions.ts`'s `allPermissions[]`/`pickPermissions()`, `src/lib/role-permissions.ts`'s
`rolePermissionMap`, a `useRoleGuard` hook) that was never built — confirmed via a repo-wide search,
zero matches for any of it. What follows is the real, live system.

### Types — `src/types/roles.ts` and `src/config/nav.config.ts`

`UserRole` enum lives in `src/config/nav.config.ts` (also home to `navConfig`/`roleDashboardPath`
— every role's nav tree and dashboard home route). `Permission`/`UserProfile` types live in
`src/types/roles.ts`.

### Permissions have no local catalog — the backend is the single source of truth

There is no local permission registry or role→permission map to maintain. Every user's
`permissions: Permission[]` array comes entirely from the backend session (`/auth/login`/
`/auth/me`) and is stored as-is (`src/store/appStore.ts`) — never computed, reorganised, or
overridden client-side. Two static JSON files exist for reference/documentation only
(`src/lib/utils/permissions.json`, `src/lib/utils/Roles.Permissions.assignment.json`) — neither is
imported or read at runtime; keep them accurate for humans, but don't treat them as executable.
**Practical consequence:** if two roles' real backend sessions currently return the identical
permission set (this has happened — Dean vs Admin, until fixed 2026-09-17), there is no local
override to fix that with; a genuine distinction has to either come from the backend, or — as a
last resort, matching existing precedent (`HOD`/`Tutor` sharing a nav tree, `Staff`'s narrower
branch on the shared `/manager/dashboard` route) — a plain role check, clearly commented as to why
a permission check wasn't available.

### Route-level protection — `<RoleGuard>`

```tsx
// src/components/dashboard/RoleGuard.tsx
<RoleGuard
  role={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}
  permissions={["fees.verify"]}
  match="any"
>
  <ProtectedPage />
</RoleGuard>
```

A component, not a hook — wrap the page content in it. `role` is required; `permissions` (dot-string
format, `"resource.action"`) is optional and layers an additional check on top of the role check.
Shows a login prompt if unauthenticated, a permission-denied screen if `role`/`permissions` don't
match (or a custom `fallback`), otherwise renders `children`.

### Feature-level protection — `usePermissions` hook

```ts
const { can, canAll, canAny, canAccessModule } = usePermissions()

// Single check
if (can({ resource: 'assessments', action: 'manage' })) { ... }

// All must pass
if (canAll(
  { resource: 'assessments', action: 'view.all' },
  { resource: 'assessments', action: 'sync' }
)) { ... }

// Any must pass
if (canAny(
  { resource: 'assessments', action: 'view' },
  { resource: 'assessments', action: 'view.all' }
)) { ... }

// Module-level access
if (canAccessModule('finance')) { ... }
```

### Feature-level protection — `<PermissionGate>` component

```tsx
// Single permission
<PermissionGate require={{ resource: 'assessments', action: 'manage' }}>
  <EditButton />
</PermissionGate>

// Any of multiple — with fallback
<PermissionGate
  require={[
    { resource: 'assessments', action: 'view' },
    { resource: 'assessments', action: 'view.all' },
  ]}
  mode="any"
  fallback={<AccessDenied />}
>
  <AssessmentList />
</PermissionGate>
```

`PermissionGate` props: `require`, `mode: 'all' | 'any'` (default `'all'`), `fallback`,
`denyBehavior: 'inline' | 'screen' | 'modal'` (default `'inline'` — `'screen'` replaces the whole
page with a full-page denied screen, `'modal'` shows a blocking popup, use these two for guarding
an entire page rather than one element).

### Rule of thumb

- **`<RoleGuard>`** → broad role-based page protection (unauthenticated + role + optional
  permission, in one component).
- **`<PermissionGate>`** → conditional rendering of UI elements within a page.
- **`usePermissions`** → imperative checks inside hook or component logic.
- Prefer checking the permission over hard-coding a role check (`if (role === 'ADMIN')`) whenever
  a real permission distinction exists. But per the note above, permissions come from the backend
  only — if two roles' live sessions genuinely return the same permission set and they need to
  differ anyway, a clearly-commented role check (matching this codebase's existing precedent, e.g.
  `Staff`'s narrower dashboard branch) is the honest fallback, not a local permission catalog
  invented to paper over it.

---

## 6. Styling Rules

- Tailwind utility classes only. Never create a new global CSS file or CSS module unless
  explicitly requested.
- Always use `cn()` for conditional or merged class names.
- Every component must include `dark:` variants where applicable.
- Use ShadCN UI + Radix UI as the component foundation — extend, don't rewrite.
- Ensure ARIA attributes and keyboard navigation on all interactive elements.

---

## 7. Directive Rules

| Rule           | Detail                                                                    |
| -------------- | ------------------------------------------------------------------------- |
| `'use client'` | Required on any file using hooks, Zustand, Framer Motion, or browser APIs |
| `'use server'` | Only for explicitly requested server actions                              |
| No mixing      | A single file cannot export both server and client code                   |

---

## 8. Naming Conventions

| Artifact        | Convention                                |
| --------------- | ----------------------------------------- |
| Components      | `kebab-case.tsx`                          |
| Hooks           | `use-*.ts`                                |
| Services        | `[domain].service.ts`                     |
| Module stores   | `[domain]-ui.store.ts`                    |
| Global store    | `app.store.ts`                            |
| Query keys      | `query-keys.ts`                           |
| Schemas & types | `index.ts` inside their respective folder |
| Pages           | `page.tsx` (Next.js convention)           |
| Layouts         | `layout.tsx`                              |

---

## 9. Code Quality Rules

- No `any` or `unknown` — default to strongly typed generic interfaces.
- Keep components small, focused, and composable. One concern per component.
- Do not duplicate logic — reuse from global or module scope.
- Avoid unnecessary dependencies.
- Scope all changes to the requested feature or module. Do not refactor unrelated code
  unless asked.

---

## 10. Structural Conflict Protocol

If a requested change would:

- Place module-specific code in a global directory
- Duplicate logic that already exists in module or global scope
- Mix `'use client'` and `'use server'` incorrectly
- Skip Zod validation on a form or mutation payload
- Use Zustand to cache server/API data
- Hard-code a role check instead of using the permission system

→ **Stop, warn me, explain the conflict, and propose the correct modular alternative
before generating any code.**

---

## 11. Communication

- If a requested change violates the modular folder structure (e.g., putting a
  role-specific type in the global `/types` folder), warn me, explain the structural
  conflict, and provide the modular alternative.
- If a requested change violates the directive rules (e.g., using hooks in a file without
  `'use client'`), warn me, explain the conflict, and provide the correct directive usage.
- Explain architectural assumptions briefly when requirements are ambiguous.

---

## 12. Implementation & Quality Checks

- Prioritize **Reusability** and **Separation of Concerns (SoC)**. UI components should
  focus strictly on presentation, delegating business and fetching logic to custom hooks
  or services.
- Follow existing file naming patterns (e.g., `*.tsx` for components, `*.ts` for logic).
- Avoid `any` or `unknown`. Default to strongly typed generic interfaces.
- Keep changes scoped specifically to the requested feature or module without randomly
  refactoring unrelated global assets.
- Write readable, maintainable code.

---

## 13. The real backend (run/run.api)

- please stop implementing or doing anywork on the backend.
- only focus on the frontend api integration from bruno.
- leave the backend and focuse on the frontend dev.
- the backend has been completely built remotley.

---

## 14. Build ahead of the backend — never wait

- **Do not wait for the backend to build a capability before building its frontend.** If
  `sandbox/` already has a design for it, build the frontend against that design now. If no
  design exists yet, write one first (the established `README.md` / `SCHEMA_CHANGES.md` /
  `API_CONTRACTS.md` trio in a new `sandbox/<feature>/` folder — see existing folders for the
  pattern), then build the frontend against it. Either way, the frontend ships now, not after
  the backend catches up.
- **Every screen built ahead of the backend must have a working fallback**, active whenever
  the real endpoint doesn't exist yet (404) or a live probe hasn't confirmed it: derive the
  same data from whatever real endpoints already exist, or degrade to an honest empty/disabled
  state — never a broken page, a silent no-op, or a hardcoded stub pretending to be live data.
- **The fallback and the real path share one interface.** Build the hook/service layer so a
  component calls one thing (e.g. `useAdmissionStages()`) that internally prefers the live
  endpoint and falls back when it 404s — never a component that has to know which mode it's
  in. This is what "synchronise automatically" means: the day the backend ships the real
  endpoint, the frontend starts using it with no rewrite, because the interface never changed.
- **Flag every backend gap this produces**, the same way already established in this repo:
  add it to `sandbox/BACKEND_DEVIATIONS_2026-09-14.md` (or the current dated deviations file)
  under Part A if nothing exists yet, Part B if it exists but doesn't match the design — or a
  dedicated `<feature>/BACKEND_HANDOFF.md` for a large new capability. Never treat "the
  backend isn't ready" as a reason to skip or stub out frontend work; treat it as something to
  document for the backend team while the frontend ships anyway.
- This does not relax §13: still never implement or modify backend code. It only means the
  frontend's own build schedule never blocks on the backend's.
- **Zip a handoff only when multiple docs changed.** A zip must only ever contain the files
  actually touched in the current work session, never the whole `sandbox/` directory — and if
  only a single file was created or updated (e.g. one new entry in
  `BACKEND_DEVIATIONS_2026-09-14.md`), flagging it there is enough on its own; skip the zip
  entirely rather than bundling one file for handoff.
- **"No filter param to send" is not the same as "nothing to build."** When an endpoint has no
  scope param because it fetches one record by id (an invoice, a payment, one student's records)
  rather than filtering a list, don't stop at documenting the gap — check first whether the screen
  that would even call it exists at all. A missing filter is sometimes really a missing screen
  (found 2026-09-21: `useStudentInvoices()` had zero consumers anywhere in the app, and the admin
  invoice drawer had no payment-history section at all — the real fix was building the missing
  admin capability, not noting there was nothing to scope). Where the record has no scope id of its
  own to check, derive one via the same best-effort name-matching fallback already used elsewhere
  (e.g. matching a student's `program_name` against the programs list to find its major program),
  and use it to proactively hide the action for an out-of-scope record — a UI convenience only,
  never a substitute for real backend enforcement, exactly like `useMajorProgramScope().withinScope()`
  is documented to be.
- **Always explicitly flag a genuinely missing capability, not just a scoping gap on an existing
  one.** During any audit, if a screen, action, or endpoint simply doesn't exist yet — frontend or
  backend — say so plainly and propose a contract for it (same trio/format as any other build-ahead
  proposal) rather than folding it silently into "unscoped" or skipping it because there's nothing
  to scope. If no backend endpoint exists at all for something worth flagging, don't fake a
  client-side stand-in that would be dishonest or perform badly (e.g. N+1-fetching a list from a
  bunch of single-record endpoints) — document the proposed contract and stop there, per this
  section's own fallback rule.
