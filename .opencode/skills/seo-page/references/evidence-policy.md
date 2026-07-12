# Evidence policy

Every finding must cite one allowed rule ID and direct collected evidence.

## Hard stops

- Never claim ranking impact from a heading, keyword, word count, schema type, or metadata length without query or performance evidence.
- Never call LCP, INP, or CLS good or bad without measured lab or field data.
- Never infer missing preload, response header, robots directive, or source markup unless collected.
- Missing robots meta means default behavior, not a defect.
- Multiple H1 elements are not automatically an SEO defect. Report only clear semantic ambiguity, at low priority.
- Root URLs with and without trailing slash are not a conflict by themselves.
- Do not recommend explicit `index, follow`; it is default behavior.
- Do not mutate audited hostname in a fix.
- Do not use arbitrary word-count, keyword-density, title-length, or description-length thresholds.
- Do not promise rich results, rankings, local-pack visibility, AI citations, or Knowledge Panel changes.
- Separate observed defects from optional enhancements. Optional enhancements are not findings.

## Priority

- `critical`: observed indexing block or equivalent page-level failure.
- `high`: observed defect likely to prevent discovery, rendering, comprehension, or valid structured-data processing.
- `medium`: observed material defect with bounded impact.
- `low`: minor semantic or quality issue.

Uncertainty lowers confidence or removes finding; it never raises priority.

## Sources checked

- Google Search Central robots meta specifications, retrieved 2026-07-12.
- Google Search Central LocalBusiness structured-data documentation, retrieved 2026-07-12.
- Google Search documentation updates through 2026-07-10.
- HTML Living Standard heading semantics.
