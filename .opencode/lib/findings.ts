const categories = new Set(["technical", "content", "schema"])
const priorities = new Set(["critical", "high", "medium", "low"])
const confidences = new Set(["high", "medium", "low"])
const requiredText = ["issue", "evidence", "impact", "fix"] as const

type Finding = {
  category: string
  issue: string
  evidence: string
  impact: string
  fix: string
  priority: string
  confidence: string
}

export function validateFindings(input: unknown): Finding[] {
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
    if (typeof finding.category !== "string" || !categories.has(finding.category))
      throw new Error(`Finding ${index} has invalid category`)
    if (typeof finding.priority !== "string" || !priorities.has(finding.priority))
      throw new Error(`Finding ${index} has invalid priority`)
    if (typeof finding.confidence !== "string" || !confidences.has(finding.confidence))
      throw new Error(`Finding ${index} has invalid confidence`)

    const normalized = Object.fromEntries(
      Object.entries(finding).map(([key, item]) => [
        key,
        typeof item === "string" ? item.trim() : item,
      ]),
    ) as Finding
    const fingerprint = `${normalized.issue.toLowerCase()}\n${normalized.evidence.toLowerCase()}`
    if (seen.has(fingerprint)) throw new Error(`Finding ${index} duplicates an earlier finding`)
    seen.add(fingerprint)
    return normalized
  })
}
