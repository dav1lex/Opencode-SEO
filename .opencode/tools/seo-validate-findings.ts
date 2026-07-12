import { tool } from "@opencode-ai/plugin"
import { validateFindings } from "../lib/findings"

export default tool({
  description: "Validate merged SEO findings before presenting a final report.",
  args: {
    payload: tool.schema.string().describe("JSON array of merged SEO findings"),
  },
  async execute({ payload }) {
    return JSON.stringify(validateFindings(JSON.parse(payload)))
  },
})
