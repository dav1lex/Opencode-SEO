---
name: seo-page
description: Audits one public web page using Playwright MCP and focused SEO subagents. Use for `/opencode-seo page <url>` and single-page SEO reviews.
---

# Page audit

Audit one public HTTP or HTTPS page. Do not crawl the site.

## Safety gate

Before navigation, call `seo-validate-url` and navigate only to its returned URL. Do not bypass TLS errors. The navigation hook applies the same validation to direct Playwright navigation calls.

## Collect once

Use Playwright MCP as the source of rendered-page evidence:

1. Navigate to the target and wait for the document to settle.
2. Read `.opencode/scripts/collect-page-evidence.js` and pass its function expression unchanged to Playwright's browser evaluation tool.
3. Use its structured result as shared evidence for metadata, headings, classified links, computed image layout, visible and hidden DOM text, navigation timing, and structured data.
4. Capture an accessibility snapshot for semantic and interaction evidence.
5. Inspect relevant document response and browser console evidence when available.
6. Take a screenshot only when visual evidence helps a finding.

Do not call measured Core Web Vitals from a normal browser visit. Label source-based concerns as potential risks.

## Delegate

Pass collected evidence to these subagents in parallel:

- `seo-technical`: crawl/index directives, metadata, rendering, links, images, mobile basics, and potential performance risks.
- `seo-content`: intent match, hierarchy, clarity, depth, trust signals, and citation readiness.
- `seo-schema`: detected structured data, syntax and visible-content consistency, supported opportunities.

Subagents analyze supplied evidence. They must not fetch the page again.

## Synthesis

Merge duplicates. Prefer direct DOM, response, console, or screenshot evidence over inference. Omit sections with no evidence.

Reject specialist findings outside that specialist's scope. When priorities conflict, choose priority from evidenced impact rather than averaging agent labels.

Before presenting final report, serialize merged findings as JSON and call `seo-validate-findings`. Fix rejected fields or duplicates; never skip validation. Passed checks and scope limits remain separate from findings payload.

For every finding provide:

- Issue
- Evidence
- Impact
- Fix
- Priority: critical, high, medium, or low
- Confidence: high, medium, or low

Also provide passed checks, scope limits, and failed collection steps. Do not produce an overall SEO score.

## Failure handling

- Unreachable target: report browser error and stop.
- Authentication wall: report limitation; do not guess hidden content.
- Bot challenge or consent wall: report what blocked inspection.
- Missing optional browser evidence: continue with reduced scope and disclose gap.
