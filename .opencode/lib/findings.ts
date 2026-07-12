const priorities = ["low", "medium", "high", "critical"] as const
const confidences = new Set(["high", "medium", "low"])
const requiredText = ["rule", "category", "issue", "evidence", "impact", "fix"] as const
const allowedFields = new Set([...requiredText, "priority", "confidence"])

export const rules = {
  "TECH-INDEX-CONFLICT": ["technical", "critical"],
  "TECH-META-MISSING": ["technical", "high"],
  "TECH-CANON-CONFLICT": ["technical", "high"],
  "TECH-RENDER-FAIL": ["technical", "high"],
  "TECH-HEADING-CLARITY": ["technical", "low"],
  "TECH-IMAGE-ALT": ["technical", "medium"],
  "TECH-ACCESSIBILITY": ["technical", "medium"],
  "TECH-CONSOLE-ERROR": ["technical", "high"],
  "TECH-PERFORMANCE-MEASURED": ["technical", "high"],
  "TECH-LINK-ANCHOR-GENERIC": ["technical", "low"],
  "TECH-LINK-ANCHOR-CONFLICT": ["technical", "low"],
  "TECH-META-MEANINGLESS": ["technical", "medium"],
  "TECH-ROBOTS-BLOCK": ["technical", "high"],
  "CONTENT-INTENT": ["content", "high"],
  "CONTENT-CLAIM-SUPPORT": ["content", "high"],
  "CONTENT-CLARITY": ["content", "medium"],
  "CONTENT-DEPTH": ["content", "medium"],
  "CONTENT-TRUST": ["content", "medium"],
  "CONTENT-CITATION": ["content", "low"],
  "SCHEMA-PARSE": ["schema", "high"],
  "SCHEMA-REQUIRED": ["schema", "high"],
  "SCHEMA-ENTITY-LINK": ["schema", "medium"],
  "SCHEMA-CONTENT-MISMATCH": ["schema", "high"],
  "SCHEMA-DEPRECATED": ["schema", "medium"],
  "SCHEMA-SEARCH-ACTION": ["schema", "medium"],
} as const

type Finding = {
  rule: keyof typeof rules
  category: string
  issue: string
  evidence: string
  impact: string
  fix: string
  priority: (typeof priorities)[number]
  confidence: string
}

function validateFixDomains(fix: string, target?: string) {
  if (!target) return
  const targetHost = new URL(target).hostname
  for (const match of fix.matchAll(/\b(?:https?:)?\/\/[^\s'"`<>]+/gi)) {
    if (new URL(match[0], target).hostname !== targetHost)
      throw new Error("Finding fix changes audited hostname")
  }
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

    const rule = finding.rule as keyof typeof rules
    const policy = rules[rule]
    if (!policy) throw new Error(`Finding ${index} has unknown rule`)
    if (finding.category !== policy[0]) throw new Error(`Finding ${index} category conflicts with rule`)
    if (typeof finding.priority !== "string" || !priorities.includes(finding.priority as Finding["priority"]))
      throw new Error(`Finding ${index} has invalid priority`)
    if (priorities.indexOf(finding.priority as Finding["priority"]) > priorities.indexOf(policy[1]))
      throw new Error(`Finding ${index} exceeds rule priority`)
    if (typeof finding.confidence !== "string" || !confidences.has(finding.confidence))
      throw new Error(`Finding ${index} has invalid confidence`)

    const normalized = Object.fromEntries(
      Object.entries(finding).map(([key, item]) => [
        key,
        typeof item === "string" ? item.trim() : item,
      ]),
    ) as Finding

    const combined = `${normalized.issue} ${normalized.evidence} ${normalized.impact} ${normalized.fix}`
    if (rule !== "TECH-PERFORMANCE-MEASURED" && /\b(LCP|INP|CLS|Core Web Vitals)\b/i.test(combined))
      throw new Error(`Finding ${index} makes unmeasured performance claim`)
    if (
      rule === "TECH-PERFORMANCE-MEASURED" &&
      (!/\b(LCP|INP|CLS)\b.{0,40}\d+(?:\.\d+)?/i.test(normalized.evidence) ||
        !/\b(CrUX|Lighthouse|PageSpeed|field data|lab data)\b/i.test(normalized.evidence))
    )
      throw new Error(`Finding ${index} lacks measured performance evidence`)
    if (/robots/i.test(normalized.issue) && /(missing|not set|absent)/i.test(normalized.issue))
      throw new Error(`Finding ${index} treats default robots behavior as defect`)
    if (/FAQ/i.test(combined) && /(eligible|eligibility|trigger).{0,30}rich result/i.test(combined))
      throw new Error(`Finding ${index} contains retired FAQ rich-result claim`)
    if (/(strongest ranking signal|indexation thrash|local pack visibility|knowledge panel association)/i.test(combined))
      throw new Error(`Finding ${index} contains unsupported impact claim`)
    if (/(keyword-optimized|primary keyword|ranking signal|rank(?:ing)? for)/i.test(combined))
      throw new Error(`Finding ${index} contains unsupported keyword or ranking claim`)
    if (normalized.category === "content" && /(word count|\b\d+\s+words\b|thin content)/i.test(combined))
      throw new Error(`Finding ${index} uses arbitrary content length evidence`)
    if (
      rule === "SCHEMA-REQUIRED" &&
      /LocalBusiness/i.test(combined) &&
      /\b(telephone|openingHours|image|geo)\b/i.test(combined)
    )
      throw new Error(`Finding ${index} treats recommended LocalBusiness property as required`)

    validateFixDomains(normalized.fix, target)

    const fingerprint = `${normalized.issue.toLowerCase()}\n${normalized.evidence.toLowerCase()}`
    if (seen.has(fingerprint)) throw new Error(`Finding ${index} duplicates an earlier finding`)
    seen.add(fingerprint)
    return normalized
  })
}
