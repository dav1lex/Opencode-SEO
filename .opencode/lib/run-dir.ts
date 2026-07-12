import { mkdir, rm } from "node:fs/promises"
import { resolve, sep } from "node:path"
import { validateTargetUrl } from "./url-safety"

export type RunPaths = {
  domain: string
  root: string
  evidence: string
  report: string
}

/**
 * Resolves the per-domain run directory and clears any evidence left by a previous
 * run. Clearing happens at the START of a run, not the end: a run that crashes or is
 * interrupted would otherwise leave one site's evidence behind for the next site's
 * audit to read, and a finding sourced from the wrong site is worse than no finding.
 */
export async function startRun(target: string, cwd = process.cwd()): Promise<RunPaths> {
  const url = await validateTargetUrl(target)
  const domain = new URL(url).hostname

  // The hostname is already normalized by the SSRF guard, but this path is about to be
  // handed to a recursive delete, so it is re-checked rather than trusted.
  if (!/^[a-z0-9.-]+$/i.test(domain) || domain.includes(".."))
    throw new Error(`Refusing to build a run directory from hostname: ${domain}`)

  const base = resolve(cwd)
  const root = resolve(base, `${domain}-analysis`)
  if (!root.startsWith(base + sep)) throw new Error("Run directory escapes the working directory")

  const evidence = resolve(root, "evidence")
  await rm(evidence, { recursive: true, force: true })
  await mkdir(evidence, { recursive: true })

  return { domain, root, evidence, report: resolve(root, "analysis.md") }
}
