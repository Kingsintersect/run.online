/**
 * Launcher for the smoke suite (READ-ONLY — see README.md).
 *
 *   npm run test:smoke                       all roles that have credentials
 *   npm run test:smoke -- --roles=DEAN,HOD   just those roles
 *   npm run test:smoke -- --public           public pages only
 *   npm run test:smoke -- --headed           watch it in a real window
 *
 * Flags are a cross-platform alternative to the env vars (SMOKE_ROLES,
 * SMOKE_HEADED), which also work: `SMOKE_ROLES=DEAN npm run test:smoke`.
 * Env from tests/smoke/.env is loaded if that file exists; real env wins.
 */
import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const env = { ...process.env }

for (const arg of process.argv.slice(2)) {
  if (arg === "--public") env.SMOKE_ROLES = "none"
  else if (arg.startsWith("--roles="))
    env.SMOKE_ROLES = arg.slice("--roles=".length)
  else if (arg === "--headed") env.SMOKE_HEADED = "1"
  else {
    console.error(
      `Unknown option "${arg}". Use --roles=A,B, --public or --headed.`
    )
    process.exit(2)
  }
}

const envFile = path.join(here, ".env")
const nodeArgs = [
  // nav.config.ts is imported directly; it uses a TS `enum`, which needs transform (not just strip).
  "--experimental-transform-types",
  "--no-warnings",
  ...(fs.existsSync(envFile) ? [`--env-file=${envFile}`] : []),
  "--test",
  "--test-concurrency=1",
  "--test-reporter=spec",
  path.join(here, "smoke.test.mjs"),
]

const child = spawn(process.execPath, nodeArgs, { stdio: "inherit", env })
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 1)))
