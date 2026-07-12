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
 * Passed checks were an unguarded surface: nothing validated them, and a real audit invented
 * the rule ID `SCHEMA-FAQ-MATCH` there. Anything a report presents as a rule must be one.
 */
export function validatePassedChecks(input: unknown): string[] {
  if (!Array.isArray(input)) throw new Error("Passed checks must be an array of rule IDs")
  return input.map((value, index) => {
    if (typeof value !== "string" || !rules[value])
      throw new Error(`Passed check ${index} is not a known rule ID: ${JSON.stringify(value)}`)
    return value
  })
}

export function validateFindings(input: unknown, target?: string): Finding[] {
  if (!Array.isArray(input)) throw new Error("Findings payload must be an array")

  const seen = new Set<string>()
  return input.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error(`Finding ${index} must be an object`)

    const finding = value as Record<string, unknown>
    for (const field of requiredText) {
      if (typeof finding[field] !== "string" || !finding[field].trim())
        throw new Error(`Finding ${index} requires non-empty ${field}`)
    }
    for (const field of Object.keys(finding)) {
      if (!allowedFields.has(field)) throw new Error(`Finding ${index} has unknown field ${field}`)
    }

    const rule = finding.rule as string
    const policy = rules[rule]
    if (!policy) throw new Error(`Finding ${index} has unknown rule`)
    if (finding.category !== undefined && finding.category !== policy.category)
      throw new Error(`Finding ${index} category conflicts with rule`)
    if (typeof finding.priority !== "string" || !priorities.includes(finding.priority as Finding["priority"]))
      throw new Error(`Finding ${index} has invalid priority`)
    if (priorities.indexOf(finding.priority as Finding["priority"]) > priorities.indexOf(policy.max))
      throw new Error(`Finding ${index} exceeds rule priority`)
    if (typeof finding.confidence !== "string" || !confidences.has(finding.confidence))
      throw new Error(`Finding ${index} has invalid confidence`)

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

    // The remaining guards police issue/evidence/fix — fields the author must write. They
    // are a tripwire for careless phrasing, not a boundary; the boundary is the derived
    // impact above, plus the rule registry itself.
    const combined = `${normalized.issue} ${normalized.evidence} ${normalized.fix}`
    if (rule !== "TECH-PERFORMANCE-MEASURED" && /\b(LCP|INP|CLS|Core Web Vitals)\b/i.test(combined))
      throw new Error(`Finding ${index} makes unmeasured performance claim`)
    if (
      rule === "TECH-PERFORMANCE-MEASURED" &&
      (!/\b(LCP|INP|CLS)\b.{0,40}\d+(?:\.\d+)?/i.test(normalized.evidence) ||
        !/\b(CrUX|Lighthouse|PageSpeed|field data|lab data)\b/i.test(normalized.evidence))
    )
      throw new Error(`Finding ${index} lacks measured performance evidence`)
    if (
      rule !== "TECH-ROBOTS-BLOCK" &&
      /(robots meta|meta robots|robots tag)/i.test(normalized.issue) &&
      /(missing|not set|absent)/i.test(normalized.issue)
    )
      throw new Error(`Finding ${index} treats default robots behavior as defect`)
    if (/\b(knowledge panel|rich result|rich snippet|local pack|map pack|SERP feature)/i.test(combined))
      throw new Error(`Finding ${index} promises a search feature`)
    if (/\b(rank|ranking|rankings|CTR|click-through rate|impressions|traffic)\b/i.test(combined))
      throw new Error(`Finding ${index} makes an unsupported ranking or traffic claim`)
    if (/(keyword-optimized|primary keyword|keyword density)/i.test(combined))
      throw new Error(`Finding ${index} contains keyword folklore`)
    if (normalized.category === "content" && /(word count|\b\d+\s+words\b|thin content)/i.test(combined))
      throw new Error(`Finding ${index} uses arbitrary content length evidence`)
    if (
      rule === "SCHEMA-REQUIRED" &&
      /LocalBusiness/i.test(combined) &&
      /\b(telephone|openingHours|image|geo)\b/i.test(combined)
    )
      throw new Error(`Finding ${index} treats recommended LocalBusiness property as required`)

    validateFixDomains(normalized.fix, target)

    const fingerprint =
      `${normalized.issue}\n${normalized.evidence}\n${normalized.page ?? ""}`.toLowerCase()
    if (seen.has(fingerprint)) throw new Error(`Finding ${index} duplicates an earlier finding`)
    seen.add(fingerprint)
    return normalized
  })
}
