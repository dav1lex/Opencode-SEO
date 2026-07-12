import { expect, test } from "bun:test"
import { rules, validateFindings, validatePassedChecks } from "../.opencode/lib/findings"
import { readFileSync } from "node:fs"

const finding = {
  rule: "TECH-META-MISSING",
  category: "technical",
  issue: "Missing canonical",
  evidence: "No canonical link was collected",
  impact: "Duplicate URL signals may split",
  fix: "Add one canonical link",
  priority: "high",
  confidence: "high",
}

test("accepts complete findings, with impact taken from the rule", () => {
  expect(validateFindings([finding])).toEqual([
    { ...finding, impact: rules["TECH-META-MISSING"].impact },
  ])
})

test("rejects incomplete findings", () => {
  expect(() => validateFindings([{ ...finding, evidence: "" }])).toThrow(
    "non-empty evidence",
  )
})

test("rejects duplicate findings", () => {
  expect(() => validateFindings([finding, finding])).toThrow("duplicates")
})

test("rejects priority above rule maximum", () => {
  expect(() =>
    validateFindings([
      { ...finding, rule: "TECH-HEADING-CLARITY", priority: "high" },
    ]),
  ).toThrow("exceeds rule priority")
})

test("rejects unmeasured performance claims", () => {
  expect(() =>
    validateFindings([{ ...finding, issue: "Possible CLS problem" }]),
  ).toThrow("unmeasured performance")
})

test("rejects measured rule without metric source", () => {
  expect(() =>
    validateFindings([
      {
        ...finding,
        rule: "TECH-PERFORMANCE-MEASURED",
        issue: "LCP is slow",
        evidence: "LCP 4.2s",
      },
    ]),
  ).toThrow("lacks measured performance evidence")
})

test("rule references match validator registry", () => {
  const files = {
    technical: ["technical-rules.md", "../.opencode/skills/seo-page/references"],
    content: ["content-rules.md", "../.opencode/skills/seo-page/references"],
    schema: ["schema-rules.md", "../.opencode/skills/seo-page/references"],
    site: ["SKILL.md", "../.opencode/skills/seo-site"],
  }
  const documented = Object.entries(files).flatMap(([category, [file, base]]) =>
    [
      ...readFileSync(new URL(`${base}/${file}`, import.meta.url), "utf8").matchAll(
        /`([A-Z]+-[A-Z-]+)`:[^\n]+?(Critical|High|Medium|Low) maximum/gi,
      ),
    ].map((match) => [match[1], { category, max: match[2].toLowerCase() }]),
  )
  // The docs carry category and ceiling; impact lives only in the registry, so compare
  // the registry with impact stripped out.
  const registry = Object.fromEntries(
    Object.entries(rules).map(([id, rule]) => [id, { category: rule.category, max: rule.max }]),
  )
  expect(Object.fromEntries(documented)).toEqual(registry)
})

test("every rule carries a derived impact", () => {
  for (const [id, rule] of Object.entries(rules)) {
    expect(rule.impact, `${id} has no impact`).toBeTruthy()
  }
})

test("derives impact from the rule and discards any the author supplied", () => {
  const [result] = validateFindings([
    { ...finding, impact: "This hurts your Core Web Vitals ranking potential in knowledge panels" },
  ])
  expect(result.impact).toBe(rules[finding.rule].impact)
  expect(result.impact).not.toContain("ranking")
})

test("rejects a search-feature promise written into the fix", () => {
  expect(() =>
    validateFindings([{ ...finding, fix: "Add this to earn a rich result in the SERP" }]),
  ).toThrow("promises a search feature")
})

test("rejects a traffic claim written into the issue", () => {
  expect(() =>
    validateFindings([{ ...finding, issue: "This is costing you organic traffic" }]),
  ).toThrow("unsupported ranking or traffic claim")
})

test("rejects a passed check that is not a known rule", () => {
  // A real audit invented `SCHEMA-FAQ-MATCH` here, because nothing was checking.
  expect(() => validatePassedChecks(["SCHEMA-PARSE", "SCHEMA-FAQ-MATCH"])).toThrow(
    "not a known rule ID",
  )
})

test("accepts passed checks that are all known rules", () => {
  expect(validatePassedChecks(["SCHEMA-PARSE", "TECH-META-MISSING"])).toEqual([
    "SCHEMA-PARSE",
    "TECH-META-MISSING",
  ])
})

test("rejects missing robots meta as a defect", () => {
  expect(() =>
    validateFindings([{ ...finding, issue: "Robots meta is missing" }]),
  ).toThrow("default robots behavior")
})

test("rejects arbitrary word-count findings", () => {
  expect(() =>
    validateFindings([
      {
        ...finding,
        rule: "CONTENT-DEPTH",
        category: "content",
        issue: "Thin content",
        evidence: "Page contains 900 words",
        priority: "medium",
      },
    ]),
  ).toThrow("content length")
})

test("rejects optional LocalBusiness fields as required", () => {
  expect(() =>
    validateFindings([
      {
        ...finding,
        rule: "SCHEMA-REQUIRED",
        category: "schema",
        issue: "LocalBusiness telephone is missing",
        evidence: "No telephone property",
      },
    ]),
  ).toThrow("recommended LocalBusiness")
})

test("two findings identical except for page both survive dedup", () => {
  const finding1 = {
    ...finding,
    page: "https://example.com/page1",
  }
  const finding2 = {
    ...finding,
    page: "https://example.com/page2",
  }
  expect(validateFindings([finding1, finding2])).toHaveLength(2)
})

test("TECH-ROBOTS-BLOCK finding about robots.txt Sitemap directive is accepted", () => {
  const result = validateFindings([
    {
      ...finding,
      rule: "TECH-ROBOTS-BLOCK",
      category: "technical",
      issue: "robots.txt is missing a Sitemap directive",
      evidence: "No Sitemap: line found",
      priority: "high",
    },
  ])
  expect(result).toHaveLength(1)
})

test("non-TECH-ROBOTS-BLOCK finding saying Robots meta is missing is rejected", () => {
  expect(() =>
    validateFindings([
      {
        ...finding,
        issue: "Robots meta is missing",
      },
    ]),
  ).toThrow("default robots behavior")
})

test("invalid target URL yields clear error message", () => {
  expect(() => validateFindings([finding], "not-a-url")).toThrow(
    "Validator target must be a valid absolute URL",
  )
})

test("derives category from the rule instead of requiring it", () => {
  const [finding] = validateFindings([
    {
      rule: "SCHEMA-SEARCH-ACTION",
      issue: "SearchAction targets a route that does not exist",
      evidence: "page-evidence.json: SearchAction target /search; no search UI in DOM",
      impact: "Markup advertises functionality the site does not provide",
      fix: "Remove the SearchAction or implement the search route",
      priority: "medium",
      confidence: "high",
    },
  ])
  expect(finding.category).toBe("schema")
})

test("still rejects a category that contradicts the rule", () => {
  expect(() =>
    validateFindings([
      {
        rule: "SCHEMA-SEARCH-ACTION",
        category: "technical",
        issue: "SearchAction targets a route that does not exist",
        evidence: "page-evidence.json: SearchAction target /search",
        impact: "Markup advertises functionality the site does not provide",
        fix: "Remove the SearchAction",
        priority: "medium",
        confidence: "high",
      },
    ]),
  ).toThrow("category conflicts with rule")
})

test('"low-traffic page" is a scope note, not a traffic claim', () => {
  // The exact payload that failed a real audit five times. The rule docs themselves ask
  // the author to explain an absent CrUX record this way.
  const result = validateFindings([
    {
      rule: "TECH-PERFORMANCE-MEASURED",
      issue: "LCP 3.4s in lab. No CrUX field data (low-traffic page, normal).",
      evidence: "page-performance.json: lab LCP 3376ms, performance score 0.92, mobile strategy. Field data is null.",
      fix: "Optimise the LCP element — serve a smaller mobile variant of the hero image.",
      priority: "high",
      confidence: "high",
    },
  ])
  expect(result).toHaveLength(1)
})

test("still rejects a real traffic claim", () => {
  expect(() =>
    validateFindings([{ ...finding, fix: "Fix this to recover lost organic traffic" }]),
  ).toThrow("unsupported ranking or traffic claim")
})

test("validation errors name the rule, not just a zero-based index", () => {
  // A real audit read "Finding 1" as the first finding and rewrote the wrong one five times.
  expect(() =>
    validateFindings([
      finding,
      { ...finding, rule: "TECH-HEADING-CLARITY", priority: "critical" },
    ]),
  ).toThrow("Finding 1 (TECH-HEADING-CLARITY) exceeds rule priority")
})
