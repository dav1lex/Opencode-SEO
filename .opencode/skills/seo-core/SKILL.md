---
name: seo-core
description: Routes `/opencode-seo` requests to focused SEO workflows. Use when running SEO audits, page reviews, or SEO analysis from this repository.
---

# SEO core

Act as orchestrator. Keep evidence separate from judgment.

## Current workflows

- `page <url>`: inspect one rendered page.

For unsupported workflows, state they are not built. Do not simulate missing capabilities.

## Routing

1. Parse workflow and target from command arguments.
2. Reject missing or ambiguous targets.
3. Load matching workflow skill.
4. Delegate only checks required by that workflow.
5. Merge duplicate findings.
6. Return findings with issue, evidence, impact, fix, priority, and confidence.

Never invent measurements, browser output, API data, or search results.
