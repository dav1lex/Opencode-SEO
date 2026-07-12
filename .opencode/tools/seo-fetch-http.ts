import { tool } from "@opencode-ai/plugin"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fetchHttpEvidence } from "../lib/http"

/**
 * Writes its evidence and returns a summary.
 *
 * It used to return the whole HttpEvidence — including up to 200 KB of raw HTML — and leave
 * the caller to save it. The payload was truncated before the model ever saw it, so
 * page-http.json was never written and the detector silently lost its baseline. A tool that
 * produces a large artifact must persist it; only a summary belongs in a model's context.
 */
export default tool({
  description:
    "Fetch and SAVE HTTP-level page evidence to page-http.json: status, response headers (X-Robots-Tag, parsed canonical), redirect chain, and server-sent raw HTML. Also saves robots.txt. Returns a short summary — the full evidence is on disk for seo-detect and the specialists. Run before seo-detect.",
  args: {
    url: tool.schema.string().describe("Absolute public HTTP(S) URL to fetch"),
    evidenceDir: tool.schema.string().describe("The `evidence` path returned by seo-start-run"),
    subdir: tool.schema
      .string()
      .optional()
      .describe("Optional subdirectory under evidenceDir, e.g. `site-pages/3` for a site audit"),
  },
  async execute({ url, evidenceDir, subdir }) {
    const evidence = await fetchHttpEvidence(url)
    const dir = subdir ? join(evidenceDir, subdir) : evidenceDir
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, "page-http.json"), JSON.stringify(evidence, null, 2))

    // robots.txt belongs to the origin, so it is fetched once alongside the page and always
    // lands at the evidence root, never inside a per-page subdirectory.
    const origin = new URL(evidence.finalUrl).origin
    const robots = await fetch(`${origin}/robots.txt`)
      .then((response) => (response.ok ? response.text() : null))
      .catch(() => null)
    if (robots !== null) {
      await mkdir(evidenceDir, { recursive: true })
      await writeFile(join(evidenceDir, "robots.txt"), robots)
    }

    return JSON.stringify({
      saved: join(dir, "page-http.json"),
      robotsTxt: robots === null ? "not served (default allow)" : join(evidenceDir, "robots.txt"),
      status: evidence.status,
      finalUrl: evidence.finalUrl,
      redirectHops: evidence.redirectChain.length,
      xRobotsTag: evidence.indexing.xRobotsTag,
      canonicalFromHeader: evidence.indexing.canonicalFromHeader,
      rawTextLength: evidence.raw.textLength,
      shellDetected: evidence.raw.shellDetected,
    })
  },
})
