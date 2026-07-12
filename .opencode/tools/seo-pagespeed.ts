import { tool } from "@opencode-ai/plugin"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fetchPagespeed } from "../lib/pagespeed"

export default tool({
  description:
    "Fetch and SAVE measured performance data to page-performance.json: Lighthouse lab metrics and CrUX field p75 (LCP, INP, CLS, TTFB) from PageSpeed Insights v5. The only sanctioned source for TECH-PERFORMANCE-MEASURED. Returns a short summary; the full data is on disk. Needs GOOGLE_API_KEY.",
  args: {
    url: tool.schema.string().describe("Absolute public HTTP(S) URL to measure"),
    evidenceDir: tool.schema.string().describe("The `evidence` path returned by seo-start-run"),
    strategy: tool.schema
      .enum(["mobile", "desktop"])
      .optional()
      .describe("Analysis strategy; defaults to mobile"),
  },
  async execute({ url, evidenceDir, strategy }) {
    const evidence = await fetchPagespeed(url, strategy ?? "mobile")
    await mkdir(evidenceDir, { recursive: true })
    await writeFile(join(evidenceDir, "page-performance.json"), JSON.stringify(evidence, null, 2))

    return JSON.stringify({
      saved: join(evidenceDir, "page-performance.json"),
      strategy: evidence.strategy,
      performanceScore: evidence.lab.performanceScore,
      lab: evidence.lab.metrics,
      // A null field section means the page has too little traffic for a CrUX record.
      // That is normal, and lab data must be labelled as lab.
      field: evidence.field ?? "none (no CrUX record for this URL or origin)",
    })
  },
})
