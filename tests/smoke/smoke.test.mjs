/**
 * Portal smoke suite — public pages + every configured role.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ STRICTLY READ-ONLY. This suite navigates, expands menus, opens and   │
 * │ cancels dialogs, signs in and signs out. It must NEVER submit, save, │
 * │ pay, sync, approve, delete or otherwise write data. Do not add a     │
 * │ test here that clicks a submit/save/confirm button on a data form.   │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Runner: Node's built-in node:test + the `playwright` library (already a
 * devDependency) — no @playwright/test needed. Run via `npm run test:smoke`;
 * see tests/smoke/README.md. Roles run one after another, one browser
 * context at a time, because the dev server falls over under parallel load.
 */
import assert from "node:assert/strict"
import path from "node:path"
import { after, before, describe, test } from "node:test"
import { chromium } from "playwright"
import {
  PUBLIC_PAGES,
  REPO_ROOT,
  headed,
  outputDir,
  resolveBaseUrl,
  resolveRoles,
  timing,
} from "./lib/config.mjs"
import { loadNav } from "./lib/nav.mjs"
import {
  Report,
  finalize,
  inspect,
  instrument,
  readSidebar,
  screenshotIfNeeded,
  sessionRole,
  settle,
  signIn,
  signOut,
  visit,
} from "./lib/browser.mjs"

// Fail fast, before any browser starts, on a missing/unsafe base URL or a bad SMOKE_ROLES.
const BASE_URL = resolveBaseUrl()
const ROLES = resolveRoles()

// Reachability check, once, before any test is registered — a clearer error
// than every page timing out. (A cold dev server compiles "/" on this hit.)
try {
  const res = await fetch(BASE_URL + "/", {
    signal: AbortSignal.timeout(timing.navTimeout),
  })
  await res.arrayBuffer()
} catch (err) {
  console.error(
    `[smoke] ${BASE_URL} is not reachable (${err.cause?.code ?? err.message}). Is the server running?`
  )
  process.exit(2)
}
const nav = await loadNav()
const report = new Report(outputDir(), BASE_URL)
report.navMode = nav.mode

/** @type {import("playwright").Browser} */
let browser

async function newPage() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  instrument(page, report)
  return { context, page }
}

/** Fails the current node:test test with the entry's problems, after screenshotting. */
async function settleEntry(page, entry) {
  finalize(entry)
  await screenshotIfNeeded(page, report, entry)
  report.write()
  if (entry.problems.length)
    assert.fail(
      `${entry.target ?? entry.name}:\n  - ${entry.problems.join("\n  - ")}`
    )
}

before(async () => {
  console.log(`[smoke] base URL: ${BASE_URL}`)
  console.log(`[smoke] nav.config.ts source: ${nav.mode}`)
  const rel = path.relative(REPO_ROOT, report.dir)
  console.log(
    `[smoke] report: ${path.join(rel.startsWith("..") ? report.dir : rel, "report.json")}`
  )
  for (const r of ROLES.filter((r) => r.skip)) {
    console.log(`[smoke] SKIP ${r.role}: ${r.skip}`)
    report.skippedRoles.push({ role: r.role, reason: r.skip })
  }
  browser = await chromium.launch({ headless: !headed })
})

after(async () => {
  await browser?.close()
  const out = report.write()
  const { pass, warn, fail } = out.summary
  console.log(
    `\n[smoke] pages: ${pass} pass, ${warn} warn, ${fail} fail; roles skipped: ${out.skippedRoles.length}`
  )
  for (const e of report.entries.filter((e) => e.status !== "pass")) {
    console.log(
      `[smoke] ${e.status.toUpperCase()} ${e.role ?? "public"} ${e.target ?? e.name}: ${[...e.problems, ...e.warnings].join(" | ")}`
    )
  }
  console.log(`[smoke] full report: ${path.join(report.dir, "report.json")}`)
})

/* ------------------------------------------------------------------ */
/*  Public pages                                                       */
/* ------------------------------------------------------------------ */

describe("public pages", () => {
  let ctx
  before(async () => {
    ctx = await newPage()
  })
  after(async () => {
    await ctx?.context.close()
  })

  for (const target of PUBLIC_PAGES) {
    test(`renders ${target}`, async () => {
      const entry = report.begin({ kind: "public", name: target })
      await visit(ctx.page, report, BASE_URL, target)
      await settleEntry(ctx.page, entry)
    })
  }
})

/* ------------------------------------------------------------------ */
/*  Roles — sequential, one browser context per role                  */
/* ------------------------------------------------------------------ */

for (const cfg of ROLES) {
  const { role } = cfg
  describe(`role ${role}`, { skip: cfg.skip }, () => {
    let ctx
    let signedIn = false
    let sidebar = []

    before(async () => {
      ctx = await newPage()
    })
    after(async () => {
      await ctx?.context.close()
    })

    test("signs in through the real form and lands on its home route", async () => {
      const entry = report.begin({ kind: "sign-in", role, name: "sign in" })
      const result = await signIn(ctx.page, BASE_URL, cfg.email, cfg.password)
      if (!result.ok) {
        entry.problems.push(`sign-in failed: ${result.error}`)
        return settleEntry(ctx.page, entry)
      }
      signedIn = true
      await settle(ctx.page)
      const actualRole = await sessionRole(ctx.page)
      entry.sessionRole = actualRole
      if (actualRole && actualRole !== role) {
        entry.problems.push(
          `credentials for ${role} signed in as ${actualRole} — check SMOKE_${role}_EMAIL`
        )
      }
      const homes = nav.homeCandidates(role)
      entry.target = homes[0]
      await inspect(ctx.page, entry, homes[0])
      const landed = new URL(ctx.page.url()).pathname
      entry.landedOn = landed
      if (!homes.includes(landed)) {
        entry.problems.push(
          `landed on ${landed}, expected one of ${homes.join(", ")}`
        )
      }
      await settleEntry(ctx.page, entry)
    })

    test("every sidebar link renders", async (t) => {
      if (!signedIn) return t.skip("not signed in")
      const found = await readSidebar(ctx.page)
      if (found === null) {
        // No dashboard sidebar on this role's home (APPLICANT's admission flow):
        // fall back to the nav tree so the role's own pages are still visited.
        sidebar = nav
          .navHrefs(role)
          .map((href) => ({ href, text: "(nav.config)" }))
        t.diagnostic(
          `no sidebar on ${ctx.page.url()}; using ${sidebar.length} href(s) from nav.config.ts`
        )
      } else {
        sidebar = found
      }
      assert.ok(sidebar.length > 0, `${role}: sidebar has no links`)
      const configured = new Set(nav.navHrefs(role))
      const shown = new Set(sidebar.map((l) => l.href))
      const hidden = [...configured].filter((h) => !shown.has(h))
      if (hidden.length)
        t.diagnostic(
          `${hidden.length} nav.config href(s) hidden for ${role} (permission-filtered): ${hidden.join(", ")}`
        )

      for (const link of sidebar) {
        await t.test(`${link.href} (${link.text})`, async () => {
          const entry = report.begin({ kind: "sidebar", role, name: link.text })
          await visit(ctx.page, report, BASE_URL, link.href)
          await settleEntry(ctx.page, entry)
        })
      }
    })

    test("other roles' home routes are denied or redirected", async (t) => {
      if (!signedIn) return t.skip("not signed in")
      const targets = nav.isolationTargets(role, timing.isolationCount)
      if (!targets.length)
        return t.skip("no other-role areas outside this role's allow-list")
      for (const target of targets) {
        await t.test(`${target.path} (${target.role} home)`, async () => {
          const entry = report.begin({
            kind: "isolation",
            role,
            name: `${target.role} home`,
            ownerRole: target.role,
          })
          await visit(ctx.page, report, BASE_URL, target.path, {
            expectDenied: true,
          })
          await settleEntry(ctx.page, entry)
        })
      }
    })

    test("signs out through the UI", async (t) => {
      if (!signedIn) return t.skip("not signed in")
      const entry = report.begin({ kind: "sign-out", role, name: "sign out" })
      const home = nav.homeCandidates(role)[0]
      // Start from the role's own home so the sidebar/NavBar logout button is there.
      await ctx.page
        .goto(BASE_URL + home, {
          waitUntil: "domcontentloaded",
          timeout: timing.navTimeout,
        })
        .catch(() => {})
      await settle(ctx.page)
      try {
        await signOut(ctx.page)
      } catch (err) {
        entry.problems.push(`sign-out failed: ${err.message.split("\n")[0]}`)
        return settleEntry(ctx.page, entry)
      }
      entry.finalUrl = ctx.page.url()
      // After sign-out the home route must no longer render for this browser.
      await visit(ctx.page, report, BASE_URL, home, { expectDenied: true })
      await settleEntry(ctx.page, entry)
    })
  })
}
