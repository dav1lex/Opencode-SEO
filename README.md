# opencode-seo

SEO auditor for [OpenCode](https://opencode.ai). Cannot report what it did not measure.

```
/opencode-seo page https://example.com
/opencode-seo site https://example.com
```

## What it is

Code collects evidence. Code computes 15 of 43 rules. Model judges only the rest. Validator throws on anything unsupported.

Report cites the evidence file behind every finding. Evidence stays on disk. You can check the work.

## What it is not

Not a score generator. Not a keyword tool. Not a rank tracker. Not a backlink tool.

No Search Console. No crawler for 10k pages. Site audit caps at 20 sampled pages.

## What it can do

- HTTP layer: status, redirect chain, response headers. Catches `X-Robots-Tag: noindex`, which a rendered DOM cannot show and which silently deindexes pages.
- Rendered DOM: metadata, headings, links, images, JSON-LD, accessibility tree, console, network.
- robots.txt parsed, not read. Longest-match precedence, wildcards, `$` anchors.
- Every internal link actually requested. Broken links found, not guessed.
- Core Web Vitals from PageSpeed Insights. Lab plus CrUX field.
- Schema versus visible content. Catches markup that contradicts the page.
- Content: unsupported claims, contradictions, missing trust signals.

## What it cannot do

- No ranking claims. Has no ranking data.
- No rich-result promises. Cannot see what Google displays.
- No word count targets, keyword density, E-E-A-T percentage. Folklore.
- No Core Web Vitals talk without `GOOGLE_API_KEY`. Says "out of scope" instead of guessing.
- No overall score. Ever.

Finding cannot cite evidence, finding does not ship.

## Why better

Built as rewrite of a 51k-line SEO plugin. That plugin prints this:

```
AI Search Readiness (GEO): 51/100
  Google AI Overviews  55
  ChatGPT / Claude     48
  Perplexity           52
```

No instrument produces "ChatGPT: 48". Digits are decoration.

Same report scored Core Web Vitals 75/100, then admitted in a footnote the performance API was never reachable and numbers were "inferred or estimated". Same report flagged orphan pages on a site whose footer links worked.

That plugin has ~28,000 lines of prose telling the model to behave. Zero lines stopping it.

| | That plugin | This |
|---|---:|---:|
| Files | 364 | 36 |
| Lines | 51,367 | 2,218 |
| **Machine-checked rule IDs** | **0** | **43** |
| **Rules computed, not judged** | **0** | **15** |
| API keys required | 13+ | 1 (optional) |

Difference is not size. Here, misbehaving throws.

Concretely, the validator refuses:

- rule IDs that do not exist
- priority above a rule's ceiling
- Core Web Vitals named without a measurement
- ranking, traffic, or rich-result claims, with the offending phrase quoted back
- detector-owned rules submitted by a model
- passed checks that are not real rule IDs

`impact` and `category` are derived from the rule ID. Model cannot write them.

## Setup

Needs [Bun](https://bun.sh) and OpenCode.

```bash
git clone <repository>
cd opencode-seo
cd .opencode && bun install && cd ..
bun test
```

Performance data needs a free PageSpeed Insights key. 25k queries/day, no billing account. Not Search Console: no OAuth, no site ownership, works on any public URL.

[console.cloud.google.com](https://console.cloud.google.com) → new project → enable **PageSpeed Insights API** → Credentials → **Create API key**.

```bash
export GOOGLE_API_KEY="..."
```

Everything else runs without it.

## Output

```
example.com-analysis/
├── analysis.md    report
└── evidence/      what the report stands on
```

Evidence wiped at start of a run, kept after. One directory per domain, no cross-contamination.

## Security

Fetches URLs a stranger picked, so:

- Every target is DNS-resolved and checked against private, loopback, link-local and reserved ranges before any request.
- **Every redirect hop is re-validated.** A public URL that 302s to `169.254.169.254` is a real cloud-metadata exfiltration path, and a naive `fetch` walks straight into it.
- Subagents are deny-by-default and can read nothing outside the evidence directory.
- Page content is treated as hostile input.
