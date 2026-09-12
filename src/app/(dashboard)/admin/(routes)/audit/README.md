# 🛡️ UNIZIK Portal — Audit Module

A production-grade audit logging UI built with **Next.js 15**, **TypeScript**, **shadcn/ui**, **Recharts**, **Framer Motion**, **GSAP**, **Zustand**, and **TanStack Query**.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx                         # Root layout + QueryProvider
│   ├── globals.css                        # UNIZIK theme variables (OKLCH)
│   └── (admin)/
│       ├── layout.tsx                     # Admin sidebar + topbar shell
│       └── audit/
│           ├── layout.tsx                 # Audit tab navigation
│           ├── page.tsx                   → /admin/audit          (Dashboard)
│           ├── logs/
│           │   └── page.tsx               → /admin/audit/logs     (All Logs)
│           ├── user/[userId]/
│           │   └── page.tsx               → /admin/audit/user/1   (User Trail)
│           └── entity/[entityType]/[entityId]/
│               └── page.tsx               → /admin/audit/entity/Grade/42
│
├── types/
│   └── audit.types.ts                     # All TypeScript interfaces & types
│
├── lib/
│   ├── utils.ts                           # cn() helper
│   ├── api/
│   │   └── audit.api.ts                   # Live API calls (commented out by default)
│   └── utils/
│       ├── date.utils.ts                  # formatDateTime, formatRelativeTime
│       └── export.utils.ts                # CSV / Excel (xlsx) / PDF (jsPDF) export
│
├── hooks/
│   ├── useAudit.ts                        # TanStack Query hooks for all audit endpoints
│   ├── useAuditFilters.ts                 # Derived filter utilities hook
│   └── useAuditExport.ts                  # Bulk-export hook wired to Zustand selection
│
├── stores/
│   └── audit.store.ts                     # Zustand store (filters, selection, UI state)
│
├── providers/
│   └── QueryProvider.tsx                  # TanStack QueryClient setup
│
├── components/
│   └── ui/                                # shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       └── index.tsx   (Label, Badge, Checkbox, Separator, Select, Tabs)
│
└── modules/
    └── audit/
        ├── index.ts                       # Barrel export for entire module
        ├── AuditDashboard.tsx             # /admin/audit  — Overview + Charts + Table
        ├── AuditLogsView.tsx              # /admin/audit/logs — Full searchable log table
        ├── AuditUserView.tsx              # /admin/audit/user/[id] — User timeline
        ├── AuditEntityView.tsx            # /admin/audit/entity/[type]/[id]
        └── components/
            ├── ActionBadge.tsx            # Coloured badge + dot for each AuditAction
            ├── AuditCharts.tsx            # Stat cards (GSAP counter) + Recharts charts
            ├── AuditTable.tsx             # Paginated, selectable, searchable table
            ├── AuditTimeline.tsx          # GSAP ScrollTrigger timeline for entity/user trails
            ├── AuditGroupedView.tsx       # Collapsible groups by year / semester / entity
            ├── AuditFilters.tsx           # Slide-in filter panel (Framer Motion)
            ├── AuditSearchBar.tsx         # Search input with "/" shortcut
            ├── AuditActionQuickFilter.tsx # Pill-based quick action filter
            ├── AuditDetailModal.tsx       # Full log detail modal (old/new diff)
            └── ExportMenu.tsx             # CSV / Excel / PDF export dropdown
```

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env.local

# 3. Run dev server
npm run dev
```

Open [http://localhost:3000/admin/audit](http://localhost:3000/admin/audit)

---

## 🔌 Live API

This module is wired to the real backend — every hook in `useAudit.ts` calls
`auditApi` (`src/app/(dashboard)/admin/(routes)/audit/services/audit.api.ts`)
directly, matching the `bruno/audit/*.bru` collection
(`/audit/logs`, `/audit/logs/user/:userId`, `/audit/logs/entity/:type/:id`,
`/audit/stats`). There is no dummy-data fallback left in this module as of
2026-09-01 — `audit.dummy.ts` was deleted and the dead imports/commented
mock branches were removed from every hook.

Set your backend URL:

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.unizik.edu.ng
```

---

## 📊 Features

| Feature                           | Implementation                               |
| --------------------------------- | -------------------------------------------- |
| Stat cards with animated counters | GSAP `textContent` tween                     |
| Area + Pie + Bar charts           | Recharts `ResponsiveContainer`               |
| Slide-in filter panel             | Framer Motion `x: "100%"` spring             |
| Table row reveal                  | Framer Motion `stagger`                      |
| Timeline scroll animation         | GSAP `ScrollTrigger`                         |
| Quick action pill filters         | Framer Motion `layoutId`                     |
| Log detail modal                  | Framer Motion scale + spring                 |
| CSV export                        | Native `Blob`                                |
| Excel export                      | `xlsx` (dynamic import)                      |
| PDF export                        | `jsPDF` + `jspdf-autotable` (dynamic import) |
| Bulk selection export             | Zustand `selectedIds` set                    |
| Grouped view                      | `academicYear` / `semester` / `entityType`   |
| Pagination                        | Zustand `page` + TanStack `placeholderData`  |
| Global search shortcut            | `"/"` key listener                           |
| Zustand devtools                  | Available in development                     |
| React Query devtools              | Available in development                     |

---

## 🗺️ Pages & Routes

| Route                             | Component         | Description                                                     |
| --------------------------------- | ----------------- | --------------------------------------------------------------- |
| `/admin/audit`                    | `AuditDashboard`  | Stat cards, charts, recent logs table + grouped view            |
| `/admin/audit/logs`               | `AuditLogsView`   | Full log table with search, quick filters, filter panel, export |
| `/admin/audit/user/[userId]`      | `AuditUserView`   | Animated timeline for a specific user                           |
| `/admin/audit/entity/[type]/[id]` | `AuditEntityView` | Change history for a specific entity (diff view)                |

---

## 🎨 Theme

All colours use the project's existing OKLCH CSS variables (`--unizik-blue`,
`--unizik-orange`, `--primary-*`, etc.) defined in `globals.css` — no Tailwind
config file needed with Tailwind v4.

---

## 📦 Key Dependencies

```
next 15, react 19
@tanstack/react-query 5
zustand 5
framer-motion 12
gsap 3
recharts 2
xlsx, jspdf, jspdf-autotable   ← export (dynamic imports, graceful fallback)
shadcn/ui components (radix-ui primitives)
```

---

## 🔒 Auth Notes

The live API helper (`src/lib/api/audit.api.ts`) sends `credentials: "include"`
so session cookies are forwarded automatically. All audit endpoints are
**Admin-only** — add your middleware guard at `src/middleware.ts`.
