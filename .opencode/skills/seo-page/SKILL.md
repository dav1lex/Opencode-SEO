---
name: seo-page
description: Audits one public web page using Playwright MCP and focused SEO subagents. Use for `/opencode-seo page <url>` and single-page SEO reviews.
---

# Page audit

Audit one public HTTP or HTTPS page. Do not crawl the site.

## Safety gate

Before navigation, reject credentials in URLs, non-HTTP schemes, localhost names, loopback addresses, link-local addresses, and private-network IPs. Do not bypass TLS errors. Stop on redirects to rejected targets.

## Collect once

Use Playwright MCP as the source of rendered-page evidence:

1. Navigate to the target and wait for the document to settle.
2. Record final URL, document title, accessibility snapshot, and visible main content.
3. Inspect rendered DOM for metadata, canonical, robots, headings, links, images, language, viewport, and structured data.
4. Inspect relevant document response and browser console evidence when available.
5. Take a screenshot only when visual evidence helps a finding.

Do not call measured Core Web Vitals from a normal browser visit. Label source-based concerns as potential risks.

## Delegate

Pass collected evidence to these subagents in parallel:

- `seo-technical`: crawl/index directives, metadata, rendering, links, images, mobile basics, and potential performance risks.
- `seo-content`: intent match, hierarchy, clarity, depth, trust signals, and citation readiness.
- `seo-schema`: detected structured data, syntax and visible-content consistency, supported opportunities.

Subagents analyze supplied evidence. They must not fetch the page again.

## Synthesis

Merge duplicates. Prefer direct DOM, response, console, or screenshot evidence over inference. Omit sections with no evidence.

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
