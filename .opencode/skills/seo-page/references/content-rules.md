# Content rules

- `CONTENT-INTENT`: Page purpose or intended action is unclear from supplied content. High maximum.
- `CONTENT-CLAIM-SUPPORT`: Material factual or quantified claim lacks visible method, attribution, timeframe, or supporting detail. High maximum. This includes the page's own unsupported ranking or traffic promises — quote them in `evidence` and report them. Quoting a claim the page makes is not making that claim; the validator strips quoted spans before its guards run.
- `CONTENT-CLARITY`: Copy or headings create concrete ambiguity, contradiction, or comprehension friction. Medium maximum. Malformed words are a special case: several words mangled the same way (duplicated suffixes, spliced fragments, a term corrupted mid-word) are a template or translation-plugin fault, not sloppy writing. Say that. Recommending a proofread is useless when the plugin regenerates the damage on every render; name the mechanism and point at the template.
- `CONTENT-DEPTH`: User-critical question is left unanswered despite page intent. Medium maximum. Never use word count as evidence.
- `CONTENT-TRUST`: Relevant identity, contact, authorship, sourcing, or commercial transparency is absent. Medium maximum.
- `CONTENT-CITATION`: Important factual passage is too ambiguous to quote or attribute reliably. Low maximum. This is about the *shape* of the passage, not whether its claim is supported. A claim with no backing is `CONTENT-CLAIM-SUPPORT`, and only that. Never file both rules against the same claim.

Do not prescribe keywords without target-query evidence. Do not call title or H1 a ranking signal. Do not benchmark length against competitors without SERP evidence. Marketing headings may be long; report only demonstrated clarity problems.
