import { tool } from "@opencode-ai/plugin"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { detectFindings } from "../lib/detect"

export default tool({
  description:
    "Compute every deterministic finding for a collected page: indexing blocks, missing metadata, redirect chains, JS dependency, unparseable JSON-LD, image alt/dimensions/lazy-LCP/weight, anchor-text defects, hreflang self-reference, and social preview. These findings are exhaustive and already validated — specialists must NOT re-derive them, only add findings requiring judgment.",
  args: {
    dir: tool.schema
      .string()
      .describe("Directory holding page-evidence.json and page-http.json for one page"),
    page: tool.schema.string().optional().describe("Page URL, for site audits with many pages"),
  },
  async execute({ dir, page }) {
    const evidence = JSON.parse(await readFile(join(dir, "page-evidence.json"), "utf8"))
    const http = await readFile(join(dir, "page-http.json"), "utf8")
      .then(JSON.parse)
      .catch(() => undefined)
    return JSON.stringify(detectFindings(evidence, http, page))
  },
})
