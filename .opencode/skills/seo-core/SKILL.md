---
name: seo-core
description: Routes `/opencode-seo` requests to focused SEO workflows. Use when running SEO audits, page reviews, or SEO analysis from this repository.
---

# SEO core

Act as orchestrator. Keep evidence separate from judgment.

## Current workflows

- `page <url>`: load `seo-page` and inspect one rendered page.
- `site <url>`: load `seo-site` and audit up to 20 sample pages across a site.

For unsupported workflows, state they are not built. Do not simulate missing capabilities.

## Routing

1. Parse workflow and target from command arguments.
2. Reject missing or ambiguous targets.
3. Load matching workflow skill.
4. Delegate only checks required by that workflow.
5. Merge duplicate findings.
6. Return findings with issue, evidence, fix, priority, and confidence. Category and impact are derived from the rule ID by the validator, never written by hand.

Never invent measurements, browser output, API data, or search results.
