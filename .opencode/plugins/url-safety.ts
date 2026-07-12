import type { Plugin } from "@opencode-ai/plugin"
import { validateTargetUrl } from "../lib/url-safety"

export const UrlSafetyPlugin: Plugin = async () => ({
  "tool.execute.before": async (input, output) => {
    if (input.tool !== "playwright_browser_navigate") return
    output.args.url = await validateTargetUrl(String(output.args.url ?? ""))
  },
})
