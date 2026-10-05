# Portal smoke suite

> **READ-ONLY. ALWAYS.** This suite only navigates, expands menus, opens tabs or dialogs
> and cancels them, signs in and signs out. It must **never** submit, save, pay, sync,
> approve, publish, delete or otherwise write data, so it is safe to point at any
> instance where you hold test accounts. Any change that adds a click on a
> submit/save/confirm button for a data form breaks this rule and must not be merged.

A browser smoke test for every role. Run it after any change or template sync to check
the whole portal in a few minutes.

## What it checks

| Area                                                                                                       | Checks                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public pages: `/`, `/about`, `/privacy`, `/terms`, `/auth/signin`, `/auth/signup`, `/auth/forgot-password` | Each page renders: no Next.js error overlay, no uncaught page error, no 404 page, no blank `<main>`, no spinner left after the timeout, no 5xx document response                                                                                                 |
| Per role: sign in                                                                                          | Signs in through the real form (`you@example.com or username` / `Enter your password` / submit). Asserts the session's stored role matches the credentials' role. Asserts it lands on that role's home route                                                     |
| Per role: sidebar                                                                                          | Expands every sidebar group and visits every link the sidebar shows, with the same checks as the public pages. It also lists `nav.config.ts` links that the sidebar hides for this role (permission-filtered) as a diagnostic                                    |
| Per role: isolation                                                                                        | Visits up to 4 other roles' home routes in areas this role should not reach, most privileged first (`/admin`, `/manager`, `/director`, `/tutor`, …). Each one must be **denied** ("Access Restricted" / "Login Required") or **redirected** away, never rendered |
| Per role: sign out                                                                                         | Signs out through the UI (the sidebar Logout button, or the admission NavBar's "Log out" button, then the confirmation dialog). Then checks that the role's home route no longer renders                                                                         |

Home routes, nav links and isolation targets are read from `src/config/nav.config.ts`
(`roleDashboardPath`, `resolvePostSignInPath`, `navConfig`), so a template sync that
moves a route is picked up automatically. The module is imported directly. If that
ever fails (for example, if it starts importing an `@/…` alias), the suite falls back
to parsing `roleDashboardPath` from the source and logs a warning. One thing can't be
derived from the nav config: which _areas_ a layout `<RoleGuard>` lets a role into
without a nav link (SUPER_ADMIN on `/director`, DEAN on `/tutor`). That list lives in
`EXTRA_ALLOWED_SEGMENTS` in `lib/nav.mjs`. Update it if those layouts change.

**Pass, warn and fail.** A page **fails** on any of these: a crash, an error overlay, an
uncaught page error, a 404, a blank main area, a stuck spinner, a 5xx document, a lost
session, or a broken isolation check. A page gets a **warning**, but the test still
passes, in two cases: the Next.js dev "issues" badge shows errors, or a sidebar link
opens an access-denied screen (this can be a real page-level permission gate). Console
errors and failed network requests are **recorded but never fail a test**, because
several screens deliberately fall back when a build-ahead endpoint returns 404 (see
CLAUDE.md §14). Review them in the report.

Roles run **one at a time**, with one browser context each, because the dev server has
crashed under parallel load. Don't add test concurrency.

## Setup

No extra dependency is needed: the suite uses the `playwright` devDependency and
Node's built-in `node:test` runner. If Chromium isn't installed yet, run
`npx playwright install chromium` once.

All configuration comes from environment variables. Copy `tests/smoke/.env.example` to
`tests/smoke/.env`, which is gitignored and loaded automatically if present (real
environment variables win). Or export the variables in your shell.

| Variable                                                                                                                                                                   |                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SMOKE_BASE_URL`                                                                                                                                                           | **Required, no default.** For example `http://localhost:3031`. Hosts that aren't local or private (localhost, 127.x, 10.x, 192.168.x, 172.16–31.x, `*.local`) are refused unless `SMOKE_ALLOW_REMOTE=1` |
| `SMOKE_<ROLE>_EMAIL` / `SMOKE_<ROLE>_PASSWORD`                                                                                                                             | For `SUPER_ADMIN`, `ADMIN`, `STAFF`, `DEAN`, `HOD`, `TUTOR`, `BURSARY`, `DIRECTOR`, `STUDENT`, `APPLICANT`. A role missing either value is **skipped** with a message naming the missing variables      |
| `SMOKE_ROLES`                                                                                                                                                              | Optional comma-separated subset, e.g. `DEAN,HOD`. Use `none` for public pages only                                                                                                                      |
| `SMOKE_HEADED=1`                                                                                                                                                           | Show the browser window                                                                                                                                                                                 |
| `SMOKE_NAV_TIMEOUT_MS` (120000), `SMOKE_SETTLE_MS` (2500), `SMOKE_SPINNER_TIMEOUT_MS` (20000), `SMOKE_ISOLATION_COUNT` (4), `SMOKE_MIN_MAIN_TEXT` (15), `SMOKE_OUTPUT_DIR` | Tuning options                                                                                                                                                                                          |

Never put real credentials in `.env.example`, the README or any committed file.

## Running

The target server must already be running. The suite never starts or stops it.

```bash
# Git Bash
SMOKE_BASE_URL=http://localhost:3031 npm run test:smoke          # every role that has credentials
SMOKE_BASE_URL=http://localhost:3031 SMOKE_ROLES=DEAN npm run test:smoke
SMOKE_BASE_URL=http://localhost:3031 npm run test:smoke:public   # public pages only
```

```powershell
# PowerShell (no VAR=x prefix syntax, so use $env: or the flags below)
$env:SMOKE_BASE_URL = "http://localhost:3031"
npm run test:smoke -- --roles=DEAN,HOD
npm run test:smoke -- --public
npm run test:smoke -- --headed
```

`--roles=`, `--public` and `--headed` are cross-platform shortcuts for `SMOKE_ROLES`,
`SMOKE_ROLES=none` and `SMOKE_HEADED=1`. The process exits with code 0 when every test
passes, 1 on any failure, and 2 if the server isn't reachable.

### Against the local QHUB template server

Start the template app the usual way, for example on port 3032. Then point the suite at
it with that instance's test accounts:

```bash
SMOKE_BASE_URL=http://localhost:3032 npm run test:smoke
```

The suite reads routes from **this** repo's `nav.config.ts`. That's the point after a
template sync: it flags any route the two disagree on.

## Reading the report

Each run writes to `tests/smoke/.output/<timestamp>/`, which is gitignored:

- `report.json` has these fields:
  - `summary`: pass, warn and fail counts.
  - `skippedRoles`: each skipped role and the reason.
  - `navConfigSource`: `import`, or `parsed` when the fallback was used.
  - `entries[]`: one record per page visited, with these fields:
    - `kind`: `public`, `sign-in`, `sidebar`, `isolation` or `sign-out`.
    - `role`, `target`, `finalUrl`, `httpStatus`, `heading`, `textLength`.
    - `status` (`pass`, `warn` or `fail`), plus `problems[]` (why it failed) and `warnings[]`.
    - `pageErrors[]`: uncaught exceptions, with stack.
    - `consoleErrors[]`: `console.error` messages.
    - `failedRequests[]`: HTTP 4xx/5xx responses and network failures, excluding `_next` and HMR noise.
    - `overlay`: the Next.js error-overlay text.
    - `navTrail`: the redirect chain.
    - `outcome`: for isolation checks, `denied`, `redirected to …` or `rendered`.
    - `screenshot`: the screenshot path.
- `screenshots/`: a viewport screenshot of every page that failed or warned, named
  `<n>-<status>-<role>-<path>.png`.

The console output ends with a summary line per failed or warned page, followed by the
report's full path. Start there, then open the matching `report.json` entry and its
screenshot.

## Files

- `run.mjs`: launcher used by the npm scripts. It handles flags, loads `.env` and runs
  `node --test` with `--experimental-transform-types`, which is needed to import
  `nav.config.ts`'s `enum`.
- `smoke.test.mjs`: the tests.
- `lib/config.mjs`: environment parsing, the base-URL safety check and the role list.
- `lib/nav.mjs`: reads home routes, nav links and isolation targets from `nav.config.ts`.
- `lib/browser.mjs`: page inspection, sign-in/sign-out, sidebar expansion and the report.

The suite is plain ESM JavaScript (`.mjs`), so it is outside the app's `tsconfig.json`
(which includes only `**/*.ts(x)`). It doesn't affect `npx tsc --noEmit` for the app.
