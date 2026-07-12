import { tool } from "@opencode-ai/plugin"
import { collectPages } from "../lib/collect"

export default tool({
  description:
    "Collect rendered-page evidence for one or many URLs in a single pass. Each page renders in its own isolated browser context, so pages are collected genuinely in parallel and evidence can never be attributed to the wrong URL. Writes page-evidence.json, page-snapshot.md, page-console.txt and page-network.txt per page. Use this instead of driving the browser by hand.",
  args: {
    urls: tool.schema
      .array(tool.schema.string())
      .describe("Absolute public HTTP(S) URLs to collect. One URL for a page audit, many for a site audit."),
    evidenceDir: tool.schema
      .string()
      .describe("The `evidence` path returned by seo-start-run"),
  },
  async execute({ urls, evidenceDir }) {
    return JSON.stringify(await collectPages(urls, evidenceDir))
  },
})
