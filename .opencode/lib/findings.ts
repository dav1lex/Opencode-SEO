const priorities = ["low", "medium", "high", "critical"] as const
const confidences = new Set(["high", "medium", "low"])

// `category` and `impact` are both pure functions of `rule`, so both are derived.
//
// impact especially: it answers "what does this CLASS of defect do?", which is what a rule
// IS. Letting a model write it in prose gave it a field to smuggle unsupported claims into,
// and it did — real audits produced "hurts Core Web Vitals ranking potential" and "Google
// may surface a stale description in knowledge panels", both banned by evidence-policy.md,
// both waved through by a regex blocklist that only knew the exact phrasings it had seen.
// A blocklist over free prose loses to paraphrase forever. Removing the field wins once.
//
// The author still writes issue, evidence, and fix. Those are about the page. impact is not.
const requiredText = ["rule", "issue", "evidence", "fix"] as const
const allowedFields = new Set([
  ...requiredText,
  "category",
  "impact",
  "priority",
  "confidence",
  "page",
  "prevalence",
])

type Rule = { category: string; max: (typeof priorities)[number]; impact: string }

export const rules: Record<string, Rule> = {
  "TECH-INDEX-CONFLICT": {
    category: "technical",
    max: "critical",
    impact: "The page instructs search engines not to index it, so it is excluded from search results.",
  },
  "TECH-META-MISSING": {
    category: "technical",
    max: "high",
    impact: "Search engines and browsers must guess how to interpret and present the page.",
  },
  "TECH-CANON-CONFLICT": {
    category: "technical",
    max: "high",
    impact: "The page declares a different URL as its canonical version, so signals consolidate there instead.",
  },
  "TECH-RENDER-FAIL": {
    category: "technical",
    max: "high",
    impact: "Content or navigation is missing from the rendered page, so it cannot be read or followed.",
  },
  "TECH-HEADING-CLARITY": {
    category: "technical",
    max: "low",
    impact: "The heading structure obscures the page hierarchy for readers scanning it.",
  },
  "TECH-IMAGE-ALT": {
    category: "technical",
    max: "medium",
    impact: "Screen readers and image search have no text alternative for the image.",
  },
  "TECH-ACCESSIBILITY": {
    category: "technical",
    max: "medium",
    impact: "An interactive control cannot be identified or operated by assistive technology.",
  },
  "TECH-CONSOLE-ERROR": {
    category: "technical",
    max: "high",
    impact: "A captured failure affects page content or interaction.",
  },
  "TECH-PERFORMANCE-MEASURED": {
    category: "technical",
    max: "high",
    impact: "Measured data shows the page is slow to become usable for real visitors.",
  },
  "TECH-LINK-ANCHOR-GENERIC": {
    category: "technical",
    max: "low",
    impact: "The anchor text describes neither the destination nor its topic.",
  },
  "TECH-LINK-ANCHOR-CONFLICT": {
    category: "technical",
    max: "low",
    impact: "The same label leads to different pages, so the label cannot describe either.",
  },
  "TECH-META-MEANINGLESS": {
    category: "technical",
    max: "medium",
    impact: "The title or description carries no information about what the page offers.",
  },
  "TECH-LINK-BROKEN": {
    category: "technical",
    max: "high",
    impact: "A link on the page leads to a page that does not load.",
  },
  "TECH-ROBOTS-BLOCK": {
    category: "technical",
    max: "high",
    impact: "robots.txt prevents crawling of the page or a resource it needs to render.",
  },
  "TECH-REDIRECT-CHAIN": {
    category: "technical",
    max: "medium",
    impact: "Each hop adds latency, and signals pass through more redirects than necessary.",
  },
  "TECH-JS-DEPENDENT": {
    category: "technical",
    max: "medium",
    impact: "Content is absent from the server response, so rendering is deferred to a separate, budgeted queue.",
  },
  "TECH-IMAGE-DIMENSIONS": {
    category: "technical",
    max: "medium",
    impact: "The layout shifts when the image arrives, moving content the reader may be looking at.",
  },
  "TECH-IMAGE-LAZY-LCP": {
    category: "technical",
    max: "medium",
    impact: "The request for an image the visitor sees immediately is deferred, delaying the largest paint.",
  },
  "TECH-IMAGE-WEIGHT": {
    category: "technical",
    max: "medium",
    impact: "Bytes the visitor must download before the image appears, with no visible benefit.",
  },
  "TECH-SOCIAL-PREVIEW": {
    category: "technical",
    max: "low",
    impact: "Links shared to social platforms and chat apps render without a full preview card.",
  },
  "TECH-PERFORMANCE-OUTLIER": {
    category: "technical",
    max: "medium",
    impact: "This page is markedly slower to serve than the rest of the site.",
  },
  "HREFLANG-SELF-MISSING": {
    category: "technical",
    max: "medium",
    impact: "An hreflang cluster without a self-reference is incomplete and may be disregarded.",
  },
  "HREFLANG-RETURN-MISSING": {
    category: "technical",
    max: "medium",
    impact: "An hreflang pair without a return tag is not treated as a confirmed alternate.",
  },
  "HREFLANG-CANONICAL-MISMATCH": {
    category: "technical",
    max: "medium",
    impact: "The hreflang target and its canonical disagree, so the alternate cannot be resolved.",
  },
  "CONTENT-INTENT": {
    category: "content",
    max: "high",
    impact: "A reader cannot tell what the page is for or what to do next.",
  },
  "CONTENT-CLAIM-SUPPORT": {
    category: "content",
    max: "high",
    impact: "A material claim cannot be verified, so a reader has no reason to believe it.",
  },
  "CONTENT-CLARITY": {
    category: "content",
    max: "medium",
    impact: "The copy creates ambiguity or contradiction that a reader must work to resolve.",
  },
  "CONTENT-DEPTH": {
    category: "content",
    max: "medium",
    impact: "A question the page's own purpose raises is left unanswered.",
  },
  "CONTENT-TRUST": {
    category: "content",
    max: "medium",
    impact: "A reader cannot establish who is behind the page or hold them to what it says.",
  },
  "CONTENT-CITATION": {
    category: "content",
    max: "low",
    impact: "The passage cannot be quoted or attributed reliably by a reader or a tool.",
  },
  "SCHEMA-PARSE": {
    category: "schema",
    max: "high",
    impact: "The block is discarded entirely, so any markup it carries is not processed.",
  },
  "SCHEMA-REQUIRED": {
    category: "schema",
    max: "high",
    impact: "A property a documented Google feature requires is absent, so the markup is incomplete for it.",
  },
  "SCHEMA-ENTITY-LINK": {
    category: "schema",
    max: "medium",
    impact: "An @id reference resolves to nothing, so the relationship it declares cannot be followed.",
  },
  "SCHEMA-CONTENT-MISMATCH": {
    category: "schema",
    max: "high",
    impact: "The markup states something the visible page contradicts.",
  },
  "SCHEMA-DEPRECATED": {
    category: "schema",
    max: "medium",
    impact: "The markup targets a feature that no longer exists, so it does nothing.",
  },
  "SCHEMA-SEARCH-ACTION": {
    category: "schema",
    max: "medium",
    impact: "The markup advertises search behaviour the site does not provide.",
  },
  "SCHEMA-SELF-RATING": {
    category: "schema",
    max: "medium",
    impact: "Self-serving review markup is prohibited by Google's structured-data policy.",
  },
  "SCHEMA-CROSS-PAGE-CONFLICT": {
    category: "schema",
    max: "high",
    impact: "Pages describe the same entity with contradictory properties, so it cannot be resolved to one thing.",
  },
  "SCHEMA-MISSING-CLASS": {
    category: "schema",
    max: "low",
    impact: "A page type its siblings mark up carries no structured data.",
  },
  "SITE-DUPLICATE-TITLE": {
    category: "site",
    max: "high",
    impact: "Multiple pages present themselves identically, so neither title distinguishes its page.",
  },
  "SITE-DUPLICATE-DESC": {
    category: "site",
    max: "medium",
    impact: "Multiple pages share one description, so it describes none of them specifically.",
  },
  "SITE-SITEMAP-ORPHAN": {
    category: "site",
    max: "high",
    impact: "The sitemap advertises a URL that does not serve a page.",
  },
  "SITE-SITEMAP-STALE": {
    category: "site",
    max: "low",
    impact: "Sitemap lastmod values no longer reflect when the pages actually changed.",
  },
}

type Finding = {
  rule: keyof typeof rules
  category: string
  issue: string
  evidence: string
  impact: string
  fix: string
  priority: (typeof priorities)[number]
  confidence: string
  page?: string
  prevalence?: unknown
}

function validateFixDomains(fix: string, target?: string) {
  if (!target) return
  let base: URL
  try {
    base = new URL(target)
  } catch {
    throw new Error("Validator target must be a valid absolute URL")
  }
  for (const match of fix.matchAll(/\b(?:https?:)?\/\/[^\s'"`<>]+/gi)) {
    if (new URL(match[0], base).hostname !== base.hostname)
      throw new Error("Finding fix changes audited hostname")
  }
}

/**
 * Rules `seo-detect` computes from evidence. A specialist may not report these — not because
 * it is discouraged from doing so in a prompt, but because the validator refuses them.
 *
 * Both false positives this tool has produced came from a model reporting a rule in this set:
 * a working `/blog` called broken (it pattern-matched "FAILED" in a network log), and a
 * working `Disallow: /api/` called nullified (it reasoned about the robots spec instead of
 * parsing the file). The agent prompt already said "do not report these". It did anyway.
 * Prose is not enforcement.
 */
export const detectorRules = new Set([
  "TECH-INDEX-CONFLICT",
  "TECH-META-MISSING",
  "TECH-REDIRECT-CHAIN",
  "TECH-JS-DEPENDENT",
  "SCHEMA-PARSE",
  "TECH-IMAGE-ALT",
  "TECH-IMAGE-DIMENSIONS",
  "TECH-IMAGE-LAZY-LCP",
  "TECH-IMAGE-WEIGHT",
  "TECH-LINK-ANCHOR-GENERIC",
  "TECH-LINK-ANCHOR-CONFLICT",
  "TECH-LINK-BROKEN",
  "TECH-ROBOTS-BLOCK",
  "HREFLANG-SELF-MISSING",
  "TECH-SOCIAL-PREVIEW",
])

/** Levenshtein distance, for turning "TECH-JS-DEPENDENCY" into "did you mean TECH-JS-DEPENDENT". */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]++
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const next = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost)
      previous = row[j]
      row[j] = next
    }
  }
  return row[b.length]
}

/**
 * The registry knows the right answer, so it should say it. Real audits produced
 * `TECH-REDIRECT` for `TECH-REDIRECT-CHAIN` and `TECH-JS-DEPENDENCY` for `TECH-JS-DEPENDENT`,
 * and each near-miss cost a full round trip because the error only said "not a known rule ID".
 */
function suggest(id: string): string {
  const best = Object.keys(rules)
    .map((known) => ({ known, d: distance(id.toUpperCase(), known) }))
    .sort((a, b) => a.d - b.d)[0]
  return best && best.d <= 6 ? ` Did you mean ${best.known}?` : ""
}

/**
 * Passed checks were an unguarded surface: nothing validated them, and a real audit invented
 * the rule ID `SCHEMA-FAQ-MATCH` there. Anything a report presents as a rule must be one.
 */
export function validatePassedChecks(input: unknown): string[] {
  if (!Array.isArray(input)) throw new Error("Passed checks must be an array of rule IDs")

  // Report every bad ID at once. Failing on the first one turned a four-typo payload into
  // four round trips.
  const problems = input.flatMap((value, index) =>
    typeof value === "string" && rules[value]
      ? []
      : [
          `Passed check ${index} is not a known rule ID: ${JSON.stringify(value)}.${
            typeof value === "string" ? suggest(value) : ""
          }`,
        ],
  )
  if (problems.length) throw new Error(problems.join("\n"))
  return input as string[]
}

export type ValidateOptions = {
  /** True for specialist output, which may not claim a rule the detector owns. */
  judgedOnly?: boolean
}

export function validateFindings(
  input: unknown,
  target?: string,
  options: ValidateOptions = {},
): Finding[] {
  if (!Array.isArray(input)) throw new Error("Findings payload must be an array")

  // Every problem is collected and reported together. Throwing on the first one turned a
  // payload with four independent mistakes into four round trips, and each trip the author
  // guessed at which finding was meant — once rewriting a perfectly good one five times.
  const problems: string[] = []
  const seen = new Set<string>()

  const validated = input.map((value, index) => {
    const fail = (message: string) => {
      problems.push(message)
      return null
    }

    if (!value || typeof value !== "object" || Array.isArray(value))
      return fail(`Finding ${index} must be an object`)

    const finding = value as Record<string, unknown>
    const rule = finding.rule as string
    const policy = typeof rule === "string" ? rules[rule] : undefined
    // The label names the rule even when the rule is bogus, so nobody has to count the array.
    const at = `Finding ${index} (${typeof rule === "string" ? rule : "no rule"})`

    if (!policy)
      return fail(
        `${at} has unknown rule.${typeof rule === "string" ? suggest(rule) : ""} Valid rules are listed in the reference files; a rule that is not in the registry does not exist.`,
      )

    for (const field of requiredText) {
      if (typeof finding[field] !== "string" || !finding[field].trim())
        return fail(`${at} requires non-empty ${field}`)
    }
    for (const field of Object.keys(finding)) {
      if (!allowedFields.has(field)) return fail(`${at} has unknown field ${field}`)
    }
    if (finding.category !== undefined && finding.category !== policy.category)
      return fail(`${at} category conflicts with rule (expected ${policy.category})`)
    if (options.judgedOnly && detectorRules.has(rule))
      return fail(
        `${at} is computed by seo-detect from the evidence and may not be judged by hand. Drop it; the detected finding is already in the report.`,
      )
    if (typeof finding.priority !== "string" || !priorities.includes(finding.priority as Finding["priority"]))
      return fail(
        `${at} has invalid priority ${JSON.stringify(finding.priority)}. Use one of: ${priorities.join(", ")}.`,
      )
    if (priorities.indexOf(finding.priority as Finding["priority"]) > priorities.indexOf(policy.max))
      return fail(
        `${at} has priority "${finding.priority}" but this rule's ceiling is "${policy.max}". Lower it to "${policy.max}" or below, or use a rule whose ceiling fits the evidence.`,
      )
    if (typeof finding.confidence !== "string" || !confidences.has(finding.confidence))
      return fail(
        `${at} has invalid confidence ${JSON.stringify(finding.confidence)}. Use one of: high, medium, low.`,
      )

    // Authored impact is discarded, not merged. A supplied one is ignored on purpose:
    // the point is that no prose an author wrote can reach this field.
    const normalized = {
      ...Object.fromEntries(
        Object.entries(finding).map(([key, item]) => [
          key,
          typeof item === "string" ? item.trim() : item,
        ]),
      ),
      category: policy.category,
      impact: policy.impact,
    } as Finding

    // The guards police what the audit ASSERTS, not what it QUOTES.
    //
    // Quoted spans in `evidence` are the audited page's own words. A real audit had to drop
    // a true CONTENT-CLAIM-SUPPORT finding — the site claimed "Pozycje w Google zostają"
    // ("your Google positions stay") with no evidence — because quoting that claim tripped
    // the ranking guard. Blocking the tool from REPORTING a ranking claim is the exact
    // inverse of the intent. So quoted text is stripped before the guards run.
    const unquote = (text: string) => text.replace(/"[^"]*"|'[^']*'|«[^»]*»|„[^”]*”/g, " ")
    const combined = `${normalized.issue} ${unquote(normalized.evidence)} ${normalized.fix}`
    if (rule !== "TECH-PERFORMANCE-MEASURED" && /\b(LCP|INP|CLS|Core Web Vitals)\b/i.test(combined))
      return fail(`${at} makes unmeasured performance claim`)
    if (
      rule === "TECH-PERFORMANCE-MEASURED" &&
      (!/\b(LCP|INP|CLS)\b.{0,40}\d+(?:\.\d+)?/i.test(normalized.evidence) ||
        !/\b(CrUX|Lighthouse|PageSpeed|field data|lab data)\b/i.test(normalized.evidence))
    )
      return fail(
        `${at} lacks measured performance evidence. The evidence field must name a metric (LCP, INP, or CLS) followed by its number, and the source it came from (CrUX, Lighthouse, PageSpeed, field data, or lab data). Example: 'page-performance.json: Lighthouse lab LCP 3376 ms, field data null'.`,
      )
    if (
      rule !== "TECH-ROBOTS-BLOCK" &&
      /(robots meta|meta robots|robots tag)/i.test(normalized.issue) &&
      /(missing|not set|absent)/i.test(normalized.issue)
    )
      return fail(`${at} treats default robots behavior as defect`)
    if (/\b(knowledge panel|rich result|rich snippet|local pack|map pack|SERP feature)/i.test(combined))
      return fail(`${at} promises a search feature`)
    // Bare "traffic" is not a claim: "low-traffic page" is the correct, required way to
    // explain an absent CrUX record, and the rule docs ask for exactly that. Only the
    // claim-shaped phrasings are banned.
    if (
      /\b(rank|ranks|ranking|rankings|CTR|click-through rate)\b/i.test(combined) ||
      /\b(organic|search|more|less|lost|lose|losing|drive|driving|gain|increase[ds]?|drop(?:ped)?|boost)\s+traffic\b/i.test(combined) ||
      /\btraffic\s+(loss|drop|gain|increase|growth)\b/i.test(combined)
    )
      return fail(`${at} makes an unsupported ranking or traffic claim`)
    if (/(keyword-optimized|primary keyword|keyword density)/i.test(combined))
      return fail(`${at} contains keyword folklore`)
    if (normalized.category === "content" && /(word count|\b\d+\s+words\b|thin content)/i.test(combined))
      return fail(`${at} uses arbitrary content length evidence`)
    if (
      rule === "SCHEMA-REQUIRED" &&
      /LocalBusiness/i.test(combined) &&
      /\b(telephone|openingHours|image|geo)\b/i.test(combined)
    )
      return fail(`${at} treats recommended LocalBusiness property as required`)

    try {
      validateFixDomains(normalized.fix, target)
    } catch (error) {
      return fail(`${at} ${error instanceof Error ? error.message : String(error)}`)
    }

    const fingerprint =
      `${normalized.issue}\n${normalized.evidence}\n${normalized.page ?? ""}`.toLowerCase()
    if (seen.has(fingerprint)) return fail(`${at} duplicates an earlier finding`)
    seen.add(fingerprint)
    return normalized
  })

  if (problems.length)
    throw new Error(
      `${problems.length} finding(s) rejected. Fix every one below, then revalidate:\n` +
        problems.map((problem) => `  - ${problem}`).join("\n"),
    )
  return validated as Finding[]
}
