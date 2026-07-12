import { tool } from "@opencode-ai/plugin"
import { validateFindings, validatePassedChecks } from "../lib/findings"

export default tool({
  description:
    "Validate merged SEO findings and passed checks before presenting a final report. Rejects unknown rule IDs, priorities above a rule's ceiling, unmeasured performance claims, search-feature promises, ranking and traffic claims, and duplicates. Each finding's `impact` is derived from its rule — do not write one; anything supplied is discarded. Passed checks must be rule IDs, not prose.",
  args: {
    target: tool.schema.string().describe("Normalized audited page URL"),
    payload: tool.schema.string().describe("JSON array of merged SEO findings"),
    passedChecks: tool.schema
      .string()
      .optional()
      .describe("JSON array of rule IDs that were checked and passed"),
  },
  async execute({ target, payload, passedChecks }) {
    return JSON.stringify({
      findings: validateFindings(JSON.parse(payload), target),
      passedChecks: passedChecks ? validatePassedChecks(JSON.parse(passedChecks)) : [],
    })
  },
})
