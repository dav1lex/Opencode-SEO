import { tool } from "@opencode-ai/plugin"
import { validateFindings } from "../lib/findings"

export default tool({
  description: "Validate merged SEO findings before presenting a final report.",
  args: {
    target: tool.schema.string().describe("Normalized audited page URL"),
    payload: tool.schema.string().describe("JSON array of merged SEO findings"),
  },
  async execute({ target, payload }) {
    return JSON.stringify(validateFindings(JSON.parse(payload), target))
  },
})
