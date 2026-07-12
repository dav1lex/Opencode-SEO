import { tool } from "@opencode-ai/plugin"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { detectFindings } from "../lib/detect"
import { checkLinks } from "../lib/links"

export default tool({
  description:
    "Compute every deterministic finding for a collected page: indexing blocks, missing metadata, redirect chains, JS dependency, unparseable JSON-LD, image alt/dimensions/lazy-LCP/weight, anchor-text defects, hreflang self-reference, social preview, robots.txt blocking (parsed, not read), and broken internal links (actually requested). These findings are exhaustive and already conform to the validator. Pass them into the findings payload verbatim; specialists must NOT re-derive or reword them.",
  args: {
    dir: tool.schema
      .string()
      .describe("Directory holding page-evidence.json, page-http.json, and robots.txt for one page"),
    page: tool.schema.string().optional().describe("Page URL, for site audits with many pages"),
    checkLinks: tool.schema
      .boolean()
      .optional()
      .describe("Request each internal link to find broken ones. Default true; costs one request per link."),
  },
  async execute({ dir, page, checkLinks: shouldCheck = true }) {
    const evidence = JSON.parse(await readFile(join(dir, "page-evidence.json"), "utf8"))
    const read = (name: string) => readFile(join(dir, name), "utf8").catch(() => undefined)

    const [httpRaw, robotsTxt] = await Promise.all([read("page-http.json"), read("robots.txt")])
    const http = httpRaw ? JSON.parse(httpRaw) : undefined

    const internal: string[] = shouldCheck
      ? (evidence.links?.items ?? [])
          .filter((link: { kind: string }) => link.kind === "internal")
          .map((link: { href: string }) => link.href)
      : []
    const linkStatuses = internal.length ? await checkLinks(internal) : undefined

    // Persist the statuses as evidence. Specialists need the ground truth: a real audit read
    // `net::ERR_ABORTED` in the network log and reported a working page as a broken route.
    if (linkStatuses)
      await writeFile(join(dir, "page-links.json"), JSON.stringify(linkStatuses, null, 2))

    return JSON.stringify(detectFindings(evidence, http, page, { robotsTxt, linkStatuses }))
  },
})
