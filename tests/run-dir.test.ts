import { expect, test } from "bun:test"
import { mkdtemp, mkdir, readdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { startRun } from "../.opencode/lib/run-dir"

test("clears a previous run's evidence before the next one starts", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "seo-run-"))
  const stale = join(cwd, "example.com-analysis", "evidence")
  await mkdir(stale, { recursive: true })
  await writeFile(join(stale, "page-evidence.json"), '{"finalUrl":"https://other-site.test/"}')

  const paths = await startRun("https://example.com/some/page", cwd)

  expect(paths.domain).toBe("example.com")
  expect(paths.evidence).toBe(stale)
  expect(paths.report).toBe(join(cwd, "example.com-analysis", "analysis.md"))
  // The other site's evidence must be gone, not merely overwritten file-by-file.
  expect(await readdir(stale)).toEqual([])
})

test("keeps a sibling domain's evidence intact", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "seo-run-"))
  const other = join(cwd, "wellysa.com-analysis", "evidence")
  await mkdir(other, { recursive: true })
  await writeFile(join(other, "page-evidence.json"), "{}")

  await startRun("https://titancode.pl/", cwd)

  expect(await readdir(other)).toEqual(["page-evidence.json"])
})

test("refuses a target that is not a public URL", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "seo-run-"))
  expect(startRun("http://169.254.169.254/", cwd)).rejects.toThrow(
    "Target resolves to a blocked network",
  )
})
