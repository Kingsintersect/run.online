/**
 * Browser helpers for the smoke suite.
 *
 * READ-ONLY: these helpers only navigate, expand the sidebar, fill the
 * sign-in form, and confirm the sign-out dialog. Never add a helper that
 * submits a data form, saves, pays, syncs, approves or deletes anything.
 */
import fs from "node:fs"
import path from "node:path"
import { timing } from "./config.mjs"

/* ------------------------------------------------------------------ */
/*  Report                                                             */
/* ------------------------------------------------------------------ */

export class Report {
  constructor(dir, baseUrl) {
    this.dir = dir
    this.baseUrl = baseUrl
    this.startedAt = new Date().toISOString()
    this.entries = []
    this.skippedRoles = []
    this.navMode = ""
    fs.mkdirSync(path.join(dir, "screenshots"), { recursive: true })
  }

  /** Starts a new page record; console/network events attach to it until the next one. */
  begin(fields) {
    const entry = {
      status: "pass",
      problems: [],
      warnings: [],
      pageErrors: [],
      consoleErrors: [],
      failedRequests: [],
      overlay: "",
      finalUrl: "",
      screenshot: "",
      ...fields,
      startedAt: new Date().toISOString(),
    }
    this.entries.push(entry)
    this.current = entry
    return entry
  }

  write() {
    const summary = { pass: 0, warn: 0, fail: 0 }
    for (const e of this.entries) summary[e.status]++
    const out = {
      baseUrl: this.baseUrl,
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      navConfigSource: this.navMode,
      summary,
      skippedRoles: this.skippedRoles,
      entries: this.entries,
    }
    fs.writeFileSync(
      path.join(this.dir, "report.json"),
      JSON.stringify(out, null, 2)
    )
    return out
  }
}

/** Attaches console/pageerror/network listeners that write into report.current. */
export function instrument(page, report) {
  const isNoise = (u) => /\/_next\/|webpack|hot-update|__nextjs|favicon/.test(u)
  page.on("console", (m) => {
    if (m.type() === "error" && report.current)
      report.current.consoleErrors.push(m.text().slice(0, 500))
  })
  page.on("pageerror", (e) => {
    if (report.current)
      report.current.pageErrors.push((e.stack || e.message).slice(0, 1500))
  })
  page.on("response", (r) => {
    const u = r.url()
    if (report.current && r.status() >= 400 && !isNoise(u)) {
      report.current.failedRequests.push(
        `${r.status()} ${r.request().method()} ${u}`
      )
    }
  })
  page.on("requestfailed", (r) => {
    const f = r.failure()?.errorText ?? ""
    // ERR_ABORTED is normal when a navigation cancels in-flight requests.
    if (report.current && !/ERR_ABORTED/.test(f) && !isNoise(r.url())) {
      report.current.failedRequests.push(
        `FAILED ${r.request().method()} ${r.url()} ${f}`
      )
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Page inspection                                                    */
/* ------------------------------------------------------------------ */

const DENIED_RE = /Access Restricted|Login Required/
const NOT_FOUND_RE = /This page could not be found|404\s*\|?\s*Not Found/i
const APP_CRASH_RE =
  /Application error: a (client|server)-side exception has occurred/i

export async function settle(page, ms = timing.settle) {
  await page
    .waitForLoadState("networkidle", { timeout: 30_000 })
    .catch(() => {})
  await page.waitForTimeout(ms)
}

/** Text of the Next.js dev error overlay (dialog) and error badge, if any. */
async function overlayState(page) {
  return page
    .evaluate(() => {
      let dialog = ""
      let badge = ""
      document.querySelectorAll("nextjs-portal").forEach((p) => {
        const root = p.shadowRoot
        if (!root) return
        /** @param {Element} el */
        const text = (el) => /** @type {HTMLElement} */ (el).innerText || ""
        root
          .querySelectorAll(
            "[data-nextjs-dialog], [data-nextjs-dialog-overlay]"
          )
          .forEach((el) => {
            dialog += " " + text(el)
          })
        root
          .querySelectorAll('[data-next-badge][data-error="true"]')
          .forEach((el) => {
            badge += " " + text(el)
          })
      })
      const clean = (s) => s.replace(/\s+/g, " ").trim()
      return { dialog: clean(dialog), badge: clean(badge) }
    })
    .catch(() => ({ dialog: "", badge: "" }))
}

async function mainText(page) {
  const main = page.locator("main").first()
  if (await main.count().catch(() => 0))
    return (await main.innerText().catch(() => "")) ?? ""
  return (
    (await page
      .locator("body")
      .innerText()
      .catch(() => "")) ?? ""
  )
}

/** Waits for spinners in <main> to go away; returns how many remain after the timeout. */
async function waitForSpinners(page) {
  const spinners = page.locator("main .animate-spin")
  const deadline = Date.now() + timing.spinnerTimeout
  let n = await spinners.count().catch(() => 0)
  while (n > 0 && Date.now() < deadline) {
    await page.waitForTimeout(500)
    n = await spinners.count().catch(() => 0)
  }
  return n
}

/**
 * Navigates to `target` and inspects the result. Fills entry.problems (fail)
 * and entry.warnings (warn). `expectDenied` flips the check for role isolation:
 * the page must be denied or redirected away, never rendered.
 */
export async function visit(
  page,
  report,
  baseUrl,
  target,
  { expectDenied = false } = {}
) {
  const entry = report.current
  entry.target = target
  const trail = []
  const onNav = (f) => {
    if (f === page.mainFrame()) trail.push(new URL(f.url()).pathname)
  }
  page.on("framenavigated", onNav)
  try {
    const res = await page.goto(baseUrl + target, {
      waitUntil: "domcontentloaded",
      timeout: timing.navTimeout,
    })
    entry.httpStatus = res?.status() ?? null
    if (!expectDenied && entry.httpStatus >= 500)
      entry.problems.push(`document returned HTTP ${entry.httpStatus}`)
  } catch (err) {
    entry.problems.push(`navigation failed: ${err.message.split("\n")[0]}`)
  }
  await settle(page)
  page.off("framenavigated", onNav)
  if (trail.length > 1) entry.navTrail = trail
  await inspect(page, entry, target, { expectDenied })
  finalize(entry)
  return entry
}

export async function inspect(
  page,
  entry,
  target,
  { expectDenied = false } = {}
) {
  const finalUrl = page.url()
  entry.finalUrl = finalUrl
  const finalPath = new URL(finalUrl).pathname
  const targetPath = target.split(/[?#]/)[0]

  const overlay = await overlayState(page)
  if (overlay.dialog) {
    entry.overlay = overlay.dialog.slice(0, 2000)
    entry.problems.push(
      `Next.js error overlay: ${overlay.dialog.slice(0, 200)}`
    )
  } else if (overlay.badge) {
    entry.warnings.push(
      `Next.js dev badge reports issues: ${overlay.badge.slice(0, 120)}`
    )
  }
  if (entry.pageErrors.length) {
    entry.problems.push(
      `${entry.pageErrors.length} uncaught page error(s): ${entry.pageErrors[0].split("\n")[0]}`
    )
  }

  const text = await mainText(page)
  const body =
    (await page
      .locator("body")
      .innerText()
      .catch(() => "")) ?? ""
  if (APP_CRASH_RE.test(body))
    entry.problems.push("Next.js application-error screen rendered")
  // allInnerTexts() doesn't wait for a match (innerText() would block 30s on a page without a heading).
  const headings = await page
    .locator("main h1, main h2, h1")
    .allInnerTexts()
    .catch(() => [])
  entry.heading = (headings[0] ?? "").replace(/\s+/g, " ").slice(0, 120)
  entry.textLength = text.trim().length

  if (expectDenied) {
    const leftArea =
      finalPath !== targetPath && !finalPath.startsWith(targetPath + "/")
    if (DENIED_RE.test(body)) entry.outcome = "denied"
    else if (leftArea) entry.outcome = `redirected to ${finalPath}`
    else {
      entry.outcome = "rendered"
      entry.problems.push(
        `role isolation broken: ${targetPath} rendered for this role (heading: "${entry.heading}")`
      )
    }
    return
  }

  if (/^\/auth\/signin/.test(finalPath) && !/^\/auth\//.test(targetPath)) {
    entry.problems.push(`bounced to sign-in (session lost?) from ${targetPath}`)
  }
  if (NOT_FOUND_RE.test(body) && entry.textLength < 400)
    entry.problems.push("404 page rendered")
  if (entry.textLength < timing.minMainText) {
    entry.problems.push(`blank main area (${entry.textLength} visible chars)`)
  }
  if (DENIED_RE.test(body)) {
    // A link the sidebar shows but the page denies is suspicious, but can be a
    // legitimate page-level permission gate — reported, not failed.
    entry.warnings.push("page shows an access-denied / login-required screen")
  }
  const stuck = await waitForSpinners(page)
  if (stuck > 0) {
    entry.problems.push(
      `${stuck} spinner(s) still in <main> after ${timing.spinnerTimeout}ms`
    )
  }
}

export function finalize(entry) {
  entry.status = entry.problems.length
    ? "fail"
    : entry.warnings.length
      ? "warn"
      : "pass"
  entry.finishedAt = new Date().toISOString()
  return entry
}

export async function screenshotIfNeeded(page, report, entry, force = false) {
  if (entry.status === "pass" && !force) return
  const name = `${String(report.entries.indexOf(entry) + 1).padStart(3, "0")}-${entry.status}-${entry.role ?? "public"}-${(entry.target ?? entry.name ?? "page").replace(/[^a-z0-9]+/gi, "_").slice(0, 80)}.png`
  const file = path.join(report.dir, "screenshots", name)
  await page.screenshot({ path: file, fullPage: false }).catch(() => {})
  entry.screenshot = path.relative(report.dir, file)
}

/* ------------------------------------------------------------------ */
/*  Auth flows (read-only apart from the session itself)              */
/* ------------------------------------------------------------------ */

/** Signs in through the real form. Retries because a cold dev server can drop the first attempt. */
export async function signIn(page, baseUrl, email, password, attempts = 3) {
  let lastError = ""
  for (let attempt = 1; attempt <= attempts; attempt++) {
    await page
      .goto(baseUrl + "/auth/signin", {
        waitUntil: "domcontentloaded",
        timeout: timing.navTimeout,
      })
      .catch(() => {})
    await settle(page, 1_500 * attempt)
    try {
      await page
        .getByPlaceholder("you@example.com or username")
        .fill(email, { timeout: 30_000 })
      await page.getByPlaceholder("Enter your password").fill(password)
      await page.locator("form button[type=submit]").first().click()
      await page.waitForURL((u) => !u.pathname.startsWith("/auth"), {
        timeout: timing.navTimeout,
      })
      return { ok: true, attempts: attempt }
    } catch (err) {
      const visible = (
        (await page
          .locator("body")
          .innerText()
          .catch(() => "")) ?? ""
      ).replace(/\s+/g, " ")
      const alert = visible.match(
        /(invalid|incorrect|wrong|failed|error)[^.]{0,120}/i
      )?.[0]
      lastError = alert ? `form says: "${alert}"` : err.message.split("\n")[0]
    }
  }
  return { ok: false, error: lastError }
}

/** The role the app stored for the signed-in user (zustand persist key). */
export async function sessionRole(page) {
  return page
    .evaluate(() => {
      try {
        const raw = localStorage.getItem("run-portal-app-store")
        return raw ? (JSON.parse(raw)?.state?.user?.role ?? null) : null
      } catch {
        return null
      }
    })
    .catch(() => null)
}

/**
 * Expands every collapsible group in the dashboard sidebar and returns its
 * links. Clicking group toggles is read-only (it only opens/closes menus).
 * Returns null when the page has no dashboard sidebar (e.g. APPLICANT's
 * admission flow).
 */
export async function readSidebar(page) {
  const area = page.locator("aside div.overflow-y-auto").first()
  if (!(await area.count().catch(() => 0))) return null
  for (let pass = 0; pass < 3; pass++) {
    const buttons = area.locator("button")
    const n = await buttons.count()
    for (let i = 0; i < n; i++) {
      const b = buttons.nth(i)
      const before = await area.locator("a").count()
      await b.click({ timeout: 5_000 }).catch(() => {})
      await page.waitForTimeout(250)
      // A click that hid links collapsed an already-open group — reopen it.
      if ((await area.locator("a").count()) < before) {
        await b.click({ timeout: 5_000 }).catch(() => {})
        await page.waitForTimeout(250)
      }
    }
  }
  const links = await area
    .locator("a[href]")
    .evaluateAll((as) =>
      as.map((a) => ({
        href: a.getAttribute("href"),
        text: (a.innerText || "").replace(/\s+/g, " ").trim(),
      }))
    )
  const seen = new Set()
  return links.filter(
    (l) => l.href?.startsWith("/") && !seen.has(l.href) && seen.add(l.href)
  )
}

/**
 * Signs out through the UI: the sidebar's Logout button, or the admission
 * NavBar's "Log out" button, then the "Log out" confirmation in the dialog.
 */
export async function signOut(page) {
  const trigger = page.locator(
    'aside button[title="Logout"], header button[aria-label="Log out"], nav button[aria-label="Log out"], button[aria-label="Log out"]'
  )
  const visible = trigger.locator("visible=true").first()
  await visible.click({ timeout: 15_000 })
  const dialog = page
    .getByRole("alertdialog")
    .or(page.getByRole("dialog"))
    .first()
  await dialog.waitFor({ state: "visible", timeout: 15_000 })
  await dialog
    .getByRole("button", { name: /^Log out$/ })
    .click({ timeout: 15_000 })
  await page.waitForURL(
    (u) => u.pathname.startsWith("/auth") || u.pathname === "/",
    { timeout: 60_000 }
  )
}
