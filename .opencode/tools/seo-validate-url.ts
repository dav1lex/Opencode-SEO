import { tool } from "@opencode-ai/plugin"
import { validateTargetUrl } from "../lib/url-safety"

export default tool({
  description: "Validate and normalize a public HTTP(S) URL before any SEO browser navigation.",
  args: {
    url: tool.schema.string().describe("Absolute public HTTP(S) URL to validate"),
  },
  async execute({ url }) {
    return validateTargetUrl(url)
  },
})
