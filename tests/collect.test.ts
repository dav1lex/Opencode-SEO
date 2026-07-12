import { expect, test } from "bun:test"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { collectPages } from "../.opencode/lib/collect"

// Renders real pages in a real browser. Slower than the rest of the suite, and the point:
// the shared-tab race it guards against only ever appeared under genuine concurrency.
const LIVE = ["https://example.com/", "https://example.net/", "https://example.org/"]

test(
  "collects pages concurrently without ever attributing evidence to the wrong URL",
  async () => {
    const dir = join(await mkdtemp(join(tmpdir(), "seo-collect-")), "evidence")
    const results = await collectPages(LIVE, dir)

    expect(results).toHaveLength(3)

    for (const result of results) {
      if (result.status === "failed") throw new Error(`${result.url} failed: ${result.error}`)

      const evidence = JSON.parse(await readFile(join(result.dir, "page-evidence.json"), "utf8"))
      // The whole point: page N's folder holds page N's DOM, not a neighbour's.
      expect(evidence.finalUrl).toBe(result.url)
      expect(result.dir).toContain(join("site-pages", String(result.index)))
    }
  },
  60_000,
)

test("refuses a private target before opening a browser", async () => {
  const dir = await mkdtemp(join(tmpdir(), "seo-collect-"))
  expect(collectPages(["http://127.0.0.1/"], dir)).rejects.toThrow(
    "Target resolves to a blocked network",
  )
})
