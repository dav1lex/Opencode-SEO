# AGENTS.md

Conventions for working in this repo.

## Architecture

```
.opencode/
├── commands/   /opencode-seo, the only public entry point
├── skills/     workflows: seo-core (router), seo-page, seo-site
├── agents/     read-only subagents: seo-technical, seo-content, seo-schema
├── tools/      what the model may call
└── lib/        the code that actually decides things
tests/          proves the deterministic logic
```

No MCP. No `plugins/`. No `scripts/`. Collection uses the Playwright library directly, one browser context per page.

## The one rule

**If code can decide it, code must decide it.**

Every false positive this tool has produced came from a model reasoning about something a parser should have decided. A working page called broken from a network log. A working `Disallow` called nullified from a misremembered spec.

So parsing, matching, counting, requesting, and comparing all live in `lib/`. The model gets what is genuinely ambiguous. Nothing else.

## Findings

A finding carries `rule`, `issue`, `evidence`, `fix`, `priority`, `confidence`, and optionally `page` / `prevalence`.

It does **not** carry `category` or `impact`. The validator derives both from the rule ID and discards anything supplied. Do not add them back: a prose `impact` field is somewhere for a model to smuggle claims into, and it did.

15 of 43 rules are computed in `lib/detect.ts`. They are listed in `detectorRules`, and the validator **refuses** them from subagents. Detector output enters the payload verbatim, never reworded.

## Adding a rule

1. Registry in `lib/findings.ts`: category, priority ceiling, impact.
2. Document it in the matching `references/*-rules.md`. A parity test fails the build if the two disagree.
3. If it is a pure function of the evidence, compute it in `lib/detect.ts` and add it to `detectorRules`.

Step 3 is not optional when it applies.

## Evidence

Tools write their own evidence files and return a short summary. Never hand the model a large payload and ask it to save the file: the result is truncated before the model sees it, and the file it then writes has a hole in it.

Evidence lives in `{domain}-analysis/evidence/`, wiped at the **start** of a run. One domain per directory. Never read another domain's evidence.

## Never

- Invent browser output, metrics, API data, or search results.
- Produce a score.
- Claim anything about rankings, traffic, or rich results.
- Name a Core Web Vital without a measurement behind it.
- Hardcode URLs, domains, or machine paths. Secrets go in environment variables.
- Fail a whole workflow because one optional capability is missing. Reduce scope and say so.
- Delegate to a specialist that has nothing to judge. No unconditional fan-out.

## Verify

```bash
bun test
opencode debug config
```

Restart OpenCode after changing config, commands, agents, skills, or tools.
