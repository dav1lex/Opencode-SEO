import { tool } from "@opencode-ai/plugin"
import { validateFindings, validatePassedChecks } from "../lib/findings"

export default tool({
  description:
    "Validate an audit before presenting it. `detected` is the verbatim output of seo-detect; `judged` is what the specialists concluded. A rule seo-detect owns may not appear in `judged` — it is computed from the evidence and hand-reasoning about it has produced false positives. Each finding's `impact` is derived from its rule; anything supplied is discarded. Passed checks must be rule IDs.",
  args: {
    target: tool.schema.string().describe("Normalized audited page URL"),
    detected: tool.schema
      .string()
      .describe("JSON array from seo-detect, passed through verbatim and unedited"),
    judged: tool.schema
      .string()
      .describe("JSON array of specialist findings that required judgment"),
    passedChecks: tool.schema
      .string()
      .optional()
      .describe("JSON array of rule IDs that were checked and passed"),
  },
  async execute({ target, detected, judged, passedChecks }) {
    const computed = validateFindings(JSON.parse(detected), target)
    const reasoned = validateFindings(JSON.parse(judged), target, { judgedOnly: true })

    // Detected findings come first: they are exhaustive and were not written by a reader.
    return JSON.stringify({
      findings: validateFindings([...computed, ...reasoned], target),
      passedChecks: passedChecks ? validatePassedChecks(JSON.parse(passedChecks)) : [],
    })
  },
})
