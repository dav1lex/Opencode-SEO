import { tool } from "@opencode-ai/plugin"
import { fetchHttpEvidence } from "../lib/http"

export default tool({
  description:
    "Fetch HTTP-level page evidence: status, response headers (X-Robots-Tag, Link), redirect chain, and server-sent raw HTML. Complements rendered-DOM evidence; run before Playwright collection.",
  args: {
    url: tool.schema.string().describe("Absolute public HTTP(S) URL to fetch"),
  },
  async execute({ url }) {
    return JSON.stringify(await fetchHttpEvidence(url))
  },
})
