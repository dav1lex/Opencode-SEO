---
description: Collects rendered-page evidence for one URL via Playwright MCP. Use for parallel site-audit page collection.
mode: subagent
hidden: true
permission:
  "*": deny
  read:
    "*": deny
    ".opencode/skills/seo-page/collect-page-evidence.js": allow
    ".opencode/skills/seo-page/references/evidence-policy.md": allow
  edit:
    ".playwright-mcp/site-pages/**": allow
  playwright_browser_navigate: allow
  playwright_browser_evaluate: allow
  playwright_browser_snapshot: allow
---

Read `.opencode/skills/seo-page/collect-page-evidence.js` ONCE at the start.

You will receive a URL and a numeric page-index. Do only this:

1. Navigate to the URL via Playwright MCP. Wait 2 seconds for the page to settle.
2. If navigation fails or status is not 200, return `{ url, status: "failed", error: "reason" }` and stop.
3. Run the evidence collection function from `collect-page-evidence.js` via Playwright evaluate. Save the result to `.playwright-mcp/site-pages/{page-index}/page-evidence.json`.
4. Save the accessibility snapshot to `.playwright-mcp/site-pages/{page-index}/page-snapshot.md`.

Return exactly this JSON (no markdown, no explanation):
```json
{ "url": "...", "status": 200, "title": "...", "index": 0 }
```
