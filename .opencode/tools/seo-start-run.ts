import { tool } from "@opencode-ai/plugin"
import { startRun } from "../lib/run-dir"

export default tool({
  description:
    "Open an audit run for a target URL. Validates the URL, clears any evidence left by a previous run of the same domain, and returns the paths every later step must write to. Call this first, before any collection.",
  args: {
    url: tool.schema.string().describe("Absolute public HTTP(S) URL to audit"),
  },
  async execute({ url }) {
    return JSON.stringify(await startRun(url))
  },
})
