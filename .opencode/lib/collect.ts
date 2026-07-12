import { readFile, mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { chromium, type Browser } from "playwright"
import { validateTargetUrl } from "./url-safety"

const COLLECTOR = new URL("../skills/seo-page/collect-page-evidence.js", import.meta.url)
const CONCURRENCY = 5
const SETTLE_MS = 1500
const NAV_TIMEOUT_MS = 30_000

export type PageResult =
  | { index: number; url: string; status: number; title: string | null; dir: string }
  | { index: number; url: string; status: "failed"; error: string }

/**
 * Collects rendered evidence for many URLs at once.
 *
 * Every page gets its OWN browser context. The previous design drove a single shared
 * Playwright MCP tab from several agents at once, so one collector could navigate while
 * another was mid-evaluate and silently capture the wrong page's DOM. Evidence attributed
 * to the wrong URL is worse than no evidence, so isolation here is not an optimisation.
 */
export async function collectPages(targets: string[], evidenceDir: string): Promise<PageResult[]> {
  const source = await readFile(COLLECTOR, "utf8")
  const urls = await Promise.all(targets.map((target) => validateTargetUrl(target)))

  const browser = await chromium.launch()
  try {
    const results: PageResult[] = []
    for (let start = 0; start < urls.length; start += CONCURRENCY) {
      const batch = urls.slice(start, start + CONCURRENCY)
      results.push(
        ...(await Promise.all(
          batch.map((url, offset) =>
            collectOne(browser, source, url, start + offset, evidenceDir, urls.length),
          ),
        )),
      )
    }
    return results
  } finally {
    await browser.close()
  }
}

async function collectOne(
  browser: Browser,
  source: string,
  url: string,
  index: number,
  evidenceDir: string,
  total: number,
): Promise<PageResult> {
  // A single page keeps its evidence at the root; a site audit shards by index.
  const dir = total === 1 ? evidenceDir : join(evidenceDir, "site-pages", String(index))
  const context = await browser.newContext()
  const page = await context.newPage()

  const console_: string[] = []
  const network: string[] = []
  page.on("console", (message) => console_.push(`[${message.type()}] ${message.text()}`))
  page.on("pageerror", (error) => console_.push(`[pageerror] ${error.message}`))
  page.on("requestfailed", (request) =>
    network.push(`FAILED ${request.method()} ${request.url()} — ${request.failure()?.errorText}`),
  )
  page.on("response", (response) => {
    if (response.status() >= 400)
      network.push(`${response.status()} ${response.request().method()} ${response.url()}`)
  })

  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: NAV_TIMEOUT_MS })
    await page.waitForTimeout(SETTLE_MS)

    const evidence = await page.evaluate(`(${source})()`)
    const snapshot = await page.locator("body").ariaSnapshot()

    await mkdir(dir, { recursive: true })
    await Promise.all([
      writeFile(join(dir, "page-evidence.json"), JSON.stringify(evidence, null, 2)),
      writeFile(join(dir, "page-snapshot.md"), snapshot),
      writeFile(join(dir, "page-console.txt"), console_.join("\n") || "(no console output)"),
      writeFile(join(dir, "page-network.txt"), network.join("\n") || "(no failed requests)"),
    ])

    return {
      index,
      url,
      status: response?.status() ?? 0,
      title: (evidence as { title: string | null }).title,
      dir,
    }
  } catch (error) {
    return { index, url, status: "failed", error: error instanceof Error ? error.message : String(error) }
  } finally {
    await context.close()
  }
}
