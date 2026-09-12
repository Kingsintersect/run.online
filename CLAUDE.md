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

### Types — `src/types/roles.ts`

Defines `UserRole` enum, `Permission` interface, `UserProfile`, and `RoleConfig`. This is
the single source of truth for role and permission types.

### Permission Registry — `src/lib/permissions.ts`

- `allPermissions[]` is the canonical flat list of every permission in the system.
- Permissions grow over time as new modules are added — always append, never reorganise
  existing IDs.
- Each permission follows the shape: `{ id, resource, action, module, description, created_at }`.
- `pickPermissions(...ids)` is the only way to assign permissions to roles.
- Never inline permission arrays anywhere else in the codebase.

### Role → Permission Map — `src/lib/role-permissions.ts`

- `rolePermissionMap` maps every `UserRole` to its `Permission[]` using `pickPermissions()`.
- `roleDashboardPath` maps every `UserRole` to its home route.
- When a new permission is added to `allPermissions`, assign it to the appropriate roles here.

### Permission IDs are stable

Once a permission is assigned an ID it never changes. New permissions always get new
incremental IDs appended to the list.

### Route-level protection — `useRoleGuard`

```ts
// Redirects to the user's own dashboard if their role is not in allowedRoles
useRoleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN])
```

Use at the top of protected page components.

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

`PermissionGate` props: `require`, `mode: 'all' | 'any'` (default `'all'`), `fallback`.

### Rule of thumb

- **Route guard** (`useRoleGuard`) → broad role-based redirect at page level.
- **`<PermissionGate>`** → conditional rendering of UI elements within a page.
- **`usePermissions`** → imperative checks inside hook or component logic.
- Never hard-code role checks like `if (role === 'ADMIN')` for UI access — always check
  the permission, not the role.

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

## 13. The real backend (qhub-php/qhub_backend_api)

- please stop implementing or doing anywork on the backend.
- only focus on the frontend api integration from bruno.
- leave the backend and focuse on the frontend dev.
- the backend has been completely built remotley.
