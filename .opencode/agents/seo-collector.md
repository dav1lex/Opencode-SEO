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
    "*-analysis/evidence/**": allow
  seo-fetch-http: allow
  playwright_browser_navigate: allow
  playwright_browser_evaluate: allow
  playwright_browser_snapshot: allow
---

Read `.opencode/skills/seo-page/collect-page-evidence.js` ONCE at the start.

You will receive a URL and a numeric page-index. Do only this:

1. Call `seo-fetch-http` with the URL. Save the result to `{domain}-analysis/evidence/site-pages/{page-index}/page-http.json`. This captures status, response headers, and the redirect chain, none of which the browser can show you.
2. If the tool throws, or the final status is not 200, return `{ url, status: "failed", error: "reason" }` and stop. Do not navigate.
3. Navigate to the URL via Playwright MCP. Wait 2 seconds for the page to settle.
4. Run the evidence collection function from `collect-page-evidence.js` via Playwright evaluate. Save the result to `{domain}-analysis/evidence/site-pages/{page-index}/page-evidence.json`.
5. Save the accessibility snapshot to `{domain}-analysis/evidence/site-pages/{page-index}/page-snapshot.md`.

Never fetch performance data. The site skill collects it once for the entry page only.

Return exactly this JSON (no markdown, no explanation):
```json
{ "url": "...", "status": 200, "title": "...", "index": 0 }
```
