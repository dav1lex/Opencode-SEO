import { tool } from "@opencode-ai/plugin"
import { fetchPagespeed } from "../lib/pagespeed"

export default tool({
  description:
    "Fetch measured performance data from PageSpeed Insights v5: Lighthouse lab metrics and CrUX field p75 (LCP, INP, CLS, TTFB). The only sanctioned source for TECH-PERFORMANCE-MEASURED findings.",
  args: {
    url: tool.schema.string().describe("Absolute public HTTP(S) URL to measure"),
    strategy: tool.schema
      .enum(["mobile", "desktop"])
      .optional()
      .describe("Analysis strategy; defaults to mobile"),
  },
  async execute({ url, strategy }) {
    return JSON.stringify(await fetchPagespeed(url, strategy ?? "mobile"))
  },
})
